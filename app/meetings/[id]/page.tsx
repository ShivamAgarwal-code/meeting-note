import { notFound } from "next/navigation";
import { getMeetingWithMessages } from "@/lib/meetings";
import MeetingView from "@/components/MeetingView";

export default async function MeetingPage({ params }: PageProps<"/meetings/[id]">) {
  const { id } = await params;
  const meeting = await getMeetingWithMessages(id);

  if (!meeting) {
    notFound();
  }

  return <MeetingView meeting={meeting} />;
}
