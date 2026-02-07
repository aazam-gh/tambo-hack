function resolveTheme(stored, systemPrefersDark) {
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return systemPrefersDark ? "dark" : "light";
}

(function () {
  let systemPrefersDark = false;
  try {
    systemPrefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    systemPrefersDark = false;
  }

  let theme = systemPrefersDark ? "dark" : "light";

  try {
    const stored = localStorage.getItem("theme");
    theme = resolveTheme(stored, systemPrefersDark);
  } catch {
    // Ignore unavailable localStorage access.
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
})();
