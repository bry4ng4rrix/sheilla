export function PageHeader({
  title,
  description,
  actions,
  icon,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-rise">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-600/25 [&_svg]:size-5">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
