# research-gate — TOTP unlock + publishing for the protected research materials

A dependency-free Cloudflare Worker. One authenticator app replaces both the
reading password and the publishing machine: documents are encrypted **and**
published from any browser with a 6-digit code.

## How it works

- Protected pages are StatiCrypt-format (AES-256-CBC + HMAC) HTML in
  `private/` in the public repo. They self-decrypt in the browser given the
  key — no server involved in reading beyond the one-time key release.
- `POST /` with a valid TOTP code returns the key. The gate page
  (`private/index.html`) stores it in `localStorage.staticrypt_passphrase`
  (StatiCrypt's own remember-me slot), so all encrypted pages auto-decrypt
  until "Lock" is pressed.
- `POST /upload` with a valid TOTP code + plaintext HTML encrypts it in the
  worker (Web Crypto, byte-compatible with the staticrypt CLI format) and
  commits it to `private/<filename>` via the GitHub Contents API. GitHub Pages
  publishes it within a minute or two. The gate page lists documents live from
  the GitHub API, so there is nothing to edit by hand.
- Brute-force protection: 5 bad codes per IP / 10 global per 15 minutes
  (KV-backed, fails closed), each code valid once.

## Secrets (set with `wrangler secret put <NAME>` in this directory)

| Secret           | What                                              | How to make it |
|------------------|---------------------------------------------------|----------------|
| `TOTP_SECRET`    | base32 secret shared with your authenticator app  | `./setup.sh`   |
| `STATICRYPT_KEY` | 256-bit encryption key, hex                       | `openssl rand -hex 32` |
| `GITHUB_TOKEN`   | fine-grained PAT, this repo only, Contents: R/W   | see below      |

`STATICRYPT_KEY` does not need to come from a password — random bytes are
fine, since the worker both encrypts and releases the same key. (Only if you
also want to encrypt offline with the staticrypt CLI does it need to be a
derived key; then use `derive-key.mjs` and `private/encrypt.sh`.)

GitHub token: github.com → Settings → Developer settings → Personal access
tokens → Fine-grained tokens → Generate. Resource owner: you; Repository
access: only `nitishrsinha/nitishrsinha.github.io`; Permissions → Repository →
Contents: **Read and write**. Pick an expiration you can live with renewing.

## One-time setup

```bash
cd worker
./setup.sh                                    # TOTP secret -> authenticator app
echo -n '<SECRET>' | wrangler secret put TOTP_SECRET
openssl rand -hex 32 | tr -d '\n' | wrangler secret put STATICRYPT_KEY
echo -n '<PAT>'    | wrangler secret put GITHUB_TOKEN
wrangler kv namespace create RATE_LIMIT       # paste id into wrangler.toml
wrangler deploy                               # URL -> WORKER_URL in private/index.html
```

Check configuration anytime: a GET to the worker URL reports which
secrets/bindings are present.

## Day-to-day (from any browser, any machine)

- **Read:** open the private page, enter a code, everything decrypts. "Lock"
  clears the key from that browser.
- **Publish:** unlock, then in "Publish a document" pick an HTML file, enter a
  fresh code (each code works once), submit. The worker encrypts, commits, and
  the document appears in the list; the page itself is live when GitHub Pages
  rebuilds (a minute or two).
- **Remove:** click "delete" next to the document in the gate page and confirm
  with a fresh code. (Deleting from `private/` in the repo works too.)

## Recovery

Nothing depends on a remembered password or a specific machine. Worst case
(all secrets lost): generate new TOTP secret + key, re-publish documents from
their plaintext sources, rotate the PAT. Keep plaintext sources wherever you
normally keep your working papers.

## History note

The materials encrypted before June 2026 were abandoned (password lost,
plaintext originals unavailable) and removed from the working tree. Their
ciphertext remains in public git history; treat that content as exposed to
whatever extent the old password was guessable.
