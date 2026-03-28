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
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-zinc-600 text-sm">
            Start a conversation with Aria...
          </p>
        </div>
      )}
      {messages.map((message) => {
        const parts = parseMessageParts(message.content);
        return (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[80%] space-y-1">
              <div
                className={
                  message.role === "user"
                    ? "bg-zinc-800 rounded-2xl px-4 py-2.5 text-zinc-100"
                    : "text-zinc-300 py-1"
                }
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {parts
                    .filter((p) => p.type === "text")
                    .map((p, i) => (
                      <span key={i}>{p.value}</span>
                    ))}
                  {message.role === "assistant" && message.content === "" && (
                    <span className="inline-block w-1.5 h-4 bg-zinc-500 animate-pulse ml-0.5" />
                  )}
                </p>
              </div>
              {parts
                .filter((p) => p.type === "info")
                .map((p, i) => (
                  <div
                    key={i}
                    className="text-xs italic text-zinc-500 border-l-2 border-zinc-700 pl-2 py-0.5"
                  >
                    {p.value}
                  </div>
                ))}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
