import Groq, { toFile } from "groq-sdk";

let client: Groq | null = null;
function getClient(): Groq {
  if (!client) client = new Groq();
  return client;
}

const TRANSCRIBE_MODEL = process.env.GROQ_TRANSCRIBE_MODEL || "whisper-large-v3-turbo";

export async function transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
  const result = await getClient().audio.transcriptions.create({
    file: await toFile(buffer, filename),
    model: TRANSCRIBE_MODEL,
    response_format: "text",
  });

  return typeof result === "string" ? result : result.text;
}
