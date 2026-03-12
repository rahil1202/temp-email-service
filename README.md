# Temp Email Service

Temporary email inboxes built with Next.js 14, Appwrite, Mailgun inbound routes, and Cloudflare-managed domains.

## Features

- Temporary inbox generation with realistic random email identities
- Read-only lookup for previously created inboxes from the last 24 hours
- Appwrite-backed inbox, email, and attachment storage
- Mailgun inbound processing for incoming mail
- QR-based inbox restore flow
- Per-IP daily inbox creation rate limiting
- Input validation, proxy hardening, and security headers

## Stack

- Next.js 14
- React 18
- Tailwind CSS
- Appwrite
- Mailgun
- Cloudflare DNS
- Zustand
- Vitest

## Project Structure

```text
app/                     Next.js app router pages and API routes
appwrite/functions/      Appwrite function source
components/              UI components
lib/                     Client and server helpers
shared/                  Shared types, constants, mailbox generation
store/                   Zustand state
scripts/                 Build scripts
```

## Quick Start

1. Copy `.env.example` to `.env.local` or `.env`.
2. Fill in your Appwrite, Mailgun, and domain values.
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

5. Build the Appwrite function bundles when deploying functions:

```bash
npm run build:functions
```

## Environment Variables

### Public runtime

- `NEXT_PUBLIC_APPWRITE_FUNCTION_CREATE_INBOX_URL`
- `NEXT_PUBLIC_APPWRITE_FUNCTION_GET_INBOX_URL`
- `NEXT_PUBLIC_APPWRITE_FUNCTION_GET_EMAIL_URL`
- `NEXT_PUBLIC_APPWRITE_FUNCTION_DELETE_INBOX_URL`
- `NEXT_PUBLIC_INBOX_POLL_MS`
- `NEXT_PUBLIC_RESTORE_BASE_URL`
- `NEXT_PUBLIC_MAIL_DOMAINS`

### Server runtime

- `APPWRITE_API_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_EMAILS_COLLECTION_ID`
- `APPWRITE_INBOXES_COLLECTION_ID`
- `APPWRITE_ATTACHMENTS_BUCKET_ID`
- `MAILGUN_API_KEY`
- `MAILGUN_SIGNING_KEY`
- `MAILGUN_BASE_URL`
- `MAIL_DOMAINS`
- `MAIL_INBOX_TTL_HOURS`
- `MAIL_MAX_SIZE_BYTES`
- `ACCESS_TOKEN_PEPPER`

## Appwrite Setup

### Database

Create database `temp_mail`.

Create collection `emails` with:

- `email_address`: string
- `sender`: string
- `subject`: string
- `body_text`: string
- `body_html`: string
- `attachments`: string
- `received_at`: datetime

Indexes:

- `email_address`
- `received_at`
- composite index on `email_address` + `received_at desc`

Create collection `inboxes` with:

- `email_address`: string
- `access_token_hash`: string
- `domain`: string
- `display_name`: string
- `created_at`: datetime
- `expires_at`: datetime
- `last_seen_at`: datetime

Indexes:

- unique `email_address`
- `expires_at`

Keep document permissions server-side only.

### Storage

Create bucket `email-attachments`.

- server-side access only
- file size at least 25 MB

### Functions

Deploy these entrypoints:

- `dist/appwrite/functions/create-inbox/main.js`
- `dist/appwrite/functions/get-inbox/main.js`
- `dist/appwrite/functions/get-email/main.js`
- `dist/appwrite/functions/delete-inbox/main.js`
- `dist/appwrite/functions/receive-email/main.js`
- `dist/appwrite/functions/cleanup-expired/main.js`

Recommended runtime:

- Node.js 20+

Execute permissions:

- `create-inbox`, `get-inbox`, `get-email`, `delete-inbox`, `receive-email`: `Any`
- `cleanup-expired`: restricted server/admin execution

## Mailgun Setup

For each receiving domain, configure the exact DNS records Mailgun provides.

For example, if your inbox domain is `gmail.rahil.pro`, you need Mailgun inbound MX records on `gmail.rahil.pro`, not only on `rahil.pro`.

Typical required inbound records:

- `MX 10 mxa.mailgun.org`
- `MX 10 mxb.mailgun.org`
- SPF TXT record from Mailgun
- DKIM records from Mailgun

Create an inbound route that matches the full receiving domain and forwards to your deployed `receive-email` function URL.

Example pattern:

```text
match_recipient(".*@gmail\\.rahil\\.pro")
forward("https://<your-receive-email-function-url>")
```

## Security Notes

- Inbox creation is rate-limited to 3 per IP per 24 hours
- Existing inbox lookup is limited to inboxes created within the last 24 hours
- Lookup mode is read-only and does not expose restore tokens
- API routes enforce request validation, body-size checks, and origin checks
- Security headers are applied through Next.js middleware

## Development

Run checks:

```bash
npm run build
npm run test
```

## Open Source

- [License](./LICENSE)
- [Contributing](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./SECURITY.md)

## Author

- GitHub: [@rahil1202](https://github.com/rahil1202)

