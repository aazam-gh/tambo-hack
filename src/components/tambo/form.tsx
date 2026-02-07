import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import * as React from "react";
import { z } from "zod/v3";

type FormVariant = "default" | "solid" | "bordered";
type FormSize = "default" | "sm" | "lg";

export const formVariants = cva("w-full rounded-xl", {
  variants: {
    variant: {
      default: "bg-background",
      solid:
        "bg-muted/40 shadow-lg shadow-zinc-900/10 dark:shadow-zinc-900/20",
      bordered: "border border-border/60 bg-background",
    },
    size: {
      sm: "p-3",
      default: "p-4",
      lg: "p-6",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export const formFieldSchema = z.object({
  name: z.string().describe("Unique field name"),
  label: z.string().describe("Label shown to the user"),
  type: z
    .enum(["text", "email", "number", "textarea", "checkbox"])
    .describe("Input type"),
  placeholder: z.string().optional().describe("Optional placeholder text"),
  required: z.boolean().optional().describe("Whether the field is required"),
});

export const formSchema = z.object({
  title: z.string().describe("Title displayed at the top of the form"),
  fields: z.array(formFieldSchema).min(1).describe("Fields to render"),
  submitLabel: z
    .string()
    .optional()
    .describe("Label for the submit button (default: Submit)"),
  variant: z
    .enum(["default", "solid", "bordered"])
    .optional()
    .describe("Visual style variant"),
  size: z
    .enum(["default", "sm", "lg"])
    .optional()
    .describe("Padding size variant"),
  className: z.string().optional().describe("Additional CSS classes"),
});

export type FormProps = z.infer<typeof formSchema>;

type FormValue = string | boolean;

function buildInitialValues(
  fields: FormProps["fields"],
): Record<string, FormValue> {
  const seenNames = new Set<string>();
  const uniqueFields: FormProps["fields"] = [];
  for (const field of fields) {
    if (seenNames.has(field.name)) {
      const message = `Form field names must be unique. Duplicate: ${field.name}`;
      if (import.meta.env.DEV) {
        throw new Error(message);
      }
      console.error(message);
      continue;
    }
    seenNames.add(field.name);
    uniqueFields.push(field);
  }

  const entries = uniqueFields.map((field) => {
    switch (field.type) {
      case "checkbox":
        return [field.name, false] as const;
      default:
        return [field.name, ""] as const;
    }
  });
  return Object.fromEntries(entries);
}

export const Form = React.forwardRef<HTMLDivElement, FormProps>(
  (
    {
      title,
      fields,
      submitLabel = "Submit",
      variant,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const formId = React.useId();
    const [values, setValues] = React.useState<Record<string, FormValue>>(() =>
      buildInitialValues(fields),
    );
    const [submitted, setSubmitted] = React.useState<Record<string, FormValue> | null>(
      null,
    );

    React.useEffect(() => {
      setValues(buildInitialValues(fields));
      setSubmitted(null);
    }, [fields]);

    return (
      <div
        ref={ref}
        className={cn(formVariants({ variant, size }), className)}
        {...props}
      >
        <div className="mb-4">
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Fill out the fields and submit.
          </div>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(values);
          }}
        >
          {fields.map((field) => {
            const inputId = `${formId}-${field.name}`;

            if (field.type === "checkbox") {
              const checked = Boolean(values[field.name]);
              return (
                <label
                  key={field.name}
                  htmlFor={inputId}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.name]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-emerald-500"
                  />
                  <span className="text-sm text-foreground">{field.label}</span>
                </label>
              );
            }

            const value = String(values[field.name] ?? "");
            const baseInputClass =
              "mt-1 w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60";

            return (
              <div key={field.name} className="space-y-1">
                <label
                  htmlFor={inputId}
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={inputId}
                    value={value}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={4}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.name]: event.target.value,
                      }))
                    }
                    className={cn(baseInputClass, "resize-none")}
                  />
                ) : (
                  <input
                    id={inputId}
                    type={field.type}
                    value={value}
                    placeholder={field.placeholder}
                    required={field.required}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.name]: event.target.value,
                      }))
                    }
                    className={baseInputClass}
                  />
                )}
              </div>
            );
          })}

          <div className="pt-1">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950 shadow shadow-emerald-500/20 hover:bg-emerald-400"
            >
              {submitLabel}
            </button>
          </div>
        </form>

        {submitted && (
          <div className="mt-4 rounded-lg border border-border/50 bg-background/40 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Submitted payload
            </div>
            <pre className="mt-2 overflow-auto rounded-md bg-muted/30 p-2 text-xs text-foreground">
              {JSON.stringify(submitted, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  },
);

Form.displayName = "Form";
