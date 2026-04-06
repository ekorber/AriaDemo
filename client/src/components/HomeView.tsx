interface NavCardProps {
  tab: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onNavigate: (tab: string) => void;
}

function NavCard({ tab, title, description, icon, onNavigate }: NavCardProps) {
  return (
    <button
      onClick={() => onNavigate(tab)}
      className="border border-zinc-800 rounded-lg bg-zinc-900/50 p-5 text-left transition-all hover:border-zinc-600 hover:bg-zinc-900 group"
    >
      <div className="flex items-start gap-3">
        <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors mt-0.5 shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{title}</h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 p-4">
      <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
    </div>
  );
}

function NextStep({ label, description }: { label: string; description: string }) {
  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 px-4 py-3">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
    </div>
  );
}

export function HomeView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-10 py-6 sm:py-10 space-y-8 sm:space-y-10">
        {/* Hero */}
        <div className="text-center py-6 sm:py-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-zinc-100 tracking-tight">
            Aria
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 mt-3 max-w-2xl mx-auto leading-relaxed">
            An AI-powered sales and marketing platform. Aria qualifies leads
            through natural conversation, manages your pipeline, and generates
            multi-platform social content, all from one interface!
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-500">
            <span>A demo by <span className="text-zinc-300">Eric Korber</span> for <span className="text-zinc-300">MetaEngines</span></span>
            <span className="text-zinc-700">·</span>
            <a
              href="https://github.com/ekorber/AriaDemo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>

        {/* Quick Navigation */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
            Get Started
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NavCard
              tab="chat"
              title="Chat with Aria"
              description="Start a conversation with the AI sales agent. It will qualify your lead in real time."
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              }
              onNavigate={onNavigate}
            />
            <NavCard
              tab="pipeline"
              title="View Pipeline"
              description="See your leads on a Kanban board from first contact through qualification to close."
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              }
              onNavigate={onNavigate}
            />
            <NavCard
              tab="content"
              title="Create Content"
              description="Generate AI-written social posts for Instagram, X, Facebook, Threads, and LinkedIn."
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              }
              onNavigate={onNavigate}
            />
          </div>
        </section>

        {/* Features */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
            Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FeatureCard
              title="Conversational Lead Qualification"
              description="An AI sales agent chats with prospects, scores intent in real time across four dimensions (project clarity, timeline, budget signals, decision authority), and hands off qualified leads automatically."
            />
            <FeatureCard
              title="Industry Archetypes"
              description="Swap between pre-built business personas (music studio, dental practice, real estate agency, SaaS company), each with tailored conversation flows, scoring rubrics, and handoff scripts."
            />
            <FeatureCard
              title="Lead Pipeline"
              description="A drag-and-drop Kanban board tracks leads from first contact through qualification to handoff and close. Click any card to view full conversation history and lead details."
            />
            <FeatureCard
              title="Social Content Engine"
              description="Create campaigns for handed-off leads, set a brief and tone, then generate AI-written posts for Instagram, X, Facebook, Threads, and LinkedIn. Includes AI image generation, scheduling, and an approval workflow."
            />
          </div>
        </section>

        {/* Architecture & Next Steps side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Architecture — 2 cols */}
          <section className="lg:col-span-2 space-y-4">
            <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
              Architecture
            </h2>
            <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 p-5 space-y-3 text-sm text-zinc-400 leading-relaxed">
              <div>
                <span className="text-zinc-500 font-mono text-xs">Frontend</span>
                <p className="mt-0.5">React + TypeScript SPA built with Vite, styled with Tailwind CSS. State is preserved across tabs for a seamless experience.</p>
              </div>
              <div>
                <span className="text-zinc-500 font-mono text-xs">Backend</span>
                <p className="mt-0.5">Django with streaming SSE endpoints for real-time chat. MongoDB for persistence. Serves the built React app in production.</p>
              </div>
              <div>
                <span className="text-zinc-500 font-mono text-xs">AI Layer</span>
                <p className="mt-0.5">Claude API powers the sales agent (with structured intent scoring via tool use) and the content generation engine (multi-platform posts). OpenAI API handles image generation via DALL-E.</p>
              </div>
              <div>
                <span className="text-zinc-500 font-mono text-xs">Infra</span>
                <p className="mt-0.5">Docker Compose for containerized deployment. The frontend is compiled into static assets served by Django, so no separate frontend container is needed.</p>
              </div>
            </div>
          </section>

          {/* Next Steps — 3 cols */}
          <section className="lg:col-span-3 space-y-4">
            <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
              Sensible Next Steps
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <NextStep
                label="Email / SMS Sequences"
                description="Auto-generate follow-up drip campaigns for leads at each pipeline stage."
              />
              <NextStep
                label="Analytics Dashboard"
                description="Track conversion rates, time-to-handoff, score distributions, and content engagement."
              />
              <NextStep
                label="CRM Integration"
                description="Push qualified leads and handoff notes to HubSpot, Salesforce, or Pipedrive."
              />
              <NextStep
                label="Booking or Full Sales Agent"
                description="Embed calendar links for prospect self-booking, or extend Aria into a full end-to-end sales agent that manages the entire sales process autonomously."
              />
              <NextStep
                label="A/B Archetype Tuning"
                description="Experiment with greeting styles, scoring thresholds, and handoff timing per industry."
              />
              <NextStep
                label="Multi-Language Support"
                description="Extend the sales agent and content engine to multiple languages."
              />
              <NextStep
                label="Content Calendar & Publishing"
                description="Publish approved posts directly via social platform APIs with a unified calendar."
              />
              <NextStep
                label="Video Platform Support"
                description="Generate and edit video posts, along with TikTok and Youtube as added platforms to post to."
              />
            </div>
          </section>
        </div>

        <div className="pb-6" />
      </div>
    </div>
  );
}
