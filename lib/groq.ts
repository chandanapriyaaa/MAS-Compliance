import Groq from "groq-sdk";
import { z } from "zod";
import { env } from "./env";

/**
 * Thin Groq wrapper.
 *
 * `completeJson` runs a chat completion in JSON mode and validates the parsed
 * result against a Zod schema, retrying on parse/validation failure. Agents
 * use this so a malformed model response never propagates downstream.
 */

let _client: Groq | null = null;
function client(): Groq {
  if (!_client) _client = new Groq({ apiKey: env.groqApiKey() });
  return _client;
}

export interface CompleteJsonOptions<S extends z.ZodTypeAny> {
  system: string;
  user: string;
  schema: S;
  /** Lower = more deterministic. Classification uses ~0.2. */
  temperature?: number;
  /** Retries on parse/validation failure. */
  maxRetries?: number;
  model?: string;
}

export async function completeJson<S extends z.ZodTypeAny>({
  system,
  user,
  schema,
  temperature = 0.2,
  maxRetries = 2,
  model,
}: CompleteJsonOptions<S>): Promise<z.infer<S>> {
  const mdl = model ?? env.groqModel();
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const repair =
      attempt === 0
        ? ""
        : `\n\nYour previous response failed validation: ${String(
            lastErr,
          )}. Return ONLY valid JSON matching the required shape.`;

    const completion = await client().chat.completions.create({
      model: mdl,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system + repair },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    try {
      const parsed = JSON.parse(raw);
      return schema.parse(parsed);
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(
    `Groq completeJson failed after ${maxRetries + 1} attempts: ${String(lastErr)}`,
  );
}

/**
 * Plain text completion (used by the Document Generator).
 */
export async function completeText(opts: {
  system: string;
  user: string;
  temperature?: number;
  model?: string;
}): Promise<string> {
  const completion = await client().chat.completions.create({
    model: opts.model ?? env.groqModel(),
    temperature: opts.temperature ?? 0.4,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}
