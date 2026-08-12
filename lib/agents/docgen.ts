import { z } from "zod";
import { completeText } from "../groq";
import { DocGenInput, DocGenOutput } from "../schemas";

/**
 * Document Generator Agent.
 *
 * Runs LAST, only after the classification is finalized (auto- or
 * human-approved). Drafts commercial-invoice / packing-list / LC language
 * consistent with the approved HS code. Lowest-risk, cosmetic output — but it
 * always carries a disclaimer and never restates unverified duty as fact.
 */
export async function runDocGen(
  input: z.input<typeof DocGenInput>,
): Promise<DocGenOutput> {
  const parsed = DocGenInput.parse(input);

  const disclaimer =
    "DRAFT — machine-generated for review by a licensed customs broker/CHA. " +
    "Verify HS code, scheme eligibility, and duty against current DGFT/CBIC notifications before filing.";

  const documents: DocGenOutput["documents"] = [];

  for (const type of parsed.doc_types) {
    const body = await completeText({
      system: docSystemPrompt(),
      user: docUserPrompt(type, parsed),
      temperature: 0.3,
    });
    documents.push({ type, title: titleFor(type), body: body.trim() });
  }

  return DocGenOutput.parse({ documents, disclaimer });
}

function docSystemPrompt(): string {
  return [
    "You are the Document Generator for a trade-compliance tool serving Indian exporters.",
    "Draft clear, professional export-document language consistent with the approved HS code.",
    "Use only the facts provided. Do not invent duty figures, prices, or quantities that were not given.",
    "Where a value is unknown, insert a clearly bracketed placeholder like [QUANTITY] or [UNIT PRICE].",
    "Output plain text suitable for pasting into the document; no markdown fences.",
  ].join(" ");
}

function docUserPrompt(type: string, d: DocGenInput): string {
  return JSON.stringify(
    {
      document_type: type,
      hs_code: d.hs_code,
      product_description: d.product_description,
      origin_country: d.origin_country,
      dest_country: d.dest_country,
      scheme: d.scheme,
      duty: d.duty,
    },
    null,
    2,
  );
}

function titleFor(type: string): string {
  switch (type) {
    case "commercial_invoice":
      return "Commercial Invoice (draft)";
    case "packing_list":
      return "Packing List (draft)";
    case "lc_language":
      return "Letter of Credit — Goods Description (draft)";
    default:
      return type;
  }
}
