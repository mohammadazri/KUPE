import { Star, MoonStar, Accessibility, MapPin } from "lucide-react";

export default function BusinessCard({ business, compact = false }) {
  if (!business) return null;
  const halal = business.constraints_met?.halal?.certified;
  const wheelchair = business.constraints_met?.accessibility?.wheelchair;

  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <div
        className="center"
        style={{
          width: compact ? 56 : 72,
          height: compact ? 56 : 72,
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(20,189,235,0.18), rgba(13,115,119,0.22))",
          color: "#B8E6F5",
          flexShrink: 0,
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: compact ? "1.2rem" : "1.6rem",
        }}
      >
        {business.name?.slice(0, 1) || "?"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 8 }}>
          <strong style={{ fontSize: compact ? "0.95rem" : "1.05rem" }}>{business.name}</strong>
          {halal && <span className="chip success"><MoonStar size={12} /> Halal</span>}
          {wheelchair && <span className="chip brand"><Accessibility size={12} /> Access</span>}
        </div>
        <div className="text-muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
          {business.type}
          {business.rating ? <> · <Star size={12} style={{ display: "inline" }} /> {business.rating}</> : null}
          {business.avg_spend_myr ? <> · RM{business.avg_spend_myr}</> : null}
        </div>
        {business.address && !compact && (
          <div className="text-muted row mt-2" style={{ fontSize: "0.78rem", gap: 4 }}>
            <MapPin size={12} /> {business.address}
          </div>
        )}
      </div>
    </div>
  );
}
