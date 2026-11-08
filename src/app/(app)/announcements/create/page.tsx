import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { requirePage } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { AnnouncementForm } from "@/components/announcements/announcement-form";

export const metadata: Metadata = { title: "Nouvelle annonce" };

export default async function CreateAnnouncementPage() {
  await requirePage("announcements.manage");
  return (
    <>
      <PageHeader
        icon={<Megaphone />}
        title="Nouvelle annonce"
        description="Diffusez une information à l'ensemble du personnel"
      />
      <AnnouncementForm />
    </>
  );
}
