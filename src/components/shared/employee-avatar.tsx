import { cn } from "cn";

const GRADIENTS = [
  "from-orange-400 to-orange-600",
  "from-amber-400 to-orange-500",
  "from-teal-400 to-teal-600",
  "from-slate-500 to-slate-700",
  "from-rose-400 to-orange-500",
  "from-sky-400 to-indigo-500",
];

export function EmployeeAvatar({
  firstName,
  lastName,
  photoKey,
  size = "md",
  className,
}: {
  firstName: string;
  lastName: string;
  photoKey?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-16 text-xl",
    xl: "size-24 text-3xl",
  };
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const g =
    GRADIENTS[
      (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % GRADIENTS.length
    ];
  return photoKey ? (
    // eslint-disable-next-line @next/next/no-img-element -- fichier servi par la route protégée /api/files
    <img
      src={`/api/files/${photoKey}`}
      alt={`${firstName} ${lastName}`}
      className={cn(
        "shrink-0 rounded-full object-cover ring-2 ring-white",
        sizes[size],
        className,
      )}
    />
  ) : (
    <div
      aria-label={`${firstName} ${lastName}`}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white ring-2 ring-white",
        g,
        sizes[size],
        className,
      )}
    >
      {initials}
    </div>
  );
}
