import { createFileRoute } from '@tanstack/react-router';
import { useSensing } from '@/components/SensingProvider';
import { motion } from 'framer-motion';
import { LayoutDashboard, MessageSquare, Fingerprint, Mic, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  MessageInput,
  MessageInputSubmitButton,
  MessageInputTextarea,
  MessageInputToolbar,
} from '@/components/tambo/message-input';
import { ScrollableMessageContainer } from '@/components/tambo/scrollable-message-container';
import {
  ThreadContent,
  ThreadContentMessages,
} from '@/components/tambo/thread-content';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const { handPosition, lastVoiceCommand, hoveredElement } = useSensing();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 border-r border-white/5 bg-zinc-900/50 backdrop-blur-xl flex flex-col items-center py-8 gap-8">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <LayoutDashboard className="text-zinc-950 w-6 h-6" />
        </div>
        <nav className="flex flex-col gap-6">
          <div className="p-2 text-zinc-500 hover:text-white transition-colors cursor-pointer">
            <MessageSquare size={20} />
          </div>
          <div className="p-2 text-zinc-500 hover:text-white transition-colors cursor-pointer">
            <Fingerprint size={20} />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-8 overflow-hidden relative">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Workspace</h1>
            <p className="text-zinc-400 mt-1">Gaze and voice integrated control interface</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-2xl font-mono text-zinc-200">
                <Clock className="w-5 h-5 text-emerald-500" />
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
                {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8 flex-1 min-h-0">
          {/* Left Column: Sensing & Status */}
          <div className="col-span-4 flex flex-col gap-6">
            <section
              data-interactable="sensing-status"
              className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm"
            >
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Fingerprint className="w-4 h-4" />
                Sensing Pipeline
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5">
                  <span className="text-sm text-zinc-300">Gesture Recognition</span>
                  <div className={`w-2 h-2 rounded-full ${handPosition ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5">
                  <span className="text-sm text-zinc-300">Voice Stream</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
              </div>
            </section>

            <section
              data-interactable="voice-logs"
              className="flex-1 p-6 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm flex flex-col min-h-0"
            >
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Voice Command Stream
              </h2>
              <div className="flex-1 overflow-auto space-y-4 pr-2 custom-scrollbar">
                {lastVoiceCommand && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm italic"
                  >
                    "{lastVoiceCommand}"
                  </motion.div>
                )}
                <div className="text-xs text-zinc-600 italic">Listening for system instructions...</div>
              </div>
            </section>
          </div>

          {/* Right Column: AI Workspace */}
          <div className="col-span-8 flex flex-col rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-md overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/40">
              <h2 className="font-semibold flex items-center gap-2 text-zinc-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                AI Assistant Workspace
              </h2>
              {hoveredElement && (
                <div className="text-xs px-3 py-1 rounded-full bg-white/5 text-zinc-400 border border-white/5">
                  Targeting: <span className="text-white">{hoveredElement.getAttribute('data-interactable')}</span>
                </div>
              )}
            </div>

            <ScrollableMessageContainer className="flex-1 p-8">
              <ThreadContent variant="default">
                <ThreadContentMessages />
              </ThreadContent>
            </ScrollableMessageContainer>

            <div className="p-6 bg-zinc-950/40 border-t border-white/5">
              <MessageInput
                contextKey="dashboard-main"
                variant="bordered"
                className="bg-zinc-900/50 border-white/10 focus-within:border-emerald-500/50 transition-colors"
              >
                <MessageInputTextarea
                  placeholder="Tell the AI to analyze current sensing data or control the dashboard..."
                  className="bg-transparent text-white placeholder:text-zinc-600 border-none focus-visible:ring-0"
                />
                <MessageInputToolbar>
                  <MessageInputSubmitButton className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl px-4 py-2 font-medium transition-all" />
                </MessageInputToolbar>
              </MessageInput>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}