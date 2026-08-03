import Image from "next/image";
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
    <main style={{ padding: "24px 32px", fontFamily: "ui-monospace, monospace", color: "#ddd", minHeight: "100vh" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <Image src="/raven.png" alt="raven" width={44} height={44} style={{ borderRadius: 10 }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>raven</div>
          <div style={{ fontSize: 12, color: "#777" }}>ig comment → dm funnels</div>
        </div>
      </header>

      <h2 style={{ fontSize: 13, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>funnels</h2>
      {funnels.map((f) => (
        <div key={f.id} style={{ padding: "8px 0", borderBottom: "1px solid #222", fontSize: 13.5 }}>
          <span style={{ color: f.active ? "#69f0ae" : "#666" }}>{f.active ? "●" : "○"}</span>{" "}
          #{f.id} <b>{f.name}</b> · keyword “{f.keyword}” · {f.started} started · {f.delivered} delivered
        </div>
      ))}

      <h2 style={{ fontSize: 13, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 32 }}>
        events <span style={{ color: "#555", textTransform: "none", letterSpacing: 0 }}>(latest 200)</span>
      </h2>
      {events.map((e) => (
        <div key={e.id} style={{ padding: "5px 0", borderBottom: "1px solid #1a1a1a", fontSize: 13 }}>
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
