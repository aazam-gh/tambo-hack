import { createRootRoute, Outlet } from '@tanstack/react-router';
import '../styles/globals.css';
import { SensingProvider } from '../components/SensingProvider';
import { VirtualCursor } from '../components/VirtualCursor';
import { VoiceCommandHandler } from '../components/VoiceCommandHandler';
import { SensingStatus } from '../components/SensingStatus';
import { TamboProvider } from '@tambo-ai/react';
import { components, tools } from '@/lib/tambo';

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
      <SensingProvider>
        <div className="antialiased font-[family-name:var(--font-geist-sans)] min-h-screen bg-zinc-950 text-white selection:bg-emerald-500/30">
          <Outlet />
        </div>
        <VirtualCursor />
        <VoiceCommandHandler />
        <SensingStatus />
      </SensingProvider>
    </TamboProvider>
  );
}