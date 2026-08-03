import { sql, logEvent } from "./db";

// The IG token rotates on refresh, so it lives in the settings table.
// IG_ACCESS_TOKEN env var only seeds the row on first use.
let cached: { value: string; at: number } | undefined;

export async function getToken(): Promise<string> {
  if (cached && Date.now() - cached.at < 60_000) return cached.value;
  const rows = await sql`select value from settings where key = 'ig_access_token'`;
  let value = rows[0]?.value as string | undefined;
  if (!value) {
    value = process.env.IG_ACCESS_TOKEN!;
    await sql`insert into settings (key, value) values ('ig_access_token', ${value})
              on conflict (key) do nothing`;
  }
  cached = { value, at: Date.now() };
  return value;
}

export async function refreshToken(): Promise<{ ok: boolean; detail: unknown }> {
  const token = await getToken();
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
  );
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    await logEvent("error", { message: "token refresh failed", response: json });
    return { ok: false, detail: json };
  }
  await sql`insert into settings (key, value) values ('ig_access_token', ${json.access_token})
            on conflict (key) do update set value = excluded.value, updated_at = now()`;
  cached = undefined;
  await logEvent("token_refreshed", { expires_in_days: Math.round(json.expires_in / 86400) });
  return { ok: true, detail: { expires_in_days: Math.round(json.expires_in / 86400) } };
}
