import { cn } from "cn";

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  delay = 0,
}: {
  title?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  delay?: number;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border bg-card shadow-sm shadow-stone-900/[0.02] animate-rise",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            {title && <h2 className="font-bold text-stone-900">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
