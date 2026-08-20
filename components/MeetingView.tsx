"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MeetingDetail } from "@/lib/meetings";

type ChatMsg = { role: "user" | "assistant"; content: string };

const SOURCE_LABEL: Record<string, string> = {
  paste: "Pasted transcript",
  txt: "Text file",
  audio: "Audio recording",
};

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-[14px] leading-relaxed text-ink mb-2.5 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="flex flex-col gap-1.5 mb-2.5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="flex flex-col gap-1.5 mb-2.5 last:mb-0 list-decimal pl-5 marker:text-ink-faint marker:font-mono marker:text-[12px]">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex gap-2.5 text-[14px] leading-relaxed [ol_&]:block [ol_&]:gap-0">
      <span className="text-signal select-none mt-[3px] [ol_&]:hidden">—</span>
      <span>{children}</span>
    </li>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="font-mono text-[12.5px] bg-paper border border-rule rounded-sm px-1.5 py-0.5">
      {children}
    </code>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-signal-strong underline underline-offset-2">
      {children}
    </a>
  ),
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-faint mb-3">
      {children}
    </h2>
  );
}

export default function MeetingView({ meeting }: { meeting: MeetingDetail }) {
  const router = useRouter();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>(
    meeting.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
  );
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, asking]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;

    setChatError(null);
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setAsking(true);

    try {
      const res = await fetch(`/api/meetings/${meeting.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get an answer.");
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAsking(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this meeting? This can't be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-12 pb-0 flex flex-col">
      {/* Masthead */}
      <div className="flex items-start justify-between gap-6 pb-6 border-b border-rule">
        <div className="min-w-0">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-faint">
            {SOURCE_LABEL[meeting.source] ?? meeting.source} · {new Date(meeting.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
          <h1 className="mt-1 text-[24px] font-medium leading-tight text-balance">{meeting.title}</h1>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 mt-1 font-mono text-[11px] tracking-wide uppercase text-ink-faint hover:text-rust transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      {/* Sentiment stamp */}
      <div className="py-6 border-b border-rule flex items-center gap-3">
        <span className="inline-flex items-center rounded-sm border border-signal/40 bg-signal-soft text-signal-strong px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase">
          Tone
        </span>
        <p className="text-[14px] text-ink leading-relaxed">{meeting.sentiment}</p>
      </div>

      {/* Summary */}
      <div className="py-7 border-b border-rule">
        <SectionLabel>Summary</SectionLabel>
        <ul className="flex flex-col gap-2.5">
          {meeting.summary.map((s, i) => (
            <li key={i} className="flex gap-3 text-[14.5px] leading-relaxed">
              <span className="text-signal select-none mt-[3px]">—</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action items */}
      <div className="py-7 border-b border-rule">
        <SectionLabel>Action items</SectionLabel>
        {meeting.actionItems.length === 0 ? (
          <p className="text-[14px] text-ink-faint">None identified in this transcript.</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-rule">
            <table className="w-full text-[13.5px] border-collapse">
              <thead>
                <tr className="text-left font-mono text-[10.5px] tracking-wide uppercase text-ink-faint bg-paper">
                  <th className="py-2.5 px-3.5 font-medium">Task</th>
                  <th className="py-2.5 px-3.5 font-medium w-40">Owner</th>
                  <th className="py-2.5 px-3.5 font-medium w-36">Due</th>
                </tr>
              </thead>
              <tbody>
                {meeting.actionItems.map((item, i) => (
                  <tr key={i} className="border-t border-rule">
                    <td className="py-2.5 px-3.5 align-top">{item.task}</td>
                    <td className="py-2.5 px-3.5 align-top">
                      {item.owner ? (
                        <span className="inline-flex items-center rounded-sm bg-signal-soft text-signal-strong px-2 py-0.5 text-[12px] font-medium">
                          {item.owner}
                        </span>
                      ) : (
                        <span className="text-ink-faint">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 align-top font-mono tabular-nums text-ink-soft">
                      {item.dueDate ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decisions */}
      <div className="py-7 border-b border-rule">
        <SectionLabel>Key decisions</SectionLabel>
        {meeting.decisions.length === 0 ? (
          <p className="text-[14px] text-ink-faint">None identified in this transcript.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {meeting.decisions.map((d, i) => (
              <li key={i} className="flex gap-3 text-[14.5px] leading-relaxed">
                <span className="text-amber select-none mt-[3px]">✓</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Transcript */}
      <div className="py-7 border-b border-rule">
        <button
          onClick={() => setTranscriptOpen((v) => !v)}
          className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-ink-faint hover:text-ink-soft transition-colors"
        >
          <span className={`transition-transform ${transcriptOpen ? "rotate-90" : ""}`}>›</span>
          Full transcript
        </button>
        {transcriptOpen && (
          <pre className="whitespace-pre-wrap text-[12.5px] font-mono leading-relaxed text-ink-soft bg-surface border border-rule rounded-sm p-4 mt-3 max-h-96 overflow-y-auto">
            {meeting.transcript}
          </pre>
        )}
      </div>

      {/* Chat */}
      <div className="pt-7 pb-8 flex flex-col">
        <SectionLabel>Ask about this meeting</SectionLabel>

        <div className="flex flex-col gap-4 mb-4 max-h-[26rem] overflow-y-auto pr-1">
          {messages.length === 0 && (
            <p className="text-[13.5px] text-ink-faint">
              e.g. &ldquo;What did Sarah commit to?&rdquo; or &ldquo;Did we settle on a launch
              date?&rdquo;
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className="flex flex-col gap-1 max-w-[38rem]">
              <span className="font-mono text-[10.5px] tracking-wide uppercase text-ink-faint">
                {m.role === "user" ? "You" : "Assistant"}
              </span>
              {m.role === "user" ? (
                <p className="text-[14px] leading-relaxed text-ink">{m.content}</p>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {m.content}
                </ReactMarkdown>
              )}
            </div>
          ))}
          {asking && (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10.5px] tracking-wide uppercase text-ink-faint">
                Assistant
              </span>
              <p className="text-[14px] text-ink-faint italic">Reading the transcript…</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {chatError && (
          <p className="text-[13px] text-rust bg-rust-soft rounded-sm px-3 py-2 mb-3">{chatError}</p>
        )}

        <form onSubmit={handleAsk} className="sticky bottom-0 bg-paper pt-2 pb-8 flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this meeting…"
            className="flex-1 rounded-sm border border-rule bg-surface px-3.5 py-2.5 text-[14px] placeholder:text-ink-faint focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal"
          />
          <button
            type="submit"
            disabled={asking || !question.trim()}
            className="px-4 py-2.5 rounded-sm bg-signal text-surface text-[13px] font-mono tracking-wide uppercase hover:bg-signal-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
