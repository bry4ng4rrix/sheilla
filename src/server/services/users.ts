import "server-only";
import { prisma } from "@/lib/prisma";

/** Dossiers employés actifs sans compte (+ celui déjà lié au compte édité). */
export async function linkableEmployees(currentEmployeeId?: string | null) {
  const list = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      OR: [
        { user: null },
        ...(currentEmployeeId ? [{ id: currentEmployeeId }] : []),
      ],
    },
    orderBy: { lastName: "asc" },
  });
  return list.map((e) => ({
    id: e.id,
    label: `${e.lastName} ${e.firstName} (${e.matricule})`,
  }));
}
