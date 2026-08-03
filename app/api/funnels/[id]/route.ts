import { sql } from "@/lib/db";

const authed = (req: Request) =>
  req.headers.get("authorization") === `Bearer ${process.env.ADMIN_TOKEN}`;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authed(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const b = await req.json();
  const rows = await sql`
    update funnels set
      active = coalesce(${b.active ?? null}, active),
      keyword = coalesce(${b.keyword ?? null}, keyword),
      link = coalesce(${b.link ?? null}, link),
      ig_media_id = coalesce(${b.ig_media_id ?? null}, ig_media_id),
      copy = coalesce(${b.copy ? JSON.stringify(b.copy) : null}, copy),
      public_replies = coalesce(${b.public_replies ? JSON.stringify(b.public_replies) : null}, public_replies)
    where id = ${Number(id)}
    returning *`;
  if (!rows.length) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(rows[0]);
}
