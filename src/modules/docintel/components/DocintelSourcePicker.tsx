import { Select, type SelectOption } from "@/components/ads";
import type { DocintelDocument } from "../types";

export interface DocintelSourcePickerProps {
  documents: DocintelDocument[];
  selectedDocumentId: string | null;
  onChange: (documentId: string | null) => void;
  isDisabled?: boolean;
  label?: string;
}

function statusLabel(status: DocintelDocument["status"]): string {
  return status.replace(/_/g, " ");
}

/** Controlled project-source picker. All option content comes from supplied document rows. */
export function DocintelSourcePicker({
  documents,
  selectedDocumentId,
  onChange,
  isDisabled = false,
  label = "Source document",
}: DocintelSourcePickerProps) {
  const options: SelectOption<string>[] = documents.map((document) => ({
    value: document.id,
    label: `${document.title.trim() || "—"} — ${statusLabel(document.status)}`,
  }));
  const value = options.find((option) => option.value === selectedDocumentId) ?? null;

  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          marginBottom: "var(--ds-space-050)",
          color: "var(--ds-text)",
          font: "var(--ds-font-heading-xxsmall)",
        }}
      >
        {label}
      </span>
      <Select
        options={options}
        value={value}
        onChange={(next) => onChange(next?.value ?? null)}
        placeholder={documents.length === 0 ? "No sources available" : "Select a source"}
        isDisabled={isDisabled || documents.length === 0}
        isClearable
        isSearchable
        aria-label={label}
        testId="docintel-source-picker"
        width="medium"
      />
    </label>
  );
}

export default DocintelSourcePicker;
