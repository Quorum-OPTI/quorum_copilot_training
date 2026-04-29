import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "./label";

export const Form = FormProvider;

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return <Controller {...props} />;
}

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  ),
);
FormItem.displayName = "FormItem";

export function FormLabel({ children, ...props }: React.HTMLAttributes<HTMLLabelElement>) {
  return <Label {...props}>{children}</Label>;
}

export function FormMessage({ name }: { name: string }) {
  const {
    formState: { errors },
  } = useFormContext();
  const error = name.split(".").reduce<unknown>(
    (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
    errors,
  );
  if (!error || typeof error !== "object" || !("message" in error)) return null;
  return <p className="text-sm text-destructive">{(error as { message?: string }).message}</p>;
}
