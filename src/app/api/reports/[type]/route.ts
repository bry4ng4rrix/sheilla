import { NextRequest } from "next/server";
import { getCurrentUser, can } from "@/lib/session";
import { audit } from "@/lib/audit";
import { dayKey } from "@/lib/dates";
import {
  buildReport,
  parseFilters,
  REPORT_TYPES,
  type ReportType,
} from "@/server/services/reports";
import { toPdf, toXlsx } from "@/server/services/report-render";
import { getSettings } from "@/server/services/settings";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/reports/[type]">,
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Non authentifié", { status: 401 });
  if (!can(user, "reports.view"))
    return new Response("Accès refusé", { status: 403 });
  const { type } = await ctx.params;
  if (!(type in REPORT_TYPES))
    return new Response("Rapport inconnu", { status: 404 });
  const format =
    req.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";

  try {
    const filters = parseFilters(req.nextUrl.searchParams);
    const report = await buildReport(type as ReportType, filters);
    const meta = {
      company: (await getSettings())["company.name"],
      author: user.name,
    };
    const body =
      format === "pdf" ? await toPdf(report, meta) : await toXlsx(report, meta);
    await audit({
      userId: user.id,
      action: "report.export",
      entity: "Report",
      entityId: type,
      after: { format, from: dayKey(filters.from), to: dayKey(filters.to) },
    });
    const filename = `${type}-${dayKey(filters.from)}_${dayKey(filters.to)}.${format}`;
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type":
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[report]", e);
    return new Response("Erreur lors de la génération du rapport.", {
      status: 500,
    });
  }
}
