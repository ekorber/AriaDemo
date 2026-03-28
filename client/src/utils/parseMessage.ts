export interface MessagePart {
  type: "text" | "info";
  value: string;
}

function summarizeScoreUpdate(json: Record<string, unknown>): string {
  if (json.score != null) return `Intent score updated to ${json.score}`;
  return "Lead record updated";
}

function summarizeEventJson(json: Record<string, unknown>): string {
  const event = json.event as string | undefined;
  if (event === "handoff_triggered") {
    const lead = json.lead as Record<string, unknown> | undefined;
    const name = lead?.name ? ` for ${lead.name}` : "";
    return `Handoff triggered${name}`;
  }
  return event ? `${event.replace(/_/g, " ")} event` : "System event";
}

const EVENT_MARKER = '{"event":"handoff_triggered"';

function extractHandoffEvent(text: string): [string, Record<string, unknown>] | null {
  const idx = text.indexOf(EVENT_MARKER);
  if (idx === -1) return null;
  try {
    const parsed = JSON.parse(text.slice(idx));
    return [text.slice(0, idx), parsed as Record<string, unknown>];
  } catch {
    return [text.slice(0, idx), { event: "handoff_triggered" }];
  }
}

/** Push a text segment, extracting any handoff JSON from it. */
function pushTextSegment(text: string, parts: MessagePart[]) {
  const extracted = extractHandoffEvent(text);
  if (extracted) {
    const [textBefore, json] = extracted;
    if (textBefore.trim()) parts.push({ type: "text", value: textBefore.trim() });
    parts.push({ type: "info", value: summarizeEventJson(json) });
  } else if (text.trim()) {
    parts.push({ type: "text", value: text.trim() });
  }
}

/** Split message content into text and info-event segments. */
export function parseMessageParts(content: string): MessagePart[] {
  const tagPattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
  const parts: MessagePart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(tagPattern)) {
    const before = content.slice(lastIndex, match.index);
    pushTextSegment(before, parts);

    const tag = match[1];
    const inner = match[2].trim();
    let summary: string;
    if (tag === "score_update") {
      try {
        summary = summarizeScoreUpdate(JSON.parse(inner));
      } catch {
        summary = "Lead record updated";
      }
    } else {
      summary = `${tag} event`;
    }
    parts.push({ type: "info", value: summary });
    lastIndex = match.index! + match[0].length;
  }

  pushTextSegment(content.slice(lastIndex), parts);

  // Sort info parts so score updates appear before handoff events
  const textParts = parts.filter((p) => p.type === "text");
  const infoParts = parts.filter((p) => p.type === "info");
  infoParts.sort((a, b) => {
    const aIsHandoff = a.value.startsWith("Handoff") ? 1 : 0;
    const bIsHandoff = b.value.startsWith("Handoff") ? 1 : 0;
    return aIsHandoff - bIsHandoff;
  });

  const sorted = [...textParts, ...infoParts];
  return sorted.length ? sorted : [{ type: "text", value: content }];
}
