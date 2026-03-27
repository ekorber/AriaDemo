import { Message, ScoreUpdate, Lead } from "../types";

export async function streamMessage(
  messages: Message[],
  onChunk: (text: string) => void,
  onScoreUpdate: (update: ScoreUpdate) => void,
  onHandoff: (lead: Lead) => void
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

      // Process score_update tags
      const scoreRegex = /<score_update>([\s\S]*?)<\/score_update>/g;
      let match: RegExpExecArray | null;

      while ((match = scoreRegex.exec(buffer)) !== null) {
        try {
          const update: ScoreUpdate = JSON.parse(match[1]);
          onScoreUpdate(update);
        } catch {
          // ignore malformed score updates
        }
      }

      // Strip score_update tags from display text
      const cleanText = buffer.replace(
        /<score_update>[\s\S]*?<\/score_update>/g,
        ""
      );

      // Check for handoff JSON
      const handoffMatch = cleanText.match(
        /\{"event"\s*:\s*"handoff_triggered"\s*,\s*"lead"\s*:\s*\{[\s\S]*?\}\s*\}/
      );

      if (handoffMatch) {
        try {
          const handoffData = JSON.parse(handoffMatch[0]);
          const textBeforeHandoff = cleanText
            .substring(0, cleanText.indexOf(handoffMatch[0]))
            .trim();
          if (textBeforeHandoff) {
            onChunk(textBeforeHandoff);
          }
          onHandoff(handoffData.lead);
        } catch {
          onChunk(cleanText);
        }
      } else {
        // Strip any partial score_update tags at the end of buffer
        const partialTagIndex = cleanText.lastIndexOf("<score_update>");
        if (
          partialTagIndex !== -1 &&
          !cleanText.includes("</score_update>", partialTagIndex)
        ) {
          onChunk(cleanText.substring(0, partialTagIndex));
        } else {
          onChunk(cleanText);
        }
      }
    }

    // Process any remaining buffer
    const finalClean = buffer
      .replace(/<score_update>[\s\S]*?<\/score_update>/g, "")
      .replace(
        /\{"event"\s*:\s*"handoff_triggered"\s*,\s*"lead"\s*:\s*\{[\s\S]*?\}\s*\}/,
        ""
      )
      .trim();

    if (finalClean && finalClean !== buffer) {
      onChunk(finalClean);
    }
  } catch (error) {
    console.error("Stream error:", error);
    onChunk("Connection error. Please check your network and try again.");
  }
}
