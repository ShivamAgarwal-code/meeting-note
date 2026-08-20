import { createClient, type Client } from "@libsql/client";

const DB_URL = process.env.TURSO_DATABASE_URL || "file:./data/meetings.db";
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

async function createConnection(): Promise<Client> {
  if (DB_URL.startsWith("file:")) {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = DB_URL.slice("file:".length);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  const client = createClient({ url: DB_URL, authToken: AUTH_TOKEN });

  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        transcript TEXT NOT NULL,
        source TEXT NOT NULL,
        summary TEXT NOT NULL,
        action_items TEXT NOT NULL,
        decisions TEXT NOT NULL,
        sentiment TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_meeting_id ON chat_messages(meeting_id)`,
    ],
    "write"
  );

  return client;
}

declare global {
  var __meetingsDbPromise: Promise<Client> | undefined;
}

export function getDb(): Promise<Client> {
  if (!global.__meetingsDbPromise) {
    global.__meetingsDbPromise = createConnection();
  }
  return global.__meetingsDbPromise;
}

export interface MeetingRow {
  id: string;
  title: string;
  transcript: string;
  source: string;
  summary: string;
  action_items: string;
  decisions: string;
  sentiment: string;
  created_at: string;
}

export interface ChatMessageRow {
  id: string;
  meeting_id: string;
  role: string;
  content: string;
  created_at: string;
}
