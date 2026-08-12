import { NextResponse } from "next/server";
import { PipelineStep, StepMessage } from "@/lib/schemas";
import { verifyStepRequest, stepUrl } from "@/lib/qstash";
import { runStep } from "@/lib/pipeline";

export const runtime = "nodejs";
// Give long-running LLM steps headroom on Vercel Pro. Each step is still a
// single hop — QStash chains them, we never await the whole pipeline here.
export const maxDuration = 300;

/**
 * POST /api/agents/[step]
 * QStash delivers each pipeline step here. We verify the signature, then run
 * exactly one step, which enqueues the next.
 */
export async function POST(
  req: Request,
  { params }: { params: { step: string } },
) {
  const stepParse = PipelineStep.safeParse(params.step);
  if (!stepParse.success) {
    return NextResponse.json({ error: "Unknown step" }, { status: 404 });
  }
  const step = stepParse.data;

  const rawBody = await req.text();

  const verified = await verifyStepRequest(rawBody, req.headers, stepUrl(step));
  if (!verified) {
    return NextResponse.json(
      { error: "Invalid or missing signature" },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const msg = StepMessage.safeParse(json);
  if (!msg.success) {
    return NextResponse.json(
      { error: "Invalid step message", details: msg.error.flatten() },
      { status: 422 },
    );
  }

  // Guard: the URL step and the message step must agree.
  if (msg.data.step !== step) {
    return NextResponse.json(
      { error: "Step mismatch between URL and message" },
      { status: 400 },
    );
  }

  try {
    const result = await runStep(
      msg.data.shipmentId,
      msg.data.step,
      msg.data.context,
    );
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // 500 so QStash retries transient failures.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
