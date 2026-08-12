import { completeJson } from "../groq";
import { IntakeInput, IntakeOutput } from "../schemas";

/**
 * Intake Agent.
 * Parses a free-form product description / invoice / spec sheet into the
 * structured fields the classifier needs. Pure function: structured in →
 * structured out, Zod-validated.
 */
export async function runIntake(
  input: IntakeInput,
): Promise<IntakeOutput> {
  const parsed = IntakeInput.parse(input);

  const system = [
    "You are the Intake Agent in a trade-compliance pipeline for Indian exporters.",
    "Extract structured product facts from the user's description and any supplied invoice/spec text.",
    "Do NOT guess an HS code — that is a later step. Only extract observable product facts.",
    "If a field is genuinely unknown, use a concise best-effort value derived from context; never invent specifics.",
    "Return ONLY a JSON object with keys: material, function, use_case, origin_country, dest_country, attributes (object of string->string), notes.",
  ].join(" ");

  const user = JSON.stringify(
    {
      product_description: parsed.productDescription,
      origin_country: parsed.originCountry ?? "unknown",
      dest_country: parsed.destCountry ?? "unknown",
      raw_input: parsed.rawInput,
    },
    null,
    2,
  );

  const out = await completeJson({
    system,
    user,
    schema: IntakeOutput,
    temperature: 0.1,
  });

  // Prefer explicit request-level countries when the model left them unknown.
  if (parsed.originCountry && (!out.origin_country || out.origin_country === "unknown")) {
    out.origin_country = parsed.originCountry;
  }
  if (parsed.destCountry && (!out.dest_country || out.dest_country === "unknown")) {
    out.dest_country = parsed.destCountry;
  }

  return out;
}
