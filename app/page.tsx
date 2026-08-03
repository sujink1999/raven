import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const STYLES: Record<string, string> = {
  comment: "#8ab4f8",
  dm_sent: "#a5d6a7",
  public_reply: "#ce93d8",
  button: "#ffcc80",
  gate: "#fff59d",
  delivered: "#69f0ae",
  error: "#ef9a9a",
};

export default async function Home() {
  const events = await sql`
    select e.*, f.name as funnel_name,
      (select c.username from conversations c
        where c.funnel_id = e.funnel_id and c.ig_user_id = e.ig_user_id limit 1) as username
    from events e left join funnels f on f.id = e.funnel_id
    order by e.id desc limit 200`;
  const funnels = await sql`
    select f.id, f.name, f.keyword, f.active,
      (select count(*) from conversations c where c.funnel_id = f.id) as started,
      (select count(*) from conversations c where c.funnel_id = f.id and c.state = 'delivered') as delivered
    from funnels f order by f.id desc`;

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 16, fontFamily: "ui-monospace, monospace", color: "#ddd", background: "#111" }}>
      <h1 style={{ fontSize: 20 }}>raven</h1>

      <h2 style={{ fontSize: 14, marginTop: 24, color: "#888" }}>funnels</h2>
      {funnels.map((f) => (
        <div key={f.id} style={{ padding: "6px 0", borderBottom: "1px solid #222", fontSize: 13 }}>
          <span style={{ color: f.active ? "#69f0ae" : "#666" }}>{f.active ? "●" : "○"}</span>{" "}
          #{f.id} <b>{f.name}</b> · keyword “{f.keyword}” · {f.started} started · {f.delivered} delivered
        </div>
      ))}

      <h2 style={{ fontSize: 14, marginTop: 24, color: "#888" }}>events (latest 200)</h2>
      {events.map((e) => (
        <div key={e.id} style={{ padding: "4px 0", borderBottom: "1px solid #1a1a1a", fontSize: 12.5 }}>
          <span style={{ color: "#666" }}>{new Date(e.created_at).toISOString().replace("T", " ").slice(0, 19)}</span>{" "}
          <span style={{ color: STYLES[e.type] ?? "#ddd" }}>{e.type}</span>
          {e.funnel_name && <span style={{ color: "#888" }}> · {e.funnel_name}</span>}
          {e.username && <span style={{ color: "#8ab4f8" }}> · @{e.username}</span>}
          {e.type === "comment" && e.detail?.text && <span style={{ color: "#aaa" }}> · “{e.detail.text}”</span>}
          {e.type === "error" && <span style={{ color: "#ef9a9a" }}> · {String(e.detail?.message ?? "").slice(0, 140)}</span>}
        </div>
      ))}
    </main>
  );
}
