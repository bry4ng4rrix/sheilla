import { FileSpreadsheet, FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { Report } from "@/server/services/reports";

/** Aperçu d'un rapport + boutons d'export PDF / Excel avec les mêmes filtres. */
export function ReportView({
  report,
  type,
  query,
}: {
  report: Report;
  type: string;
  query: Record<string, string>;
}) {
  const qs = (format: string) =>
    `/api/reports/${type}?${new URLSearchParams({ ...query, format })}`;
  return (
    <section className="overflow-hidden rounded-2xl border bg-card animate-rise">
      <header className="flex flex-col gap-3 border-b bg-gradient-to-r from-orange-50 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">{report.title}</h2>
          <p className="text-sm text-muted-foreground">
            {report.period} · {report.rows.length} ligne(s)
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={qs("pdf")}
            className={buttonVariants({ variant: "outline" })}
          >
            <FileText className="text-red-600" /> PDF
          </a>
          <a href={qs("xlsx")} className={buttonVariants()}>
            <FileSpreadsheet /> Excel
          </a>
        </div>
      </header>
      {report.rows.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="Aucune donnée"
            description="Aucune ligne ne correspond aux filtres sélectionnés."
          />
        </div>
      ) : (
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-orange-500 text-left text-xs text-white">
              <tr>
                {report.columns.map((c) => (
                  <th
                    key={c.key}
                    className="px-3 py-2.5 font-semibold whitespace-nowrap"
                    style={{ textAlign: c.align ?? "left" }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.rows.slice(0, 300).map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-orange-50/40">
                  {report.columns.map((c) => (
                    <td
                      key={c.key}
                      className="px-3 py-2 whitespace-nowrap"
                      style={{ textAlign: c.align ?? "left" }}
                    >
                      {r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {report.totals && (
              <tfoot className="sticky bottom-0 border-t-2 border-orange-400 bg-orange-100 font-bold">
                <tr>
                  {report.columns.map((c) => (
                    <td
                      key={c.key}
                      className="px-3 py-2.5 whitespace-nowrap"
                      style={{ textAlign: c.align ?? "left" }}
                    >
                      {report.totals![c.key] ?? ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
          {report.rows.length > 300 && (
            <p className="p-3 text-center text-xs text-muted-foreground">
              Aperçu limité à 300 lignes — l&apos;export contient
              l&apos;intégralité.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function stringParams(
  sp: Record<string, string | string[] | undefined>,
) {
  return Object.fromEntries(
    Object.entries(sp).filter(
      ([k, v]) => typeof v === "string" && v && k !== "page",
    ),
  ) as Record<string, string>;
}
