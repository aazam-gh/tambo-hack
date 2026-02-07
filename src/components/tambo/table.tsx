import * as React from "react";
import { z } from "zod/v3";

import { cn } from "@/lib/utils";

const tableColumnSchema = z.object({
  key: z.string().describe("Key in each row object"),
  label: z.string().optional().describe("Human-friendly column label"),
});

export const tableSchema = z.object({
  title: z.string().describe("Title shown above the table"),
  columns: z
    .array(tableColumnSchema)
    .min(1)
    .max(8)
    .describe("Ordered list of table columns"),
  rows: z
    .array(z.record(z.union([z.string(), z.number()])))
    .min(1)
    .max(20)
    .describe("Row objects keyed by column key"),
  className: z.string().optional().describe("Additional CSS classes"),
});

export type TableProps = z.infer<typeof tableSchema>;

export const Table = React.forwardRef<HTMLDivElement, TableProps>(
  ({ title, columns, rows, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-4 text-foreground shadow-sm backdrop-blur",
          className,
        )}
      >
        <div className="text-sm font-semibold tracking-tight">{title}</div>
        <div className="mt-3 overflow-hidden rounded-xl border border-border/50 bg-background/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="px-3 py-2 font-semibold uppercase tracking-wider"
                  >
                    {c.label ?? c.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "border-t border-border/40",
                    idx % 2 === 0 ? "bg-background/20" : "bg-background/10",
                  )}
                >
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-muted-foreground">
                      {row[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  },
);

Table.displayName = "Table";
