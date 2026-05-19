import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
      <div>
        <h1 className="h1 mb-2">{title}</h1>
        {description && (
          <p className="body text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {action && <div className="md:mt-0">{action}</div>}
    </div>
  );
}
