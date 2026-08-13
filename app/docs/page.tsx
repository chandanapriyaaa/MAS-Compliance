import type { Metadata } from "next";
import { DocsShell, type DocSection } from "@/components/docs/DocsShell";
import { Pill } from "@/components/ui/StatusPill";

export const metadata: Metadata = {
  title: "Documentation — Trade Compliance Copilot",
  description:
    "Architecture, agent pipeline, data model, API reference, and operations for the Trade Compliance Copilot.",
};

const SECTIONS: DocSection[] = [
  { id: "overview", title: "Overview" },
  { id: "principles", title: "Design principles" },
  { id: "architecture", title: "System architecture" },
  { id: "pipeline", title: "Agent pipeline" },
  { id: "confidence", title: "Confidence & escalation" },
  { id: "rag", title: "Retrieval & citations" },
  { id: "data-model", title: "Data model" },
  { id: "api", title: "API reference" },
  { id: "security", title: "Security & compliance" },
  { id: "operations", title: "Operations & deployment" },
  { id: "configuration", title: "Configuration" },
  { id: "roadmap", title: "Roadmap" },
  { id: "credits", title: "Credits" },
];

export default function DocsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <Pill tone="blue">Documentation · v0.1</Pill>
        <h1 className="text-[34px] font-semibold tracking-tight text-label">
          Trade Compliance Copilot
        </h1>
        <p className="max-w-2xl text-[16px] leading-relaxed text-label-secondary">
          A multi-agent decision-support system for Indian exporters and Customs
          House Agents. It classifies HS codes, cross-checks DGFT scheme
          eligibility, computes duty, and drafts compliant documentation, with a
          hard human-in-the-loop guardrail on every low-confidence output.
        </p>
      </header>

      <DocsShell sections={SECTIONS}>
        <article className="prose-docs space-y-14">
          <Section id="overview" title="Overview">
            <P>
              The Copilot ingests a free-form product description, invoice, or
              spec sheet and returns a fully-reasoned trade classification: an
              HS code with a calibrated confidence score, DGFT scheme
              eligibility (RoDTEP / drawback / advance authorization), an
              itemised duty computation, and draft export paperwork. Every
              output carries provenance and a confidence score; anything below
              the configured threshold is routed to a human review queue rather
              than auto-filed.
            </P>
            <Callout tone="amber" title="Non-negotiable design rule">
              No HS classification or duty figure is auto-approved below the
              confidence threshold (default 0.85). This is a compliance tool:
              wrong output has real financial and legal consequence, so the
              system escalates instead of guessing.
            </Callout>
          </Section>

          <Section id="principles" title="Design principles">
            <UL>
              <LI><B>Grounded, not generative.</B> Classifications cite retrieved HS-schedule sources; reference rates (scheme, duty) are looked up deterministically, never produced by the model.</LI>
              <LI><B>Derived confidence.</B> Confidence comes from retrieval strength and cross-sample agreement, not the model&rsquo;s self-report.</LI>
              <LI><B>Human-in-the-loop by default.</B> Low-confidence and scheme-mismatch cases escalate to a review queue; documents are drafted only after finalization.</LI>
              <LI><B>Auditable.</B> Every agent decision is written to an append-only audit log that is searchable org-wide.</LI>
              <LI><B>Asynchronous & serverless-safe.</B> The agent chain is decomposed into independent, signed, retryable steps; no request awaits the full pipeline.</LI>
            </UL>
          </Section>

          <Section id="architecture" title="System architecture">
            <P>
              The frontend and API are a Next.js 14 (App Router) application. The
              agent chain runs as discrete serverless steps coordinated by
              Upstash QStash; state and evidence persist in Supabase (Postgres +
              pgvector). LLM inference is served by Groq; embeddings by Google
              Gemini.
            </P>
            <Code>{`POST /api/shipment/intake
    → create shipment row (Supabase)
    → enqueue "intake" (QStash) → return job_id (202)

        each step is one signed serverless invocation:
  intake → classify → crosscheck → duty → escalate → docgen
     │        │           │          │        │         │
     └──── writes results + audit_log to Supabase ──────┘
                                     │
                          aggregate confidence
                   ┌─────────────────┴──────────────────┐
              ≥ threshold                          < threshold
              auto_approved                        needs_review
                   │                                    │
                docgen                        human_review_queue
                                                (review dashboard)`}</Code>
            <Table
              head={["Layer", "Technology"]}
              rows={[
                ["Frontend / API", "Next.js 14 App Router (Vercel-ready)"],
                ["LLM inference", "Groq (Llama 3.3 70B, configurable)"],
                ["Embeddings", "Google Gemini gemini-embedding-001 (1024-dim)"],
                ["Orchestration", "Upstash QStash (signed step chaining)"],
                ["Database + RAG", "Supabase Postgres + pgvector"],
                ["Job state", "Upstash Redis"],
              ]}
            />
          </Section>

          <Section id="pipeline" title="Agent pipeline">
            <P>
              Each agent is one typed, Zod-validated function. Inputs and outputs
              are strict schemas, so a malformed model response fails loudly
              rather than corrupting downstream steps.
            </P>
            <Table
              head={["Agent", "Responsibility", "Output"]}
              rows={[
                ["Intake", "Parse description / invoice / spec into structured facts", "material, function, use-case, route"],
                ["HS Classification", "RAG retrieval + LLM; derive calibrated confidence", "hs_code, confidence, reasoning, sources"],
                ["Cross-Check", "DGFT scheme eligibility; flag claimed-vs-actual mismatch", "scheme_eligible, rates, flags"],
                ["Duty Calculator", "BCD + social-welfare surcharge + IGST from reference rates", "duty_amount, rate, breakdown"],
                ["Confidence Gate", "Aggregate (min) confidence; auto-approve or escalate", "decision, aggregate_confidence"],
                ["Doc Generator", "Draft invoice / packing-list / LC after finalization", "documents[], disclaimer"],
              ]}
            />
          </Section>

          <Section id="confidence" title="Confidence & escalation">
            <P>
              An LLM stating &ldquo;90% confident&rdquo; is not a probability. The
              classifier derives confidence from three signals:
            </P>
            <UL>
              <LI><B>Retrieval strength</B> — top cosine similarity of supporting HS-schedule sources.</LI>
              <LI><B>Sample agreement</B> — how often N independent samples converge on the same code.</LI>
              <LI><B>Self-report</B> — a minor nudge only.</LI>
            </UL>
            <P>
              Retrieval is sufficiency-constrained: if the evidence is too weak,
              the agent refuses to classify and escalates. The Confidence Gate
              aggregates by taking the <B>minimum</B> across steps — the chain is
              only as trustworthy as its weakest link — and routes anything below
              threshold, or any claimed-scheme mismatch, to human review.
            </P>
          </Section>

          <Section id="rag" title="Retrieval & citations">
            <P>
              The HS schedule and past rulings are embedded into a pgvector store
              (<Mono>hs_code_docs</Mono>). At classification time the query is
              embedded and matched via the <Mono>match_hs_docs</Mono> RPC
              (cosine similarity). The retrieved sources — code, title, and
              similarity — are persisted on the classification and surfaced in
              the shipment drawer as citations, so every decision is traceable to
              the evidence it stands on.
            </P>
          </Section>

          <Section id="data-model" title="Data model">
            <Table
              head={["Table", "Purpose"]}
              rows={[
                ["shipments", "One row per intake; raw input, structured intake, live status"],
                ["classifications", "Evolving record: hs_code, confidence, scheme, duty, documents"],
                ["human_review_queue", "Escalation target for low-confidence / flagged cases"],
                ["audit_log", "Append-only trail of every agent step and decision"],
                ["hs_code_docs", "pgvector RAG store (HS schedule + rulings)"],
                ["scheme_rates / duty_rates", "Reference rates keyed by HS prefix"],
              ]}
            />
            <Callout tone="amber" title="Reference data scope">
              The seed HS/scheme/duty tables are an illustrative dataset
              (tagged <Mono>ILLUSTRATIVE-SEED</Mono>). Real logic flows through
              them, but they must be replaced with the authoritative ITC-HS,
              RoDTEP/Drawback, and Customs Tariff schedules before production use.
            </Callout>
          </Section>

          <Section id="api" title="API reference">
            <Table
              head={["Method / Path", "Description"]}
              rows={[
                ["POST /api/shipment/intake", "Create a shipment and start the pipeline; returns job_id"],
                ["GET /api/shipment/[id]/status", "Live pipeline status for one shipment"],
                ["GET /api/shipment/[id]/logs", "Full audit trail + classification for the drawer"],
                ["GET /api/shipments", "Recent shipments joined with classification"],
                ["POST /api/agents/[step]", "QStash-delivered agent step (signature-verified)"],
                ["POST /api/review/[id]/resolve", "Human approve/reject a review-queue item"],
                ["GET /api/audit", "Org-wide audit-log search (query, level filters)"],
              ]}
            />
          </Section>

          <Section id="security" title="Security & compliance">
            <UL>
              <LI><B>Signed steps.</B> Every inbound agent step verifies its QStash signature; unsigned requests are rejected (401).</LI>
              <LI><B>Least privilege.</B> The browser uses the publishable key under Row-Level Security; the service (secret) key stays server-side for the pipeline.</LI>
              <LI><B>Secrets hygiene.</B> No credentials are committed; <Mono>.env.local</Mono> is gitignored and secrets are provided via the deployment environment.</LI>
              <LI><B>Audit trail.</B> The append-only <Mono>audit_log</Mono> is the compliance evidence record and is searchable across all shipments.</LI>
              <LI><B>Human accountability.</B> Review decisions (approve / reject, corrected code, notes) are recorded against the reviewer.</LI>
            </UL>
          </Section>

          <Section id="operations" title="Operations & deployment">
            <P>Recommended deployment is Vercel + managed Supabase + Upstash:</P>
            <OL>
              <LI>Provision Supabase; run the migrations in <Mono>supabase/migrations</Mono>.</LI>
              <LI>Seed the RAG store and reference tables (<Mono>npm run seed:hs</Mono>).</LI>
              <LI>Set all environment variables in the deployment target.</LI>
              <LI>Point <Mono>APP_BASE_URL</Mono> at the deployment so QStash callbacks resolve; configure QStash signing keys.</LI>
              <LI>Run the evaluation set end-to-end before go-live (<Mono>npm run eval:classify</Mono>).</LI>
            </OL>
            <P>
              Locally, when QStash is unconfigured, the pipeline chains via direct
              fire-and-forget calls between steps so it remains fully runnable.
            </P>
          </Section>

          <Section id="configuration" title="Configuration">
            <Table
              head={["Variable", "Purpose"]}
              rows={[
                ["GROQ_API_KEY / GROQ_MODEL", "LLM inference"],
                ["SUPABASE_URL / SECRET / PUBLISHABLE", "Database + auth"],
                ["EMBEDDING_PROVIDER / _API_KEY / _MODEL", "RAG embeddings (gemini / openai)"],
                ["QSTASH_TOKEN / *_SIGNING_KEY", "Step chaining + signature verification"],
                ["UPSTASH_REDIS_REST_URL / _TOKEN", "Job state"],
                ["CONFIDENCE_THRESHOLD", "Auto-approval bar (default 0.85)"],
                ["APP_BASE_URL", "Public URL for QStash callbacks"],
              ]}
            />
          </Section>

          <Section id="roadmap" title="Roadmap">
            <UL>
              <LI>Authoritative ITC-HS / DGFT / CBIC data ingestion with a scheduled refresh.</LI>
              <LI>Confidence calibration against outcome data.</LI>
              <LI>Authenticated reviewer accounts and role-based access.</LI>
              <LI>Realtime status via Supabase Realtime.</LI>
              <LI>Bulk intake and ERP integration.</LI>
            </UL>
          </Section>

          <Section id="credits" title="Credits">
            <P>
              Designed and developed by <B>Korada Chandana Priya</B>.
            </P>
            <P className="text-label-tertiary">
              Built with Next.js, Supabase, Groq, Google Gemini, and Upstash.
              This documentation describes v0.1 of the platform.
            </P>
          </Section>
        </article>
      </DocsShell>
    </div>
  );
}

// ── inline doc primitives ──────────────────────────────────────
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 text-[24px] font-semibold tracking-tight text-label">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[15px] leading-relaxed text-label-secondary ${className ?? ""}`}>{children}</p>;
}
function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-label">{children}</strong>;
}
function Mono({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-[var(--fill-tertiary)] px-1.5 py-0.5 font-mono text-[12px] text-label">{children}</code>;
}
function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-label-secondary marker:text-label-tertiary">{children}</ul>;
}
function OL({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-label-secondary marker:text-label-tertiary">{children}</ol>;
}
function LI({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}
function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-separator bg-surface p-4 font-mono text-[12px] leading-relaxed text-label-secondary">
      {children}
    </pre>
  );
}
function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-separator">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-surface text-[11px] uppercase tracking-wide text-label-tertiary">
          <tr>{head.map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-separator/60">
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-2.5 ${j === 0 ? "font-medium text-label" : "text-label-secondary"}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Callout({ tone, title, children }: { tone: "amber" | "blue"; title: string; children: React.ReactNode }) {
  const c = tone === "amber" ? "var(--amber)" : "var(--blue)";
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: `color-mix(in srgb, ${c} 35%, transparent)`,
        background: `color-mix(in srgb, ${c} 8%, transparent)`,
      }}
    >
      <p className="text-[13px] font-semibold text-label">{title}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-label-secondary">{children}</p>
    </div>
  );
}
