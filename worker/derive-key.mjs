#!/usr/bin/env node
/**
 * Derive the StatiCrypt "hashed password" (the value stored in localStorage and
 * passed in #staticrypt_pwd= links) from a cleartext password and the project salt.
 *
 * This replicates the KDF in StatiCrypt v3's password template exactly:
 *   PBKDF2(password, salt, 1000, SHA-1) -> hex
 *   PBKDF2(hex,      salt, 14000, SHA-256) -> hex
 *   PBKDF2(hex,      salt, 585000, SHA-256) -> hex
 * where the salt hex string is used as raw UTF-8 bytes.
 *
 * Usage:
 *   node derive-key.mjs <password> [salt]
 * If salt is omitted, it is read from ../private/.staticrypt.json
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const subtle = crypto.subtle;
const utf8 = (s) => new TextEncoder().encode(s);
const hex = (buf) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

async function pbkdf2(password, salt, iterations, hash) {
  const key = await subtle.importKey("raw", utf8(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash, iterations, salt: utf8(salt) },
    key,
    256
  );
  return hex(bits);
}

async function hashPassword(password, salt) {
  let h = await pbkdf2(password, salt, 1000, "SHA-1");
  h = await pbkdf2(h, salt, 14000, "SHA-256");
  return pbkdf2(h, salt, 585000, "SHA-256");
}

const [, , password, saltArg] = process.argv;
if (!password) {
  console.error("Usage: node derive-key.mjs <password> [salt]");
  process.exit(1);
}

let salt = saltArg;
if (!salt) {
  const configPath = join(dirname(fileURLToPath(import.meta.url)), "..", "private", ".staticrypt.json");
  try {
    salt = JSON.parse(readFileSync(configPath, "utf8")).salt;
  } catch {
    console.error(`No salt given and could not read it from ${configPath}`);
    process.exit(1);
  }
}

console.log(await hashPassword(password, salt));
