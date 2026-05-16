import { Globe } from "lucide-react";
import { useLanguage } from "../hooks/useTranslation.jsx";

export default function LanguageSwitcher() {
  const { target, setTarget, LANGS } = useLanguage();
  return (
    <div
      className="row-tight"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-pill)",
        padding: "4px 12px 4px 14px",
        gap: 8,
      }}
    >
      <Globe size={14} color="var(--brand-blue)" />
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        aria-label="Translate itinerary"
        style={{
          border: 0,
          background: "transparent",
          outline: "none",
          fontFamily: "var(--font-body)",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "var(--text-primary)",
          padding: "6px 4px",
          cursor: "pointer",
        }}
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
