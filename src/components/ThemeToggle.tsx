import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

function resolveTheme(stored: string | null): Theme {
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  let systemPrefersDark = false;
  try {
    systemPrefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    systemPrefersDark = false;
  }
  return systemPrefersDark ? "dark" : "light";
}

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }

    return null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
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

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "theme") {
        return;
      }

      const next = resolveTheme(e.newValue);
      applyTheme(next);
      setTheme(next);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    if (typeof window.matchMedia !== "function" || getStoredTheme() !== null) {
      return;
    }

    let mql: MediaQueryList;
    try {
      mql = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return;
    }

    const onChange = () => {
      if (getStoredTheme() !== null) {
        return;
      }

      const next: Theme = mql.matches ? "dark" : "light";
      applyTheme(next);
      setTheme(next);
    };

    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }

    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

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
