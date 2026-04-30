import type { ComponentType, ReactNode, SVGProps } from "react";
import { Link } from "react-router-dom";
import type { LucideProps } from "lucide-react";
import { Button, buttonVariants, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Icon = ComponentType<LucideProps> | ComponentType<SVGProps<SVGSVGElement>>;

export type PageTitleAction = {
  label: string;
  to?: string;
  onClick?: () => void;
  variant?: ButtonProps["variant"];
  icon?: Icon;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
};

export interface PageTitleProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: PageTitleAction[];
  className?: string;
}

export function PageTitle({ title, subtitle, actions, className }: PageTitleProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-base text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions.map((action, i) => (
            <PageTitleActionButton key={`${action.label}-${i}`} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageTitleActionButton({ action }: { action: PageTitleAction }) {
  const { label, to, onClick, variant = "default", icon: Icon, disabled, type } = action;
  const content = (
    <>
      {Icon && <Icon className="mr-2 h-4 w-4" aria-hidden />}
      {label}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cn(buttonVariants({ variant }), disabled && "pointer-events-none opacity-50")}>
        {content}
      </Link>
    );
  }

  return (
    <Button variant={variant} onClick={onClick} disabled={disabled} type={type}>
      {content}
    </Button>
  );
}
