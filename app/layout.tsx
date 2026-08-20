import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Smart Meeting Notes Assistant",
  description: "Summarize meetings, extract action items, and chat with your transcripts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-row bg-paper text-ink">
        <Sidebar />
        <main className="flex-1 min-w-0 h-screen overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
