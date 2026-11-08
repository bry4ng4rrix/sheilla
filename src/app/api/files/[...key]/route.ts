import { prisma } from "@/lib/prisma";
import { getCurrentUser, can } from "@/lib/session";
import { mimeFromKey, storage } from "@/lib/storage";

/** Téléchargement contrôlé : les fichiers ne sont jamais servis depuis public/. */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/files/[...key]">,
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Non authentifié", { status: 401 });
  const key = (await ctx.params).key.join("/");
  const folder = key.split("/")[0];

  if (folder === "leave-attachments") {
    // RG07 : justificatifs visibles par leur auteur et les gestionnaires RH uniquement
    const att = await prisma.leaveAttachment.findUnique({
      where: { fileKey: key },
      include: { leaveRequest: true },
    });
    if (!att) return new Response("Introuvable", { status: 404 });
    if (
      att.leaveRequest.employeeId !== user.employeeId &&
      !can(user, "leaves.manage")
    )
      return new Response("Accès refusé", { status: 403 });
  } else if (folder !== "employees" && folder !== "announcements") {
    return new Response("Introuvable", { status: 404 });
  }

  try {
    const data = await storage.read(key);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeFromKey(key),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition":
          folder === "leave-attachments" ? "attachment" : "inline",
      },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
