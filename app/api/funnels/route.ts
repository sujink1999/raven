import { sql } from "@/lib/db";

const authed = (req: Request) =>
  req.headers.get("authorization") === `Bearer ${process.env.ADMIN_TOKEN}`;

const DEFAULT_COPY = (name: string) => ({
  opening: `hey, saw your comment on the ${name} reel. want me to send you the thing?`,
  opening_button: "yep, send it",
  gate: "one thing — i only send it to followers. follow me, then tap below",
  gate_button: "i'm following",
  delivery: "there you go:",
});

export async function GET(req: Request) {
  if (!authed(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const rows = await sql`
    select f.*,
      (select count(*) from conversations c where c.funnel_id = f.id) as started,
      (select count(*) from conversations c where c.funnel_id = f.id and c.state = 'delivered') as delivered
    from funnels f order by f.id desc`;
  return Response.json(rows);
}

export async function POST(req: Request) {
  if (!authed(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.name || !b.keyword || !b.link)
    return Response.json({ error: "name, keyword, link required" }, { status: 400 });
  const copy = { ...DEFAULT_COPY(b.name), ...(b.copy ?? {}) };
  const rows = await sql`
    insert into funnels (name, ig_media_id, keyword, link, copy, public_replies)
    values (${b.name}, ${b.ig_media_id ?? null}, ${b.keyword}, ${b.link},
            ${JSON.stringify(copy)}, ${b.public_replies ? JSON.stringify(b.public_replies) : null})
    returning *`;
  return Response.json(rows[0], { status: 201 });
}
