import Image from "next/image";
import Link from "next/link";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const automations = await sql`
    select f.id, f.name, f.keyword, f.active,
      (select count(*) from events e where e.funnel_id = f.id and e.type = 'comment') as comments,
      (select count(*) from conversations c where c.funnel_id = f.id) as started,
      (select count(*) from conversations c where c.funnel_id = f.id and c.state = 'delivered') as delivered
    from funnels f order by f.id desc`;

  return (
    <main style={{ padding: "24px 32px", fontFamily: "ui-monospace, monospace", color: "#ddd", minHeight: "100vh" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <Image src="/raven.png" alt="raven" width={44} height={44} style={{ borderRadius: 10 }} />
        <div style={{ fontSize: 18, fontWeight: 700 }}>raven</div>
      </header>

      {automations.map((a) => {
        const pct = Number(a.started) ? Math.round((Number(a.delivered) / Number(a.started)) * 100) : 0;
        return (
          <Link key={a.id} href={`/a/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", margin: "8px 0", background: "#181818", borderRadius: 10, border: "1px solid #242424" }}>
              <span style={{ color: a.active ? "#69f0ae" : "#555", fontSize: 12 }}>{a.active ? "●" : "○"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "#777" }}>keyword “{a.keyword}”</div>
              </div>
              <div style={{ display: "flex", gap: 24, fontSize: 13, textAlign: "right" }}>
                <div><div style={{ color: "#8ab4f8" }}>{String(a.comments)}</div><div style={{ fontSize: 11, color: "#666" }}>comments</div></div>
                <div><div style={{ color: "#ffcc80" }}>{String(a.started)}</div><div style={{ fontSize: 11, color: "#666" }}>dms</div></div>
                <div><div style={{ color: "#69f0ae" }}>{String(a.delivered)}</div><div style={{ fontSize: 11, color: "#666" }}>delivered</div></div>
                <div><div>{pct}%</div><div style={{ fontSize: 11, color: "#666" }}>conv</div></div>
              </div>
            </div>
          </Link>
        );
      })}
      {automations.length === 0 && <div style={{ color: "#666" }}>no automations yet</div>}
    </main>
  );
}
