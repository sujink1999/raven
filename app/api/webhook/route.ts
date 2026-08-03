import { createHmac, timingSafeEqual } from "crypto";
import { handleComment, handlePayload } from "@/lib/funnel";
import { logEvent } from "@/lib/db";

// Meta webhook verification handshake.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WEBHOOK_VERIFY_TOKEN)
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  return new Response("forbidden", { status: 403 });
}

function validSignature(body: string, header: string | null): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", process.env.META_APP_SECRET!).update(body).digest("hex");
  const got = header.slice(7);
  return got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function POST(req: Request) {
  const body = await req.text();
  if (!validSignature(body, req.headers.get("x-hub-signature-256")))
    return new Response("bad signature", { status: 401 });

  const payload = JSON.parse(body);
  try {
    for (const entry of payload.entry ?? []) {
      // Comment events
      for (const change of entry.changes ?? []) {
        if (change.field !== "comments") continue;
        const v = change.value;
        if (v.from?.id === process.env.IG_USER_ID) continue; // our own replies
        await handleComment({
          commentId: v.id,
          mediaId: v.media?.id,
          igUserId: v.from?.id,
          username: v.from?.username,
          text: v.text ?? "",
        });
      }
      // Messaging events (quick-reply taps arrive as messages with a payload)
      for (const m of entry.messaging ?? []) {
        const payload_ = m.message?.quick_reply?.payload ?? m.postback?.payload;
        if (payload_ && m.sender?.id && m.sender.id !== process.env.IG_USER_ID)
          await handlePayload(m.sender.id, payload_);
      }
    }
  } catch (e) {
    await logEvent("error", { message: String(e) }).catch(() => {});
  }
  return new Response("ok", { status: 200 }); // always 200 so Meta doesn't retry-storm
}
