import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, MeetingRow } from "@/lib/db";
import { analyzeTranscript } from "@/lib/anthropic";
import { transcribeAudio } from "@/lib/groq";

export async function GET() {
  const db = await getDb();
  const result = await db.execute(
    "SELECT id, title, sentiment, source, created_at FROM meetings ORDER BY created_at DESC"
  );
  const rows = result.rows as unknown as Pick<
    MeetingRow,
    "id" | "title" | "sentiment" | "source" | "created_at"
  >[];

  return NextResponse.json({ meetings: rows });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const pastedText = (formData.get("text") as string | null)?.trim();
  const file = formData.get("file") as File | null;

  let transcript = "";
  let source: "paste" | "txt" | "audio" = "paste";

  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|webm|flac|mp4|mpeg|mpga)$/i.test(file.name)) {
      source = "audio";
      transcript = await transcribeAudio(buffer, file.name);
    } else {
      source = "txt";
      transcript = buffer.toString("utf-8");
    }
  } else if (pastedText) {
    source = "paste";
    transcript = pastedText;
  }

  transcript = transcript.trim();
  if (!transcript) {
    return NextResponse.json(
      { error: "Provide a transcript by pasting text, uploading a .txt file, or uploading an audio file." },
      { status: 400 }
    );
  }

  const analysis = await analyzeTranscript(transcript);

  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO meetings (id, title, transcript, source, summary, action_items, decisions, sentiment, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      analysis.title,
      transcript,
      source,
      JSON.stringify(analysis.summary),
      JSON.stringify(analysis.actionItems),
      JSON.stringify(analysis.decisions),
      analysis.sentiment,
      createdAt,
    ],
  });

  return NextResponse.json({
    id,
    title: analysis.title,
    transcript,
    source,
    summary: analysis.summary,
    actionItems: analysis.actionItems,
    decisions: analysis.decisions,
    sentiment: analysis.sentiment,
    createdAt,
  });
}
