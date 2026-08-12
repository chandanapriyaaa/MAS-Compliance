"use client";

import { useState } from "react";

/**
 * Minimal intake form. POSTs to /api/shipment/intake and shows the returned
 * job/shipment id. The pipeline runs asynchronously; the row appears in the
 * table below on refresh.
 */
export function NewShipmentForm() {
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
      setResult(`Queued — shipment ${json.shipment_id}`);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border border-slate-200 p-5"
    >
      <h2 className="font-medium">New shipment</h2>
      <textarea
        name="product_description"
        required
        rows={3}
        placeholder="Product description / invoice text / spec sheet…"
        className="w-full rounded border border-slate-300 p-2 text-sm"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="origin_country"
          placeholder="Origin country (e.g. India)"
          className="rounded border border-slate-300 p-2 text-sm"
        />
        <input
          name="dest_country"
          placeholder="Destination country (e.g. Germany)"
          className="rounded border border-slate-300 p-2 text-sm"
        />
        <input
          name="assessable_value"
          type="number"
          step="0.01"
          placeholder="Assessable value (optional)"
          className="rounded border border-slate-300 p-2 text-sm"
        />
        <input
          name="currency"
          defaultValue="INR"
          className="rounded border border-slate-300 p-2 text-sm"
        />
        <select
          name="claimed_scheme"
          defaultValue="none"
          className="rounded border border-slate-300 p-2 text-sm"
        >
          <option value="none">No scheme claimed</option>
          <option value="rodtep">RoDTEP</option>
          <option value="drawback">Drawback</option>
          <option value="advance_authorization">Advance Authorization</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit shipment"}
      </button>
      {result && <p className="text-sm text-green-700">{result}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}

function strOrUndef(v: FormDataEntryValue | null): string | undefined {
  const s = v ? String(v).trim() : "";
  return s.length ? s : undefined;
}
