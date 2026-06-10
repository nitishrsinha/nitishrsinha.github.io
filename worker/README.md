# research-gate — TOTP unlock for the protected research materials

A dependency-free Cloudflare Worker that replaces the memorized StatiCrypt
password with a 6-digit authenticator code.

## How it works

- The pages in `../private/` stay StatiCrypt-encrypted (AES-256) in the public
  repo, but under a strong **random** password nobody memorizes.
- This worker stores two secrets: the TOTP secret (shared with your
  authenticator app) and the **derived** StatiCrypt key (600k-round PBKDF2
  output — the worker never sees the cleartext password).
- `private/index.html` is the gate: you enter the 6-digit code, the worker
  verifies it (RFC 6238, ±30s window, KV-backed rate limiting, one use per
  code), and returns the derived key. The gate writes it to
  `localStorage.staticrypt_passphrase` — StatiCrypt's own remember-me slot —
  so every encrypted page on the site auto-decrypts until you press "Lock".

## One-time setup

Prereqs: `npm install -g wrangler && wrangler login`.

```bash
cd worker

# 1. Generate the TOTP secret and add it to your authenticator app
./setup.sh

# 2. Store the TOTP secret in the worker (command printed by setup.sh)
echo -n '<SECRET>' | wrangler secret put TOTP_SECRET

# 3. Create the rate-limit KV namespace; paste the printed id into wrangler.toml
wrangler kv namespace create RATE_LIMIT

# 4. Re-encrypt the private materials with a fresh random password.
#    Plaintext originals must be in private/ first (see migration note below).
cd ../private && STATICRYPT_PASSWORD=auto ./encrypt.sh
#    -> prints the derived key and the `wrangler secret put STATICRYPT_KEY` command; run it.

# 5. Deploy and wire up the gate page
cd ../worker && wrangler deploy
#    -> note the URL (https://research-gate.<subdomain>.workers.dev)
#    -> set WORKER_URL at the top of the <script> in private/index.html

# 6. Commit and push (encrypted html, .staticrypt.json, index.html, worker/)
```

Check configuration anytime: `curl https://research-gate.<subdomain>.workers.dev`
returns which secrets/bindings are present.

## Migration note (existing files)

The committed files in `private/` are already encrypted with the old password,
and the plaintext originals are not in this repo. Two paths:

- **Re-encrypt (preferred):** restore the plaintext originals into `private/`
  (from wherever they live, or decrypt once with the old password), then run
  step 4. `encrypt.sh` refuses to double-wrap files that are already encrypted.
- **Quick path (keeps old, weaker password underneath):** if you remember the
  old password, derive its key directly and skip re-encryption:
  `node derive-key.mjs '<old password>' ebe1a16146777d85539ba7aec6d97a50`
  then store that as `STATICRYPT_KEY`. TOTP convenience immediately, but the
  underlying encryption stays only as strong as the old password.

Either way: anything committed under the old weak password remains in public
git history and should be treated as exposed.

## Day-to-day

- Visit the page → enter authenticator code → everything decrypts. "Lock"
  clears the key from the browser.
- Adding new material: drop the plaintext `.html`/`.md` into `private/`, run
  `STATICRYPT_PASSWORD=auto ./encrypt.sh`... **but** that generates a *new*
  password, so restore + re-encrypt all files together, then update
  `STATICRYPT_KEY`. (One password must cover all files since one key unlocks
  everything.)
- Rate limits: 5 bad codes per IP / 10 global per 15 minutes; each code works
  only once.
