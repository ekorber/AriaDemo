import { useState, useCallback, useRef, useMemo } from "react";
import { useAgent } from "./hooks/useAgent";
import { useLeads } from "./hooks/useLeads";
import { useCampaigns } from "./hooks/useCampaigns";
import { ChatPanel } from "./components/ChatPanel";
import { IntentPanel } from "./components/IntentPanel";
import { PipelineView } from "./components/PipelineView";
import { ContentView } from "./components/ContentView";

type Tab = "chat" | "pipeline" | "content";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const { leads, startChat, updateLead, promoteToHandoff, moveLead } = useLeads();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Campaign state
  const campaignHook = useCampaigns(leads);
  const [initialCampaignId, setInitialCampaignId] = useState<string | null>(null);
  const [initialLeadId, setInitialLeadId] = useState<string | null>(null);

  const campaignLeadIds = useMemo(
    () => new Set(campaignHook.campaigns.map((c) => c.leadId)),
    [campaignHook.campaigns]
  );

  const handleCreateCampaignFromPipeline = useCallback((leadId: string) => {
    setInitialLeadId(leadId);
    setInitialCampaignId(null);
    setActiveTab("content");
  }, []);

  const consumeInitial = useCallback(() => {
    setInitialCampaignId(null);
    setInitialLeadId(null);
  }, []);

  const onChatStart = useCallback(async () => {
    const id = await startChat();
    setActiveChatId(id);
    return id;
  }, [startChat]);

  const qualifiedRef = useRef(false);

  const onScoreUpdate = useCallback(
    (update: { score: number; phase?: string; name?: string | null; project_type?: string; timeline?: string; budget_signal?: "low" | "medium" | "high" }) => {
      if (activeChatId) {
        const fields: Record<string, unknown> = { intent_score: update.score };
        if (update.name !== undefined) fields.name = update.name;
        if (update.project_type) fields.project_type = update.project_type;
        if (update.timeline) fields.timeline = update.timeline;
        if (update.budget_signal) fields.budget_signal = update.budget_signal;

        if (update.phase === "disqualified") {
          fields.status = "unqualified";
          qualifiedRef.current = false;
        } else if (
          !qualifiedRef.current &&
          update.score >= 40 &&
          update.phase &&
          update.phase !== "open"
        ) {
          qualifiedRef.current = true;
          fields.status = "qualified";
        }

        updateLead(activeChatId, fields);
      }
    },
    [updateLead, activeChatId]
  );

  const onHandoff = useCallback(
    (lead: Parameters<typeof promoteToHandoff>[1]) => {
      if (activeChatId) {
        promoteToHandoff(activeChatId, lead);
        setActiveChatId(null);
      }
    },
    [promoteToHandoff, activeChatId]
  );

  const { messages, intentScore, phase, handoffLead, isStreaming, sendMessage, reloadMessages } =
    useAgent(activeChatId, { onChatStart, onScoreUpdate, onHandoff });
  const [chatInput, setChatInput] = useState("");

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Top Bar */}
      <header className="flex items-center px-6 py-3 border-b border-zinc-800">
        <span className="text-sm font-semibold tracking-widest text-zinc-400">
          ARIA
        </span>
        <nav className="flex gap-6 ml-8">
          <button
            onClick={() => { setActiveTab("chat"); reloadMessages(); }}
            className={`text-sm pb-0.5 border-b transition-colors ${
              activeTab === "chat"
                ? "text-white border-white"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`text-sm pb-0.5 border-b transition-colors ${
              activeTab === "pipeline"
                ? "text-white border-white"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setActiveTab("content")}
            className={`text-sm pb-0.5 border-b transition-colors ${
              activeTab === "content"
                ? "text-white border-white"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            Content
          </button>
        </nav>
        <span className="ml-auto text-sm text-zinc-500">Sales Agent</span>
      </header>

      {/* Main Content — all tabs stay mounted to preserve state */}
      <main className={`flex flex-1 overflow-hidden ${activeTab !== "chat" ? "hidden" : ""}`}>
        <div className="flex-1 border-r border-zinc-800">
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            phase={phase}
            sendMessage={sendMessage}
            inputValue={chatInput}
            onInputChange={setChatInput}
          />
        </div>
        <IntentPanel
          intentScore={intentScore}
          phase={phase}
          handoffLead={handoffLead}
        />
      </main>
      <div className={`flex-1 flex flex-col min-h-0 ${activeTab !== "pipeline" ? "hidden" : ""}`}>
        <PipelineView
          leads={leads}
          onMove={moveLead}
          onCreateCampaign={handleCreateCampaignFromPipeline}
          campaignLeadIds={campaignLeadIds}
        />
      </div>
      <div className={`flex-1 flex flex-col min-h-0 ${activeTab !== "content" ? "hidden" : ""}`}>
        <ContentView
          leads={leads}
          campaigns={campaignHook.campaigns}
          getCampaign={campaignHook.getCampaign}
          createCampaign={campaignHook.createCampaign}
          updateCampaignBrief={campaignHook.updateCampaignBrief}
          updateCampaignTone={campaignHook.updateCampaignTone}
          generateContent={campaignHook.generateContent}
          generateImage={campaignHook.generateImage}
          isGenerating={campaignHook.isGenerating}
          isGeneratingImage={campaignHook.isGeneratingImage}
          updatePost={campaignHook.updatePost}
          approvePost={campaignHook.approvePost}
          approveAll={campaignHook.approveAll}
          deletePost={campaignHook.deletePost}
          deleteCampaign={campaignHook.deleteCampaign}
          duplicateCampaign={campaignHook.duplicateCampaign}
          assignPlatform={campaignHook.assignPlatform}
          updateSchedule={campaignHook.updateSchedule}
          initialCampaignId={initialCampaignId}
          initialLeadId={initialLeadId}
          onConsumeInitial={consumeInitial}
        />
      </div>
    </div>
  );
}
