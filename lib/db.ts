import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | undefined;
export const sql = (
  strings: TemplateStringsArray,
  ...params: unknown[]
): Promise<Record<string, any>[]> =>
  (_sql ??= neon(process.env.DATABASE_URL!))(strings, ...params) as Promise<Record<string, any>[]>;

export type FunnelCopy = {
  opening: string;
  opening_button: string;
  gate: string;
  gate_button: string;
  delivery: string;
};

export type Funnel = {
  id: number;
  name: string;
  ig_media_id: string | null;
  keyword: string;
  link: string;
  copy: FunnelCopy;
  public_replies: string[] | null;
  active: boolean;
};

export async function logEvent(
  type: string,
  detail: unknown,
  funnelId?: number,
  igUserId?: string
) {
  await sql`insert into events (funnel_id, ig_user_id, type, detail)
            values (${funnelId ?? null}, ${igUserId ?? null}, ${type}, ${JSON.stringify(detail)})`;
}
