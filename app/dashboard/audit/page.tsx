import { SectionHeading } from "@/components/ui/Section";
import { AuditSearch } from "@/components/AuditSearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Org-wide audit log — the append-only compliance evidence trail across every
 * shipment and agent step, searchable and filterable by level.
 */
export default function AuditPage() {
  return (
    <div className="enter-stagger space-y-8">
      <SectionHeading
        eyebrow="Compliance"
        title="Audit log"
        subtitle="Every agent decision across every shipment, append-only. Search and filter the evidence trail."
      />
      <AuditSearch />
    </div>
  );
}
