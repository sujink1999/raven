import { refreshToken } from "@/lib/token";

// Weekly Vercel cron. Vercel sends Authorization: Bearer <CRON_SECRET>.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("unauthorized", { status: 401 });
  const result = await refreshToken();
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
