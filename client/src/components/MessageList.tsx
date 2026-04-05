import { useEffect, useRef } from "react";
import { Message } from "../types";
import { parseMessageParts } from "../utils/parseMessage";


interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-zinc-600 text-sm">
            Start a conversation with Aria...
          </p>
        </div>
      )}
      {messages.map((message) => {
        const parts = parseMessageParts(message.content);
        const textParts = parts.filter((p) => p.type === "text");
        const textContent = textParts.map((p) => p.value).join(" ");
        if (!textContent && message.role === "assistant" && message.content !== "") return null;
        return (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] ${
                message.role === "user"
                  ? "bg-zinc-800 rounded-2xl px-4 py-2.5 text-zinc-100"
                  : "text-zinc-300 py-1"
              }`}
            >
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {textParts.map((p, i) => (
                  <span key={i}>
                    {message.role === "assistant"
                      ? p.value.replace(/ — /g, ", ").replace(/ -- /g, ", ")
                      : p.value}
                  </span>
                ))}
                {message.role === "assistant" && message.content === "" && (
                  <span className="inline-block w-1.5 h-4 bg-zinc-500 animate-pulse ml-0.5" />
                )}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
