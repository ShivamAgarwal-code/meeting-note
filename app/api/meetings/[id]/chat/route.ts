import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, MeetingRow, ChatMessageRow } from "@/lib/db";
import { askFollowUp } from "@/lib/anthropic";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/meetings/[id]/chat">) {
  const { id } = await ctx.params;
  const { question } = (await request.json()) as { question?: string };

  if (!question || !question.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const db = await getDb();
  const meetingResult = await db.execute({ sql: "SELECT * FROM meetings WHERE id = ?", args: [id] });
  const meeting = meetingResult.rows[0] as unknown as MeetingRow | undefined;
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const historyResult = await db.execute({
    sql: "SELECT role, content FROM chat_messages WHERE meeting_id = ? ORDER BY created_at ASC",
    args: [id],
  });
  const historyRows = historyResult.rows as unknown as Pick<ChatMessageRow, "role" | "content">[];

  const analysis = {
    title: meeting.title,
    summary: JSON.parse(meeting.summary),
    actionItems: JSON.parse(meeting.action_items),
    decisions: JSON.parse(meeting.decisions),
    sentiment: meeting.sentiment,
  };

  const answer = await askFollowUp(
    meeting.transcript,
    analysis,
    historyRows.map((r) => ({ role: r.role as "user" | "assistant", content: r.content })),
    question.trim()
  );

  const now = () => new Date().toISOString();
  await db.batch(
    [
      {
        sql: "INSERT INTO chat_messages (id, meeting_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [randomUUID(), id, "user", question.trim(), now()],
      },
      {
        sql: "INSERT INTO chat_messages (id, meeting_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [randomUUID(), id, "assistant", answer, now()],
      },
    ],
    "write"
  );

  return NextResponse.json({ answer });
}
