import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Ignore unavailable localStorage access.
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof document === "undefined") {
      return "dark";
    }

    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  });

  const onToggle = React.useCallback(() => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    persistTheme(nextTheme);
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/50",
        "bg-card/60 text-foreground backdrop-blur transition-colors",
        "hover:bg-card/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
        className,
      )}
    >
      {theme === "dark" ? (
        <Sun aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Moon aria-hidden="true" className="h-4 w-4" />
      )}
    </button>
  );
}
