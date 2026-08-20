import Link from "next/link";
import { listMeetings } from "@/lib/meetings";

const SOURCE_LABEL: Record<string, string> = {
  paste: "Pasted",
  txt: "Text file",
  audio: "Audio",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

export default async function Sidebar() {
  const meetings = await listMeetings();

  return (
    <aside className="w-[280px] shrink-0 h-screen flex flex-col bg-surface border-r border-rule">
      <div className="px-5 pt-6 pb-5 border-b border-rule">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[13px] tracking-[0.14em] uppercase text-ink-faint">
            Minutes
          </span>
        </div>
        <h1 className="mt-0.5 text-[15px] font-medium leading-snug">Meeting Notes Assistant</h1>

        <Link
          href="/"
          className="mt-4 flex items-center justify-center gap-2 w-full rounded-sm bg-signal text-surface py-2 text-[13px] font-mono tracking-wide uppercase hover:bg-signal-strong transition-colors"
        >
          + New meeting
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        {meetings.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-soft leading-relaxed">
            No meetings recorded yet. Add a transcript to build your first set of minutes.
          </p>
        ) : (
          <ul>
            {meetings.map((m, i) => (
              <li key={m.id}>
                <Link
                  href={`/meetings/${m.id}`}
                  className="group block px-5 py-3.5 border-b border-rule/70 hover:bg-paper transition-colors"
                >
                  <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide uppercase text-ink-faint">
                    <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span>·</span>
                    <span>{formatDate(m.createdAt)}</span>
                    <span>·</span>
                    <span>{SOURCE_LABEL[m.source] ?? m.source}</span>
                  </div>
                  <div className="mt-1 text-[14px] leading-snug text-ink group-hover:text-signal-strong transition-colors">
                    {m.title}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
