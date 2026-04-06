import { Message, IntentPhase } from "../types";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface ChatPanelProps {
  messages: Message[];
  isStreaming: boolean;
  phase: IntentPhase;
  sendMessage: (content: string) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
}

export function ChatPanel({ messages, isStreaming, phase, sendMessage, inputValue, onInputChange }: ChatPanelProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <MessageList messages={messages} />
      <ChatInput
        value={inputValue}
        onChange={onInputChange}
        onSend={sendMessage}
        disabled={phase === "handoff"}
      />
    </div>
  );
}
