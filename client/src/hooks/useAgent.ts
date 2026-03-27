import { useState, useCallback } from "react";
import { Message, Lead, IntentPhase, ScoreUpdate } from "../types";
import { streamMessage } from "../services/anthropic";

export function useAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [intentScore, setIntentScore] = useState(0);
  const [phase, setPhase] = useState<IntentPhase>("open");
  const [handoffLead, setHandoffLead] = useState<Lead | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming || phase === "handoff") return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date(),
      };

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages([...updatedMessages, assistantMessage]);
      setIsStreaming(true);

      const onChunk = (text: string) => {
        assistantMessage.content = text;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: text }
              : m
          )
        );
      };

      const onScoreUpdate = (update: ScoreUpdate) => {
        setIntentScore(update.score);
        setPhase(update.phase);
      };

      const onHandoff = (lead: Lead) => {
        setHandoffLead(lead);
        setPhase("handoff");
      };

      await streamMessage(updatedMessages, onChunk, onScoreUpdate, onHandoff);
      setIsStreaming(false);
    },
    [messages, isStreaming, phase]
  );

  return { messages, intentScore, phase, handoffLead, isStreaming, sendMessage };
}
