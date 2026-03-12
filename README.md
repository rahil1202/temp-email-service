# Temporary Email Service

Temporary email inboxes built with Next.js 14, Appwrite Pro, Mailgun inbound routes, and Cloudflare-managed domains.

## What is included

- Next.js 14 App Router frontend with TailwindCSS, Zustand state, dark UI, QR restore flow, and 5-second inbox polling.
- Appwrite Function source for `create-inbox`, `receive-email`, `get-inbox`, `get-email`, `delete-inbox`, and `cleanup-expired`.
- Appwrite Storage download proxy route for attachments through [`app/api/attachments/[fileId]/route.ts`](./app/api/attachments/%5BfileId%5D/route.ts).
- Tests covering name generation, Mailgun validation/sanitization helpers, core handler flows, and the HTML viewer.

## Local development

1. Copy `.env.example` to `.env.local` and fill the Vercel and Appwrite values.
2. Install dependencies with `bun install`.
3. Start the frontend with `bun run dev`.
4. Run tests with `bun run test`.
5. Build Appwrite function bundles with `bun run build:functions`.

## Appwrite setup

### Database

Create database `temp_mail`.

Create collection `emails` with attributes:

- `email_address`: string, required
- `sender`: string, required
- `subject`: string, required
- `body_text`: string, required
- `body_html`: string, required
- `attachments`: string, required
- `received_at`: datetime, required

Indexes:

- `email_address`
- `received_at`
- Composite index on `email_address` + `received_at desc`

Create collection `inboxes` with attributes:

- `email_address`: string, required
- `access_token_hash`: string, required
- `domain`: string, required
- `display_name`: string, required
- `created_at`: datetime, required
- `expires_at`: datetime, required
- `last_seen_at`: datetime, required

Indexes:

- Unique `email_address`
- `expires_at`

Disable client-facing document permissions for both collections; only Appwrite Functions and the attachment proxy route need server access.

### Storage

Create bucket `email-attachments`.

- Access: server-side only
- File size: at least 25 MB
- Compression/antivirus: keep default Appwrite settings

### Functions

Deploy each Appwrite function from the same repo root.

- Install command: `bun install`
- Build command: `bun run build:functions`
- Runtime: Node.js 20+

Entrypoints:

- `dist/appwrite/functions/create-inbox/main.js`
- `dist/appwrite/functions/get-inbox/main.js`
- `dist/appwrite/functions/get-email/main.js`
- `dist/appwrite/functions/delete-inbox/main.js`
- `dist/appwrite/functions/receive-email/main.js`
- `dist/appwrite/functions/cleanup-expired/main.js`

Function env vars:

- `APPWRITE_API_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_EMAILS_COLLECTION_ID`
- `APPWRITE_INBOXES_COLLECTION_ID`
- `APPWRITE_ATTACHMENTS_BUCKET_ID`
- `MAILGUN_SIGNING_KEY`
- `MAIL_DOMAINS`
- `MAIL_INBOX_TTL_HOURS`
- `MAIL_MAX_SIZE_BYTES`
- `NEXT_PUBLIC_RESTORE_BASE_URL`
- `ACCESS_TOKEN_PEPPER`

Permissions and schedule:

- `create-inbox`, `get-inbox`, `get-email`, `delete-inbox`, `receive-email`: execute permission `Any`
- `cleanup-expired`: execute permission restricted to server/admin, scheduled hourly with cron `0 * * * *`

## Mailgun setup

### Domain onboarding

For each domain, add the exact DNS values shown in Mailgun to Cloudflare, including TXT verification records.

Required MX records:

- `MX 10 mxa.mailgun.org`
- `MX 10 mxb.mailgun.org`

Domains:
- `gmail.rahil.pro`

### Inbound routes

Create one route per domain:

```text

match_recipient(".*@rahil\\.pro")
forward("https://receive-email.example.appwrite.run")


```

Mailgun includes `timestamp`, `token`, and `signature`; the `receive-email` function verifies those before storing mail.

## Vercel setup

Add the public function URLs and Appwrite server env vars from `.env.example`.

The attachment proxy route uses the server-side Appwrite API key, so `APPWRITE_API_KEY` must also be available in Vercel.

## Notes

- Generated inboxes are private by token, not public by email address.
- Only active generated inboxes store mail; unknown recipients are accepted by Mailgun but ignored by the backend.
- The restore link encodes the token in the URL hash so it does not travel in HTTP requests when opening the inbox page itself.
