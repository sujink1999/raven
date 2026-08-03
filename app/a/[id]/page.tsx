import Image from "next/image";
import Link from "next/link";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const COLORS: Record<string, string> = {
  comment: "#8ab4f8",
  dm_sent: "#a5d6a7",
  public_reply: "#ce93d8",
  button: "#ffcc80",
  gate: "#fff59d",
  delivered: "#69f0ae",
  error: "#ef9a9a",
};

export default async function Automation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await sql`select * from funnels where id = ${Number(id)}`;
  const a = rows[0];
  if (!a) return <main style={{ padding: 32, color: "#ddd", fontFamily: "monospace" }}>not found</main>;

  const events = await sql`
    select e.*,
      (select c.username from conversations c
        where c.funnel_id = e.funnel_id and c.ig_user_id = e.ig_user_id limit 1) as username
    from events e where e.funnel_id = ${Number(id)} order by e.id desc limit 500`;

  return (
    <main style={{ padding: "24px 32px", fontFamily: "ui-monospace, monospace", color: "#ddd", minHeight: "100vh" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <Link href="/"><Image src="/raven.png" alt="raven" width={36} height={36} style={{ borderRadius: 8 }} /></Link>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {a.name} <span style={{ color: a.active ? "#69f0ae" : "#555", fontSize: 12 }}>{a.active ? "● active" : "○ off"}</span>
        </div>
      </header>
      <div style={{ fontSize: 12.5, color: "#777", marginBottom: 24 }}>
        keyword “{a.keyword}” · {a.ig_media_id ? `media ${a.ig_media_id}` : "all posts"} · {a.link}
      </div>

      {events.map((e) => (
        <div key={e.id} style={{ padding: "5px 0", borderBottom: "1px solid #1a1a1a", fontSize: 13 }}>
          <span style={{ color: "#666" }}>{new Date(e.created_at).toISOString().replace("T", " ").slice(0, 19)}</span>{" "}
          <span style={{ color: COLORS[e.type] ?? "#ddd" }}>{e.type}</span>
          {e.username && <span style={{ color: "#8ab4f8" }}> · @{e.username}</span>}
          {e.type === "comment" && e.detail?.text && <span style={{ color: "#aaa" }}> · “{e.detail.text}”</span>}
          {e.type === "error" && <span style={{ color: "#ef9a9a" }}> · {String(e.detail?.message ?? "").slice(0, 140)}</span>}
        </div>
      ))}
      {events.length === 0 && <div style={{ color: "#666" }}>no events yet</div>}
    </main>
  );
}
