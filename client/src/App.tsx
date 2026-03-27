import { useAgent } from "./hooks/useAgent";
import { ChatPanel } from "./components/ChatPanel";
import { IntentPanel } from "./components/IntentPanel";

export default function App() {
  const { messages, intentScore, phase, handoffLead, isStreaming, sendMessage } =
    useAgent();

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800">
        <span className="text-sm font-semibold tracking-widest text-zinc-400">
          ARIA
        </span>
        <span className="text-sm text-zinc-500">
          Sales Agent
        </span>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 border-r border-zinc-800">
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            phase={phase}
            sendMessage={sendMessage}
          />
        </div>
        <IntentPanel
          intentScore={intentScore}
          phase={phase}
          handoffLead={handoffLead}
        />
      </main>
    </div>
  );
}
