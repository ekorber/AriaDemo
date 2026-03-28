import { Message, ScoreUpdate, Lead } from "../types";

export async function streamMessage(
  messages: Message[],
  onChunk: (text: string) => void,
  onScoreUpdate: (update: ScoreUpdate) => void,
  onHandoff: (lead: Lead) => void,
  leadId?: string | null
): Promise<void> {
  try {
    const response = await fetch("/api/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        lead_id: leadId ?? undefined,
      }),
    });

    if (!response.ok) {
      onChunk("Sorry, something went wrong. Please try again.");
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onChunk("Sorry, streaming is not supported.");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      emitSafe(buffer, onChunk, onScoreUpdate, onHandoff, false);
    }

    // Final pass — flush everything
    emitSafe(buffer, onChunk, onScoreUpdate, onHandoff, true);
  } catch (error) {
    console.error("Stream error:", error);
    onChunk("Connection error. Please check your network and try again.");
  }
}

function emitSafe(
  buffer: string,
  onChunk: (text: string) => void,
  onScoreUpdate: (update: ScoreUpdate) => void,
  onHandoff: (lead: Lead) => void,
  isFinal: boolean
) {
  // 1. Extract and fire complete score_update tags
  const scoreRegex = /<score_update>([\s\S]*?)<\/score_update>/g;
  let match: RegExpExecArray | null;
  while ((match = scoreRegex.exec(buffer)) !== null) {
    try {
      const update: ScoreUpdate = JSON.parse(match[1]);
      onScoreUpdate(update);
    } catch {
      // ignore malformed
    }
  }

  // 2. Strip complete score_update tags
  let display = buffer.replace(/<score_update>[\s\S]*?<\/score_update>/g, "");

  // 3. Check for handoff JSON
  const handoffRegex =
    /\{"event"\s*:\s*"handoff_triggered"\s*,\s*"lead"\s*:\s*\{[\s\S]*?\}\s*\}/;
  const handoffMatch = display.match(handoffRegex);

  if (handoffMatch) {
    try {
      const handoffData = JSON.parse(handoffMatch[0]);
      const textBefore = display
        .substring(0, display.indexOf(handoffMatch[0]))
        .trim();
      if (textBefore) onChunk(textBefore);
      onHandoff(handoffData.lead);
      return;
    } catch {
      // incomplete handoff JSON — hold it back below
    }
  }

  // 4. Hold back anything that looks like the start of metadata
  if (!isFinal) {
    // Any remaining < in display is metadata (this app has no user-facing angle brackets).
    // Truncate from the first remaining < onward.
    const anyTag = display.indexOf("<");
    if (anyTag !== -1) {
      display = display.substring(0, anyTag);
    }

    // Hold back partial handoff JSON
    const handoffStart = display.search(/\{\s*"event"/);
    if (handoffStart !== -1) {
      display = display.substring(0, handoffStart);
    }
  }

  if (display.trim()) {
    onChunk(display.trim());
  }
}
