export default function ConfidenceBadge({ value = 0, label = "Confidence" }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const tone =
    pct >= 80 ? "rgba(50,213,131,0.7)" :
    pct >= 60 ? "rgba(20,189,235,0.7)" :
                "rgba(245,166,35,0.7)";

  return (
    <div className="stack" style={{ gap: 4, minWidth: 140 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="text-muted" style={{ fontSize: "0.75rem" }}>{label}</span>
        <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${tone}, rgba(20,189,235,0.9))`,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}
