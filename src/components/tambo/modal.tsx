import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import * as React from "react";
import { z } from "zod/v3";

type ModalVariant = "default" | "solid" | "bordered";
type ModalSize = "default" | "sm" | "lg";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const modalVariants = cva("w-full", {
  variants: {
    variant: {
      default: "bg-background",
      solid:
        "bg-muted/40 shadow-lg shadow-zinc-900/10 dark:shadow-zinc-900/20",
      bordered: "border border-border/60 bg-background",
    },
    size: {
      sm: "max-w-sm",
      default: "max-w-md",
      lg: "max-w-2xl",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export const modalSchema = z.object({
  title: z.string().describe("Modal title"),
  body: z.string().describe("Modal body text"),
  defaultOpen: z
    .boolean()
    .optional()
    .describe("Whether the modal starts open (default: false)"),
  triggerLabel: z
    .string()
    .optional()
    .describe("Label for the open button (default: Open)"),
  closeLabel: z
    .string()
    .optional()
    .describe("Label for the close button (default: Close)"),
  variant: z
    .enum(["default", "solid", "bordered"])
    .optional()
    .describe("Visual style variant"),
  size: z
    .enum(["default", "sm", "lg"])
    .optional()
    .describe("Width variant"),
  className: z.string().optional().describe("Additional CSS classes"),
});

export type ModalProps = z.infer<typeof modalSchema>;

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      title,
      body,
      defaultOpen = false,
      triggerLabel = "Open",
      closeLabel = "Close",
      variant,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(defaultOpen);
    const titleId = React.useId();
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const dialogRef = React.useRef<HTMLDivElement | null>(null);
    const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const wasOpenRef = React.useRef(open);

    const onOverlayKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          return;
        }

        if (event.key !== "Tab") {
          return;
        }

        const dialog = dialogRef.current;
        if (!dialog) {
          return;
        }

        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.hasAttribute("disabled"));

        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const activeInside = !!active && dialog.contains(active);

        if (!activeInside) {
          (event.shiftKey ? last : first).focus();
          event.preventDefault();
          return;
        }

        if (event.shiftKey) {
          if (active === first) {
            last.focus();
            event.preventDefault();
          }
          return;
        }

        if (active === last) {
          first.focus();
          event.preventDefault();
        }
      },
      [],
    );

    React.useEffect(() => {
      if (!open) {
        return;
      }

      const focusTimer = window.setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 0);

      return () => {
        window.clearTimeout(focusTimer);
      };
    }, [open]);

    React.useEffect(() => {
      if (wasOpenRef.current && !open) {
        triggerRef.current?.focus();
      }

      wasOpenRef.current = open;
    }, [open]);

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          ref={triggerRef}
          className="inline-flex items-center justify-center rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm hover:bg-muted/40"
        >
          {triggerLabel}
        </button>

        {open && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={onOverlayKeyDown}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setOpen(false);
              }
            }}
          >
            <div
              ref={dialogRef}
              className={cn(
                "w-full rounded-2xl border border-border/60 p-4 text-foreground backdrop-blur",
                modalVariants({ variant, size }),
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div id={titleId} className="text-sm font-semibold tracking-tight">
                    {title}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {body}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  ref={closeButtonRef}
                  className="shrink-0 rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-foreground hover:bg-muted/40"
                >
                  {closeLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

Modal.displayName = "Modal";
