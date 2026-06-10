/**
 * StatiCrypt v3 on-disk format, implemented with Web Crypto only.
 * Compatible with the pages produced by the staticrypt CLI: the password
 * template decrypts output of staticryptEncrypt() and vice versa.
 */

// the one dynamic part of the StatiCrypt page template: the encrypted payload
const TEMPLATE_PAYLOAD_RE = /"staticryptEncryptedMsgUniqueVariableName":"[a-f0-9]+"/;

export function hexParse(s) {
  return Uint8Array.from(s.match(/../g).map((b) => parseInt(b, 16)));
}

export function hexStringify(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Encrypt content using the derived key (StatiCrypt's "hashed password"):
 *   payload = hex(HMAC-SHA256(key, encryptedHex)) + encryptedHex
 *   encryptedHex = hex(iv) + hex(AES-CBC(key, utf8(content)))
 */
export async function staticryptEncrypt(content, hashedPasswordHex) {
  const keyBytes = hexParse(hashedPasswordHex);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const aesKey = await crypto.subtle.importKey("raw", keyBytes, "AES-CBC", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-CBC", iv }, aesKey, new TextEncoder().encode(content))
  );
  const encryptedHex = hexStringify(iv) + hexStringify(ciphertext);

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const hmac = new Uint8Array(
    await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(encryptedHex))
  );
  return hexStringify(hmac) + encryptedHex;
}

/** Decrypt a payload produced by staticryptEncrypt (or the staticrypt CLI). */
export async function staticryptDecrypt(payload, hashedPasswordHex) {
  const keyBytes = hexParse(hashedPasswordHex);
  const expectedHmac = payload.substring(0, 64);
  const encryptedHex = payload.substring(64);

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const hmac = hexStringify(
    new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(encryptedHex)))
  );
  if (hmac !== expectedHmac) throw new Error("HMAC mismatch");

  const iv = hexParse(encryptedHex.substring(0, 32));
  const ciphertext = hexParse(encryptedHex.substring(32));
  const aesKey = await crypto.subtle.importKey("raw", keyBytes, "AES-CBC", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, aesKey, ciphertext);
  return new TextDecoder().decode(plaintext);
}

/** Swap the encrypted payload into the StatiCrypt page template. */
export function buildProtectedPage(payload, pageTemplate) {
  if (!TEMPLATE_PAYLOAD_RE.test(pageTemplate)) {
    throw new Error("template is missing the payload variable");
  }
  return pageTemplate.replace(
    TEMPLATE_PAYLOAD_RE,
    `"staticryptEncryptedMsgUniqueVariableName":"${payload}"`
  );
}
