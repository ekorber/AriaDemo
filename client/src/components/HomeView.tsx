export function HomeView() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-10 py-10 space-y-10">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Aria
          </h1>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            An AI-powered sales and marketing platform. Aria qualifies leads
            through natural conversation, manages your pipeline, and generates
            multi-platform social content, all from one interface.
          </p>
        </div>

        {/* Features */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
            Features
          </h2>
          <div className="grid grid-cols-2 gap-3">
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
        <div className="grid grid-cols-5 gap-6">
          {/* Architecture — 2 cols */}
          <section className="col-span-2 space-y-4">
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
          <section className="col-span-3 space-y-4">
            <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
              Sensible Next Steps
            </h2>
            <div className="grid grid-cols-2 gap-2">
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
            </div>
          </section>
        </div>

        <div className="pb-6" />
      </div>
    </div>
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
