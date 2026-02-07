import { components, tools } from "@/lib/tambo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TamboProvider } from "@tambo-ai/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import "../styles/globals.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <TamboProvider
      apiKey={import.meta.env.VITE_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      tamboUrl={import.meta.env.VITE_TAMBO_URL}
    >
      <div className="relative min-h-screen bg-background text-foreground selection:bg-emerald-500/30 transition-colors antialiased font-[family-name:var(--font-geist-sans)]">
        <ThemeToggle className="fixed right-4 top-4 z-20" />
        <Outlet />
      </div>
    </TamboProvider>
  );
}
