import { Message, IntentPhase } from "../types";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface ChatPanelProps {
  messages: Message[];
  isStreaming: boolean;
  phase: IntentPhase;
  sendMessage: (content: string) => void;
}

export function ChatPanel({ messages, isStreaming, phase, sendMessage }: ChatPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <ChatInput
        onSend={sendMessage}
        disabled={phase === "handoff" || isStreaming}
      />
    </div>
  );
}
