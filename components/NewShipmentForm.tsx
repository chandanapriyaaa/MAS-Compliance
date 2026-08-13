"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Field, Input, Textarea, Select } from "./ui/Field";

/**
 * Intake form. POSTs to /api/shipment/intake and refreshes the list so the new
 * shipment appears and the live table starts tracking it.
 */
export function NewShipmentForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);

    const form = new FormData(e.currentTarget);
    const assessable = form.get("assessable_value");
    const body = {
      product_description: String(form.get("product_description") ?? ""),
      origin_country: strOrUndef(form.get("origin_country")),
      dest_country: strOrUndef(form.get("dest_country")),
      assessable_value: assessable ? Number(assessable) : undefined,
      currency: String(form.get("currency") ?? "INR"),
      claimed_scheme: String(form.get("claimed_scheme") ?? "none"),
    };

    try {
      const res = await fetch("/api/shipment/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setResult("Queued. The pipeline is running.");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-6 lg:sticky lg:top-20">
      <h2 className="text-[16px] font-semibold text-label">New shipment</h2>
      <p className="mt-1 text-[13px] text-label-secondary">
        Paste a product description, invoice text, or spec sheet.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <Field label="Product description" htmlFor="pd">
          <Textarea
            id="pd"
            name="product_description"
            required
            rows={4}
            placeholder="e.g. Men's knitted cotton crew-neck t-shirts, short sleeve"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Origin" htmlFor="oc">
            <Input id="oc" name="origin_country" placeholder="India" />
          </Field>
          <Field label="Destination" htmlFor="dc">
            <Input id="dc" name="dest_country" placeholder="Germany" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Assessable value" htmlFor="av" hint="optional">
            <Input id="av" name="assessable_value" type="number" step="0.01" placeholder="300000" />
          </Field>
          <Field label="Currency" htmlFor="cur">
            <Input id="cur" name="currency" defaultValue="INR" />
          </Field>
        </div>

        <Field label="Claimed scheme" htmlFor="cs">
          <Select id="cs" name="claimed_scheme" defaultValue="none">
            <option value="none">No scheme claimed</option>
            <option value="rodtep">RoDTEP</option>
            <option value="drawback">Drawback</option>
            <option value="advance_authorization">Advance Authorization</option>
          </Select>
        </Field>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Submitting…" : "Run pipeline"}
        </Button>

        {result && (
          <p className="text-[13px] font-medium text-green-ink">{result}</p>
        )}
        {error && <p className="text-[13px] font-medium text-red-ink">{error}</p>}
      </form>
    </Card>
  );
}

function strOrUndef(v: FormDataEntryValue | null): string | undefined {
  const s = v ? String(v).trim() : "";
  return s.length ? s : undefined;
}
