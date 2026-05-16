export default function ConfidenceBadge({ value = 0, label = "Confidence" }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const fillColor =
    pct >= 80 ? "var(--success)" :
    pct >= 60 ? "var(--brand-blue)" :
                "var(--brand-orange)";

  return (
    <div className="stack" style={{ gap: 6, minWidth: 140 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-primary)" }}>
          {pct}%
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "var(--border-subtle)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: fillColor,
            transition: "width 0.6s ease",
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}
