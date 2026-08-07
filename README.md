# Personal Encrypted Email Website

A lightweight personal website built with Cloudflare Workers that allows anyone to send you PGP-encrypted emails without revealing your email address or requiring the sender to configure PGP locally.

## Features

- **Client-side PGP Auto-Lookup:** Queries `keys.openpgp.org` automatically when a user enters their email address.
- **Server-side PGP Encryption:** Encrypts incoming messages with your public key in the Cloudflare Worker edge runtime.
- **MIME PGP Key Attachment:** Automatically attaches the sender's PGP key as `sender-key.asc` (`application/pgp-keys`) so your email client (e.g. Proton Mail) can import it easily.
- **Zero-Cost Edge Hosting:** Deployed on Cloudflare Workers' free tier.

---

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run local development server:

   ```bash
   npm run dev
   ```

3. Open `http://localhost:8787` in your browser.

---

## Deployment & Setup Guide

### 1. Set Up Cloudflare Secrets

Run the following commands using Wrangler CLI to set your backend secrets in Cloudflare:

```bash
# Set your destination email address
npx wrangler secret put RECIPIENT_EMAIL

# Set your ASCII-armored PGP Public Key
npx wrangler secret put RECIPIENT_PUBLIC_KEY

# Set your Resend API Key
npx wrangler secret put RESEND_API_KEY

# Set the "From" email address for outgoing emails
npx wrangler secret put FROM_EMAIL
```

### 2. Manual Deployment

To deploy directly from your local terminal:

```bash
npx wrangler deploy
```

### 3. Automated Deployment via GitHub Actions

1. Go to your GitHub Repository Settings -> **Secrets and variables** -> **Actions**.
2. Add a new Repository Secret:
   - **Name:** `CLOUDFLARE_API_TOKEN`
   - **Value:** Create a Cloudflare API token with `Edit Cloudflare Workers` permissions from your Cloudflare Dashboard.
3. Any push to the `master` branch will automatically build and deploy your site!
