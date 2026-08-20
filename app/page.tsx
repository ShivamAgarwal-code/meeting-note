"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type InputMode = "paste" | "txt" | "audio";

const TABS: { key: InputMode; label: string; hint: string }[] = [
  { key: "paste", label: "Paste text", hint: "Drop in a transcript you already have." },
  { key: "txt", label: "Upload .txt", hint: "Any plain-text transcript export." },
  { key: "audio", label: "Upload audio", hint: "Recorded audio — transcribed automatically." },
];

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "paste" && !text.trim()) {
      setError("Paste a transcript first.");
      return;
    }
    if (mode !== "paste" && !file) {
      setError(`Select a ${mode === "txt" ? ".txt" : "audio"} file first.`);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (mode === "paste") {
        formData.set("text", text);
      } else if (file) {
        formData.set("file", file);
      }

      const res = await fetch("/api/meetings", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process transcript.");
      }

      router.push(`/meetings/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: InputMode) {
    setMode(next);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const activeTab = TABS.find((t) => t.key === mode)!;

  return (
    <div className="max-w-2xl mx-auto px-8 py-14">
      <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-faint">
        New entry
      </span>
      <h1 className="mt-1 text-[26px] font-medium leading-tight">Log a meeting</h1>
      <p className="mt-2 text-[14px] text-ink-soft leading-relaxed max-w-lg">
        Bring in a transcript and we&apos;ll draft the minutes — a summary, action items with
        owners and dates, key decisions, and a read on the room. You can ask it questions
        afterward.
      </p>

      <div className="mt-9 flex gap-1 border-b border-rule">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => switchMode(tab.key)}
            className={`px-3.5 py-2.5 text-[12px] font-mono tracking-wide uppercase -mb-px border-b-2 transition-colors ${
              mode === tab.key
                ? "border-signal text-signal-strong"
                : "border-transparent text-ink-faint hover:text-ink-soft"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-[12.5px] text-ink-faint">{activeTab.hint}</p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
        {mode === "paste" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your meeting transcript here…"
            className="w-full h-80 rounded-sm border border-rule bg-surface p-4 text-[13px] font-mono leading-relaxed resize-y placeholder:text-ink-faint focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal"
          />
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 w-full h-48 rounded-sm border border-dashed border-rule-strong bg-surface hover:border-signal transition-colors cursor-pointer">
            <span className="font-mono text-[12px] tracking-wide uppercase text-ink-soft">
              {file ? file.name : `Choose ${mode === "txt" ? "a .txt file" : "an audio file"}`}
            </span>
            {!file && (
              <span className="text-[12px] text-ink-faint">
                {mode === "txt" ? "TXT" : "MP3, WAV, M4A, and more"}
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={mode === "txt" ? ".txt,text/plain" : "audio/*"}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        )}

        {error && (
          <p className="text-[13px] text-rust bg-rust-soft rounded-sm px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="self-start px-5 py-2.5 rounded-sm bg-signal text-surface text-[13px] font-mono tracking-wide uppercase hover:bg-signal-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Drafting minutes…" : "Analyze meeting"}
        </button>
      </form>
    </div>
  );
}
