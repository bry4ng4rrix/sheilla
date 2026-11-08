import { Megaphone, Siren, FileText, Info } from "lucide-react";
import { cn } from "cn";

const STYLES: Record<string, { bg: string; icon: React.ReactNode }> = {
  URGENT: { bg: "from-red-500 to-orange-500", icon: <Siren /> },
  NOTE_SERVICE: { bg: "from-orange-500 to-amber-400", icon: <FileText /> },
  COMMUNIQUE: { bg: "from-slate-700 to-slate-500", icon: <Megaphone /> },
  GENERAL: { bg: "from-teal-500 to-emerald-400", icon: <Info /> },
};

/** Visuel d'annonce : image téléversée ou bandeau coloré selon le type. */
export function AnnouncementCover({
  type,
  imageKey,
  className,
}: {
  type: string;
  imageKey?: string | null;
  className?: string;
}) {
  if (imageKey)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fichier servi par /api/files
      <img
        src={`/api/files/${imageKey}`}
        alt=""
        className={cn("w-full object-cover", className)}
      />
    );
  const s = STYLES[type] ?? STYLES.GENERAL;
  return (
    <div
      className={cn(
        "relative grid w-full place-items-center overflow-hidden bg-gradient-to-br text-white",
        s.bg,
        className,
      )}
    >
      <div className="absolute -right-6 -bottom-10 size-40 rounded-full border-[20px] border-white/15" />
      <div className="absolute -top-8 -left-8 size-24 rounded-full bg-white/10" />
      <span className="relative [&_svg]:size-12 [&_svg]:opacity-90">
        {s.icon}
      </span>
    </div>
  );
}
