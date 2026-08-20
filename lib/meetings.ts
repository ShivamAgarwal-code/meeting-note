import { getDb, MeetingRow } from "@/lib/db";
import type { ActionItem } from "@/lib/anthropic";

export interface MeetingListItem {
  id: string;
  title: string;
  sentiment: string;
  source: string;
  createdAt: string;
}

export async function listMeetings(): Promise<MeetingListItem[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT id, title, sentiment, source, created_at as createdAt FROM meetings ORDER BY created_at DESC"
  );
  return result.rows as unknown as MeetingListItem[];
}

export interface MeetingDetail {
  id: string;
  title: string;
  transcript: string;
  source: string;
  summary: string[];
  actionItems: ActionItem[];
  decisions: string[];
  sentiment: string;
  createdAt: string;
  messages: { role: string; content: string; createdAt: string }[];
}

export async function getMeetingWithMessages(id: string): Promise<MeetingDetail | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM meetings WHERE id = ?",
    args: [id],
  });
  const row = result.rows[0] as unknown as MeetingRow | undefined;
  if (!row) return null;

  const messagesResult = await db.execute({
    sql: "SELECT role, content, created_at as createdAt FROM chat_messages WHERE meeting_id = ? ORDER BY created_at ASC",
    args: [id],
  });
  const messages = messagesResult.rows as unknown as { role: string; content: string; createdAt: string }[];

  return {
    id: row.id,
    title: row.title,
    transcript: row.transcript,
    source: row.source,
    summary: JSON.parse(row.summary),
    actionItems: JSON.parse(row.action_items),
    decisions: JSON.parse(row.decisions),
    sentiment: row.sentiment,
    createdAt: row.created_at,
    messages,
  };
}
