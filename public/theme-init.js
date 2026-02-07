(function () {
  try {
    const stored = localStorage.getItem("theme");
    const mql =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    const systemPrefersDark = mql ? mql.matches : false;

    const theme =
      stored === "light" || stored === "dark"
        ? stored
        : systemPrefersDark
          ? "dark"
          : "light";

    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  } catch {
    // Ignore unavailable localStorage access.
  }
})();
