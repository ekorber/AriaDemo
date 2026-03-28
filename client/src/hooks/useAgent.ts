import { useState, useCallback, useEffect, useRef } from "react";
import { Message, Lead, IntentPhase, ScoreUpdate } from "../types";
import { streamMessage } from "../services/anthropic";
import * as api from "../services/api";

interface AgentCallbacks {
  onChatStart?: () => Promise<string | void> | string | void;
  onScoreUpdate?: (update: ScoreUpdate) => void;
  onHandoff?: (lead: Lead) => void;
}

export function useAgent(
  leadId: string | null,
  callbacks?: AgentCallbacks
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [intentScore, setIntentScore] = useState(0);
  const [phase, setPhase] = useState<IntentPhase>("open");
  const [handoffLead, setHandoffLead] = useState<Lead | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const initRan = useRef(false);

  // Load existing messages only when resuming a previous session (leadId passed on mount)
  const isNewSession = useRef(false);
  useEffect(() => {
    if (!leadId) return;
    if (isNewSession.current) return; // Skip DB fetch for leads we just created
    api.fetchMessages(leadId).then((msgs) => {
      if (msgs.length > 0) {
        setMessages(msgs);
        setChatStarted(true);
        initRan.current = true;
      }
    });
  }, [leadId]);

  const GREETING = "Hey there! Great to connect with you today. I'm Aria from the studio.\n\nWhat kind of music are you working on right now?";

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    setMessages([{
      id: crypto.randomUUID(),
      role: "assistant",
      content: GREETING,
      createdAt: new Date(),
    }]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming || phase === "handoff") return;

      let effectiveLeadId = leadId;
      if (!chatStarted) {
        setChatStarted(true);
        const result = await callbacks?.onChatStart?.();
        if (result) {
          effectiveLeadId = result;
          isNewSession.current = true;
          // Persist the greeting message that was streamed before the lead existed
          const greeting = messages.find((m) => m.role === "assistant" && m.content);
          if (greeting) {
            api.createMessage(result, "assistant", greeting.content);
          }
        }
      }

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
        callbacks?.onScoreUpdate?.(update);
      };

      const onHandoff = (lead: Lead) => {
        setHandoffLead(lead);
        setPhase("handoff");
        callbacks?.onHandoff?.(lead);
      };

      await streamMessage(updatedMessages, onChunk, onScoreUpdate, onHandoff, effectiveLeadId);
      setIsStreaming(false);
    },
    [messages, isStreaming, phase, leadId]
  );

  const streamingRef = useRef(false);
  streamingRef.current = isStreaming;

  const reloadMessages = useCallback(() => {
    if (!leadId || streamingRef.current) return;
    api.fetchMessages(leadId).then((msgs) => {
      if (msgs.length > 0 && !streamingRef.current) setMessages(msgs);
    });
  }, [leadId]);

  return { messages, intentScore, phase, handoffLead, isStreaming, sendMessage, reloadMessages };
}
