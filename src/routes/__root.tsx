import { components, tools } from "@/lib/tambo";
import { InteractionContextProvider } from "@/lib/interaction-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TamboProvider } from "@tambo-ai/react";
import { createRootRoute, Outlet, type ErrorComponentProps } from "@tanstack/react-router";
import "../styles/globals.css";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootError,
});

function RootComponent() {
  return (
    <TamboProvider
      apiKey={import.meta.env.VITE_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      tamboUrl={import.meta.env.VITE_TAMBO_URL}
    >
      <InteractionContextProvider>
        <div className="relative min-h-screen bg-background text-foreground selection:bg-emerald-500/30 transition-colors antialiased font-[family-name:var(--font-geist-sans)]">
          <ThemeToggle className="fixed right-4 top-4 z-20" />
          <Outlet />
        </div>
      </InteractionContextProvider>
    </TamboProvider>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <pre className="max-h-72 overflow-auto rounded-xl border border-border/60 bg-card/70 p-4 text-sm text-muted-foreground">
          {error.stack ?? error.message}
        </pre>
        <button
          type="button"
          onClick={reset}
          className="w-fit rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
