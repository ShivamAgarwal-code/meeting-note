import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const ANALYSIS_MODEL = process.env.ANTHROPIC_ANALYSIS_MODEL || "claude-opus-4-8";
const CHAT_MODEL = process.env.ANTHROPIC_CHAT_MODEL || "claude-opus-4-8";

export interface ActionItem {
  task: string;
  owner: string | null;
  dueDate: string | null;
}

export interface MeetingAnalysis {
  title: string;
  summary: string[];
  actionItems: ActionItem[];
  decisions: string[];
  sentiment: string;
}

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "A short (3-8 word) descriptive title for this meeting.",
    },
    summary: {
      type: "array",
      description: "3 to 5 concise bullet points summarizing the meeting.",
      items: { type: "string" },
    },
    actionItems: {
      type: "array",
      description: "Action items mentioned in the meeting, with owner and due date if stated.",
      items: {
        type: "object",
        properties: {
          task: { type: "string" },
          owner: {
            type: ["string", "null"],
            description: "The person responsible, or null if not mentioned.",
          },
          dueDate: {
            type: ["string", "null"],
            description: "The due date as stated in the transcript, or null if not mentioned.",
          },
        },
        required: ["task", "owner", "dueDate"],
        additionalProperties: false,
      },
    },
    decisions: {
      type: "array",
      description: "Key decisions that were made during the meeting.",
      items: { type: "string" },
    },
    sentiment: {
      type: "string",
      description: "One line describing the overall sentiment/tone of the meeting.",
    },
  },
  required: ["title", "summary", "actionItems", "decisions", "sentiment"],
  additionalProperties: false,
};

export async function analyzeTranscript(transcript: string): Promise<MeetingAnalysis> {
  const response = await getClient().messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 4096,
    system:
      "You are an assistant that analyzes meeting transcripts. Extract information strictly from " +
      "the transcript provided — do not invent names, dates, or facts that aren't present. " +
      "If something (like an owner or due date) is not mentioned, use null rather than guessing.",
    messages: [
      {
        role: "user",
        content: `Analyze the following meeting transcript.\n\n<transcript>\n${transcript}\n</transcript>`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: ANALYSIS_SCHEMA,
      },
    },
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content returned from analysis model");
  }
  return JSON.parse(textBlock.text) as MeetingAnalysis;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function askFollowUp(
  transcript: string,
  analysis: MeetingAnalysis,
  history: ChatTurn[],
  question: string
): Promise<string> {
  const context =
    `Meeting title: ${analysis.title}\n\n` +
    `Summary:\n${analysis.summary.map((s) => `- ${s}`).join("\n")}\n\n` +
    `Decisions:\n${analysis.decisions.map((d) => `- ${d}`).join("\n")}\n\n` +
    `Action items:\n${analysis.actionItems
      .map((a) => `- ${a.task} (owner: ${a.owner ?? "unassigned"}, due: ${a.dueDate ?? "n/a"})`)
      .join("\n")}\n\n` +
    `Full transcript:\n<transcript>\n${transcript}\n</transcript>`;

  const response = await getClient().messages.create({
    model: CHAT_MODEL,
    max_tokens: 1024,
    system:
      "You are a helpful assistant answering follow-up questions about a specific meeting. " +
      "Only use the meeting context provided below to answer. If the answer isn't in the " +
      "transcript or summary, say so clearly rather than guessing.\n\n" +
      "Format your answer in Markdown: use short paragraphs, and use a bulleted or numbered " +
      "list whenever you're listing more than one item (action items, decisions, names, etc). " +
      "Keep it concise — don't restate the whole context back.\n\n" +
      context,
    messages: [
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user" as const, content: question },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content returned from chat model");
  }
  return textBlock.text;
}
