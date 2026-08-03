# raven

Self-hosted ManyChat replacement: IG comment keyword → DM funnel → follow gate → link delivery.
Next.js on Vercel + Neon Postgres. Own account only, official Instagram API.

## Flow

1. Someone comments the funnel keyword on an armed reel → private-reply DM (opening + button),
   optional randomized public comment reply.
2. Button tap → follower check. Follows already → link delivered. Otherwise follow-gate message.
3. "i'm following" tap → soft re-check (one nudge max) → link delivered.

One run per user per funnel. Everything logged to `events` for per-reel stats.

## API

All admin calls: `Authorization: Bearer $ADMIN_TOKEN`.

- `POST /api/funnels` — `{ name, keyword, link, ig_media_id?, copy?, public_replies? }`.
  `copy` overrides the default 3-step template per field. `ig_media_id` null = any reel.
- `GET /api/funnels` — list + started/delivered counts.
- `PATCH /api/funnels/:id` — update fields / `{ "active": false }` to disarm.
- `GET|POST /api/webhook` — Meta's endpoint (verify handshake + signed events).

## Setup (once)

1. Neon DB → run `schema.sql` → `DATABASE_URL`.
2. Meta app (Instagram Login) with `instagram_business_manage_messages` +
   `instagram_business_manage_comments`; long-lived token → `IG_ACCESS_TOKEN`, `IG_USER_ID`.
3. Webhook: callback `https://<deploy>/api/webhook`, verify token = `WEBHOOK_VERIFY_TOKEN`,
   subscribe to `comments` + `messages`. App secret → `META_APP_SECRET`.
4. Set `ADMIN_TOKEN`, deploy on Vercel.
