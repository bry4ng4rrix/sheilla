import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/session";
import { dayKey } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmployeeForm } from "@/components/employees/employee-form";
import { updateEmployeeAction } from "@/server/actions/employees";
import { orgOptions } from "@/server/services/lookups";

export const metadata: Metadata = { title: "Modifier un employé" };

export default async function EditEmployeePage({
  params,
}: PageProps<"/employees/[id]/edit">) {
  await requirePage("employees.manage");
  const { id } = await params;
  const [e, opts] = await Promise.all([
    prisma.employee.findUnique({ where: { id } }),
    orgOptions(),
  ]);
  if (!e) notFound();
  const d = (v: Date | null) => (v ? dayKey(v) : "");
  return (
    <>
      <PageHeader
        icon={<Pencil />}
        title={`${e.firstName} ${e.lastName}`}
        description={`Modification du dossier ${e.matricule}`}
      />
      <EmployeeForm
        action={updateEmployeeAction.bind(null, e.id)}
        departments={opts.departments}
        teams={opts.teams}
        photoUrl={e.photoKey ? `/api/files/${e.photoKey}` : null}
        defaults={{
          id: e.id,
          matricule: e.matricule,
          lastName: e.lastName,
          firstName: e.firstName,
          gender: e.gender,
          birthDate: d(e.birthDate),
          address: e.address ?? "",
          phone: e.phone ?? "",
          email: e.email ?? "",
          positionId: e.positionId,
          teamId: e.teamId ?? "",
          hireDate: d(e.hireDate),
          contractType: e.contractType,
          status: e.status,
          departureDate: d(e.departureDate),
        }}
      />
    </>
  );
}
