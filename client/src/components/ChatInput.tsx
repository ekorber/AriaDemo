import { useRef, useEffect, useCallback, KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string) => void;
  disabled: boolean;
  sendDisabled?: boolean;
}

export function ChatInput({ value, onChange, onSend, disabled, sendDisabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // On mobile, resize the viewport when the virtual keyboard appears/disappears
  useEffect(() => {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    const handler = () => {
      document.documentElement.style.setProperty("--vvh", `${vv.height}px`);
    };
    handler();
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
  }, []);

  const ended = disabled && value === "";

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || ended || sendDisabled) return;
    // Keep reference to textarea before async operations
    const textarea = textareaRef.current;
    onSend(trimmed);
    onChange("");
    // Re-focus immediately and after React re-render to keep mobile keyboard open
    textarea?.focus();
    requestAnimationFrame(() => textarea?.focus());
  }, [value, ended, sendDisabled, onSend, onChange]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="shrink-0 border-t border-zinc-800 px-3 sm:px-4 py-3" style={{ paddingBottom: `max(0.75rem, env(safe-area-inset-bottom))` }}>
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={ended}
          placeholder={ended ? "Conversation ended" : "Message Aria..."}
          rows={1}
          inputMode="text"
          enterKeyHint="send"
          autoComplete="off"
          className={`flex-1 resize-none bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 ${ended ? "opacity-40 cursor-not-allowed" : ""}`}
        />
        <button
          onPointerDown={(e) => e.preventDefault()}
          onClick={handleSubmit}
          disabled={ended || sendDisabled || !value.trim()}
          className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm text-zinc-100 transition-colors select-none"
        >
          Send
        </button>
      </div>
    </div>
  );
}
