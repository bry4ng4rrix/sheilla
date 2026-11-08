import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { requirePage } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmployeeForm } from "@/components/employees/employee-form";
import { createEmployeeAction } from "@/server/actions/employees";
import { orgOptions } from "@/server/services/lookups";
import { dayKey, localDay } from "@/lib/dates";

export const metadata: Metadata = { title: "Nouvel employé" };

export default async function CreateEmployeePage() {
  await requirePage("employees.manage");
  const opts = await orgOptions();
  return (
    <>
      <PageHeader
        icon={<UserPlus />}
        title="Nouvel employé"
        description="Création d'un dossier administratif"
      />
      <EmployeeForm
        action={createEmployeeAction}
        departments={opts.departments}
        teams={opts.teams}
        defaults={{ hireDate: dayKey(localDay()) }}
      />
    </>
  );
}
