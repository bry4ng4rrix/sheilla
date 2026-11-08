import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-orange-200 bg-orange-50/40 px-6 py-14 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-white text-orange-500 shadow-sm ring-1 ring-orange-100 [&_svg]:size-6">
        {icon ?? <Inbox />}
      </div>
      <p className="font-semibold text-stone-800">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
