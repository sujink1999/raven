import { sql, logEvent, type Funnel } from "./db";
import { privateReply, sendMessage, replyToComment, isFollower } from "./ig";

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// Comment webhook: match an active funnel, start the conversation.
export async function handleComment(c: {
  commentId: string;
  mediaId: string;
  igUserId: string;
  username?: string;
  text: string;
}) {
  const rows = (await sql`
    select * from funnels
    where active
      and (ig_media_id = ${c.mediaId} or ig_media_id is null)
      and position(lower(keyword) in lower(${c.text})) > 0
    order by ig_media_id nulls last
    limit 1`) as Funnel[];
  const funnel = rows[0];
  if (!funnel) return;

  await logEvent("comment", c, funnel.id, c.igUserId);

  // One run per user per funnel — repeat comments don't re-trigger.
  const inserted = await sql`
    insert into conversations (funnel_id, ig_user_id, username, comment_id)
    values (${funnel.id}, ${c.igUserId}, ${c.username ?? null}, ${c.commentId})
    on conflict (funnel_id, ig_user_id) do nothing
    returning id`;
  if (inserted.length === 0) return;

  await privateReply(c.commentId, funnel.copy.opening, {
    title: funnel.copy.opening_button,
    payload: `SEND:${funnel.id}`,
  });
  await logEvent("dm_sent", { commentId: c.commentId }, funnel.id, c.igUserId);

  if (funnel.public_replies?.length) {
    await replyToComment(c.commentId, pick(funnel.public_replies));
    await logEvent("public_reply", { commentId: c.commentId }, funnel.id, c.igUserId);
  }
}

// Quick-reply tap (payload arrives as a message with quick_reply.payload).
export async function handlePayload(igUserId: string, payload: string) {
  const [action, idStr] = payload.split(":");
  const funnelId = Number(idStr);
  if (!funnelId || (action !== "SEND" && action !== "FOLLOWING")) return;

  const rows = (await sql`select * from funnels where id = ${funnelId}`) as Funnel[];
  const funnel = rows[0];
  if (!funnel) return;

  const convs = (await sql`
    select * from conversations where funnel_id = ${funnelId} and ig_user_id = ${igUserId}`) as {
    state: string;
    gate_nudged: boolean;
  }[];
  const conv = convs[0];
  if (!conv || conv.state === "delivered") return;

  await logEvent("button", { payload }, funnelId, igUserId);

  const deliver = async () => {
    await sendMessage(igUserId, `${funnel.copy.delivery} ${funnel.link}`);
    await sql`update conversations set state = 'delivered', updated_at = now()
              where funnel_id = ${funnelId} and ig_user_id = ${igUserId}`;
    await logEvent("delivered", {}, funnelId, igUserId);
  };

  if (action === "SEND") {
    if ((await isFollower(igUserId)) === true) return deliver(); // already follows — skip the gate
    await sendMessage(igUserId, funnel.copy.gate, {
      title: funnel.copy.gate_button,
      payload: `FOLLOWING:${funnelId}`,
    });
    await sql`update conversations set state = 'gated', updated_at = now()
              where funnel_id = ${funnelId} and ig_user_id = ${igUserId}`;
    await logEvent("gate", {}, funnelId, igUserId);
    return;
  }

  // FOLLOWING tap: soft check — nudge once if the API says not following, deliver next tap regardless.
  const follows = await isFollower(igUserId);
  if (follows === false && !conv.gate_nudged) {
    await sql`update conversations set gate_nudged = true, updated_at = now()
              where funnel_id = ${funnelId} and ig_user_id = ${igUserId}`;
    await sendMessage(igUserId, "hmm, not seeing the follow yet — tap again once you are", {
      title: funnel.copy.gate_button,
      payload: `FOLLOWING:${funnelId}`,
    });
    return;
  }
  return deliver();
}
