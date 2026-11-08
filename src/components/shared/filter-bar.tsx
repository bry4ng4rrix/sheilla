"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";

type SelectDef = {
  name: string;
  label: string;
  allLabel?: string;
  options: { value: string; label: string }[];
};

/** Filtres synchronisés avec l'URL : la recherche, le tri et le filtrage se font côté serveur. */
export function FilterBar({
  searchPlaceholder,
  selects = [],
  dates = [],
}: {
  searchPlaceholder?: string;
  selects?: SelectDef[];
  dates?: { name: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => update("q", q), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seule la saisie déclenche la recherche
  }, [q]);

  const active = [...params.keys()].some((k) => k !== "page");

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
      {searchPlaceholder !== undefined && (
        <div className="relative min-w-0 flex-1 sm:min-w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-8"
            aria-label="Rechercher"
          />
        </div>
      )}
      {selects.map((s) => (
        <NativeSelect
          key={s.name}
          aria-label={s.label}
          value={params.get(s.name) ?? ""}
          onChange={(e) => update(s.name, e.target.value)}
          className="w-full sm:w-auto [&_select]:h-9"
        >
          <NativeSelectOption value="">
            {s.allLabel ?? `${s.label} : tous`}
          </NativeSelectOption>
          {s.options.map((o) => (
            <NativeSelectOption key={o.value} value={o.value}>
              {o.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ))}
      {dates.map((d) => (
        <label
          key={d.name}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          {d.label}
          <Input
            type="date"
            value={params.get(d.name) ?? ""}
            onChange={(e) => update(d.name, e.target.value)}
            className="h-9 w-auto"
          />
        </label>
      ))}
      {active && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ("");
            router.replace(pathname);
          }}
        >
          <X /> Réinitialiser
        </Button>
      )}
    </div>
  );
}
