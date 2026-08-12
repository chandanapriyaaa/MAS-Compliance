import { NextResponse } from "next/server";
import { IntakeRequest } from "@/lib/schemas";
import { supabaseService } from "@/lib/supabase";
import { enqueueStep } from "@/lib/qstash";
import { logAudit } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/shipment/intake
 * Creates a shipment row, kicks off the Intake step via QStash, and returns
 * the job id immediately. Nothing in the chain is awaited end-to-end.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = IntakeRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const input = parsed.data;

  const svc = supabaseService();
  const { data: shipment, error } = await svc
    .from("shipments")
    .insert({
      product_description: input.product_description,
      origin_country: input.origin_country ?? null,
      dest_country: input.dest_country ?? null,
      classification_status: "pending",
      current_step: "intake",
      raw_input: {
        ...input.raw_input,
        assessable_value: input.assessable_value ?? null,
        currency: input.currency,
        claimed_scheme: input.claimed_scheme,
      },
    })
    .select("id")
    .single();

  if (error || !shipment) {
    return NextResponse.json(
      { error: `Failed to create shipment: ${error?.message}` },
      { status: 500 },
    );
  }

  const jobId = `job_${shipment.id}`;
  await svc.from("shipments").update({ job_id: jobId }).eq("id", shipment.id);
  await logAudit(shipment.id, "intake", "shipment_created", {
    product_description: input.product_description,
  });

  await enqueueStep({
    shipmentId: shipment.id,
    step: "intake",
    context: {},
  });

  return NextResponse.json(
    { job_id: jobId, shipment_id: shipment.id, status: "pending" },
    { status: 202 },
  );
}
