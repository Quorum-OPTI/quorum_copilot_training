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

type FormFieldContextValue = { id: string; name: string };
const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

function useFormField() {
  const ctx = React.useContext(FormFieldContext);
  if (!ctx) throw new Error("useFormField must be used inside a FormField");
  return ctx;
}

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  const id = React.useId();
  return (
    <FormFieldContext.Provider value={{ id, name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  ),
);
FormItem.displayName = "FormItem";

export const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ ...props }, ref) => {
  const { id } = useFormField();
  return <Label ref={ref} htmlFor={id} {...props} />;
});
FormLabel.displayName = "FormLabel";

export const FormControl = React.forwardRef<
  HTMLElement,
  { children: React.ReactElement<Record<string, unknown>> }
>(({ children }, _ref) => {
  const { id } = useFormField();
  return React.cloneElement(children, { id });
});
FormControl.displayName = "FormControl";

export function FormMessage({ name }: { name?: string }) {
  const ctx = React.useContext(FormFieldContext);
  const fieldName = name ?? ctx?.name;
  const {
    formState: { errors },
  } = useFormContext();
  if (!fieldName) return null;
  const error = fieldName.split(".").reduce<unknown>(
    (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
    errors,
  );
  if (!error || typeof error !== "object" || !("message" in error)) return null;
  return <p className="text-sm text-destructive">{(error as { message?: string }).message}</p>;
}
