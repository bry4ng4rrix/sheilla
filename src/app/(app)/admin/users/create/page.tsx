import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { requirePage } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { UserForm } from "@/components/admin/user-form";
import { createUserAction } from "@/server/actions/users";
import { linkableEmployees } from "@/server/services/users";

export const metadata: Metadata = { title: "Nouveau compte" };

export default async function CreateUserPage() {
  await requirePage("users.manage");
  return (
    <>
      <PageHeader
        icon={<UserPlus />}
        title="Nouveau compte"
        description="Création d'un accès à la plateforme"
      />
      <Panel className="max-w-3xl">
        <UserForm
          action={createUserAction}
          employees={await linkableEmployees()}
        />
      </Panel>
    </>
  );
}
