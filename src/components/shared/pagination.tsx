import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export const PAGE_SIZE = 12;

export function pageFrom(
  sp: Record<string, string | string[] | undefined>,
  size = PAGE_SIZE,
) {
  const page = Math.max(1, Number(sp.page) || 1);
  return { page, skip: (page - 1) * size, take: size };
}

export function Pagination({
  page,
  total,
  size = PAGE_SIZE,
  searchParams,
}: {
  page: number;
  total: number;
  size?: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams))
      if (typeof v === "string" && k !== "page") sp.set(k, v);
    sp.set("page", String(p));
    return `?${sp}`;
  };
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {total} résultat{total > 1 ? "s" : ""} · page {page}/{pages}
      </span>
      <div className="flex gap-1">
        <Link
          aria-disabled={page <= 1}
          href={href(page - 1)}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page <= 1 && "pointer-events-none opacity-40",
          )}
        >
          <ChevronLeft /> Précédent
        </Link>
        <Link
          aria-disabled={page >= pages}
          href={href(page + 1)}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page >= pages && "pointer-events-none opacity-40",
          )}
        >
          Suivant <ChevronRight />
        </Link>
      </div>
    </div>
  );
}
