// Instagram API (Instagram Login flavor) — messaging + comment primitives.
import { getToken } from "./token";

const BASE = "https://graph.instagram.com/v23.0";
const IG_ID = () => process.env.IG_USER_ID!;

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getToken()}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`IG ${path} ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

// One-shot private reply to a comment (allowed once, within 7 days of the comment).
export function privateReply(commentId: string, text: string, button?: { title: string; payload: string }) {
  return post(`${IG_ID()}/messages`, {
    recipient: { comment_id: commentId },
    message: button
      ? { text, quick_replies: [{ content_type: "text", title: button.title, payload: button.payload }] }
      : { text },
  });
}

// Normal DM inside the open messaging window.
export function sendMessage(igUserId: string, text: string, button?: { title: string; payload: string }) {
  return post(`${IG_ID()}/messages`, {
    recipient: { id: igUserId },
    message: button
      ? { text, quick_replies: [{ content_type: "text", title: button.title, payload: button.payload }] }
      : { text },
  });
}

export function replyToComment(commentId: string, text: string) {
  return post(`${commentId}/replies`, { message: text });
}

export async function isFollower(igUserId: string): Promise<boolean | null> {
  const res = await fetch(
    `${BASE}/${igUserId}?fields=is_user_follow_business&access_token=${await getToken()}`
  );
  if (!res.ok) return null; // profile API can fail for restricted users — treat as unknown
  const json = await res.json();
  return typeof json.is_user_follow_business === "boolean" ? json.is_user_follow_business : null;
}
