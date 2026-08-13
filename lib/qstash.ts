import { Client } from "@upstash/qstash";
import { Receiver } from "@upstash/qstash";
import { env } from "./env";
import type { PipelineStep, StepMessage } from "./schemas";

/**
 * QStash chaining.
 *
 * Each agent step is its own serverless endpoint. On completion a step calls
 * `enqueueStep` to publish the next step's message to QStash, which delivers it
 * back to /api/agents/[step]. This breaks the long chain into independent,
 * signed, retryable invocations — no step is awaited end-to-end.
 *
 * Local-dev fallback: when QStash is not configured (no token), or APP_BASE_URL
 * points at localhost (unreachable from QStash), we POST directly to the next
 * route and do not await it. This keeps the pipeline runnable locally. In that
 * mode signatures are absent, so route handlers accept a shared dev header.
 */

const DEV_TRIGGER_HEADER = "x-dev-pipeline-trigger";

function qstashConfigured(): boolean {
  return Boolean(process.env.QSTASH_TOKEN);
}

function isLocal(url: string): boolean {
  return /localhost|127\.0\.0\.1/.test(url);
}

let _client: Client | null = null;
function client(): Client {
  if (!_client) _client = new Client({ token: env.qstashToken() });
  return _client;
}

export function stepUrl(step: PipelineStep): string {
  const base = env.appBaseUrl().replace(/\/$/, "");
  return `${base}/api/agents/${step}`;
}

export async function enqueueStep(message: StepMessage): Promise<void> {
  const url = stepUrl(message.step);

  // Local / unconfigured: fire-and-forget direct call so the chain still runs.
  if (!qstashConfigured() || isLocal(url)) {
    void directTrigger(url, message);
    return;
  }

  await client().publishJSON({
    url,
    body: message,
    retries: 3,
  });
}

async function directTrigger(url: string, message: StepMessage): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [DEV_TRIGGER_HEADER]: devTriggerSecret(),
      },
      body: JSON.stringify(message),
    });
  } catch (err) {
    // Best-effort in dev; surfaced via server logs.
    console.error(`[qstash:dev] direct trigger to ${url} failed:`, err);
  }
}

function devTriggerSecret(): string {
  // Not a real secret — dev mode only. Reuses the signing key if present, but
  // falls back on an empty/unset key (|| not ??) so the header is never blank.
  return process.env.QSTASH_CURRENT_SIGNING_KEY || "dev-local-trigger";
}

// ── Inbound signature verification (used by route handlers) ────
let _receiver: Receiver | null = null;
function receiver(): Receiver {
  if (!_receiver) {
    _receiver = new Receiver({
      currentSigningKey: env.qstashCurrentSigningKey(),
      nextSigningKey: env.qstashNextSigningKey(),
    });
  }
  return _receiver;
}

/**
 * Verify an inbound step request. Returns true if it is a genuine QStash
 * delivery or an authorised local dev trigger.
 */
export async function verifyStepRequest(
  rawBody: string,
  headers: Headers,
  url: string,
): Promise<boolean> {
  const devHeader = headers.get(DEV_TRIGGER_HEADER);
  if (devHeader && devHeader === devTriggerSecret()) return true;

  const signature = headers.get("upstash-signature");
  if (!signature) return false;

  try {
    return await receiver().verify({ signature, body: rawBody, url });
  } catch {
    return false;
  }
}
