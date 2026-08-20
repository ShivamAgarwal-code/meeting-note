import { NextRequest, NextResponse } from "next/server";
import { getDb, MeetingRow } from "@/lib/db";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/meetings/[id]">) {
  const { id } = await ctx.params;
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM meetings WHERE id = ?", args: [id] });
  const row = result.rows[0] as unknown as MeetingRow | undefined;

  if (!row) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const messagesResult = await db.execute({
    sql: "SELECT role, content, created_at FROM chat_messages WHERE meeting_id = ? ORDER BY created_at ASC",
    args: [id],
  });

  return NextResponse.json({
    id: row.id,
    title: row.title,
    transcript: row.transcript,
    source: row.source,
    summary: JSON.parse(row.summary),
    actionItems: JSON.parse(row.action_items),
    decisions: JSON.parse(row.decisions),
    sentiment: row.sentiment,
    createdAt: row.created_at,
    messages: messagesResult.rows,
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/meetings/[id]">) {
  const { id } = await ctx.params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM chat_messages WHERE meeting_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM meetings WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
