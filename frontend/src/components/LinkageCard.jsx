import { motion } from "framer-motion";
import { Link2, ShieldCheck, AlertTriangle, Sparkles } from "lucide-react";
import ConfidenceBadge from "./ConfidenceBadge.jsx";
import BusinessCard from "./BusinessCard.jsx";

export default function LinkageCard({ linkage, business }) {
  if (!linkage) return null;
  const isHealed = Boolean(linkage.healed_from);
  const isBroken = linkage.status === "broken";

  const borderColor = isBroken
    ? "var(--danger)"
    : isHealed
    ? "var(--success)"
    : "var(--brand-blue)";

  return (
    <motion.div
      key={linkage.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card ${isHealed ? "heal-in" : ""}`}
      style={{
        borderLeft: `4px solid ${borderColor}`,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row-tight">
          <Link2 size={16} color="var(--brand-blue)" />
          <strong style={{ fontSize: "0.875rem" }}>
            LINKAGE <span className="text-muted">#{linkage.id.slice(-6)}</span>
          </strong>
        </div>
        <span className={`chip ${isBroken ? "danger" : isHealed ? "success" : "brand"}`}>
          {isBroken ? <AlertTriangle size={12} /> : isHealed ? <Sparkles size={12} /> : <ShieldCheck size={12} />}
          {linkage.status?.toUpperCase()}
        </span>
      </div>

      <div className="mt-4">
        <BusinessCard business={business} compact />
      </div>

      <div className="mt-4">
        <div className="label">Constraint checks (deterministic)</div>
        <div className="stack mt-2" style={{ gap: 6 }}>
          {linkage.constraint_checks?.map((c, i) => (
            <div key={i} className="row" style={{ justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.875rem" }}>{c.constraint}</span>
              <span className={`chip ${c.passed ? "success" : "danger"}`}>
                {c.passed ? "✓ pass" : "✗ fail"} · {c.method}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2 mt-4" style={{ gap: 16 }}>
        <ConfidenceBadge value={linkage.confidence} label="AI confidence" />
        <ConfidenceBadge value={linkage.strength} label="Match strength" />
      </div>

      <div
        className="mt-4"
        style={{
          background: "var(--brand-blue-soft)",
          borderLeft: "3px solid var(--brand-blue)",
          padding: "10px 14px",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div className="label" style={{ color: "var(--brand-blue-hover)" }}>
          AI reasoning
        </div>
        <div className="mt-2" style={{ fontSize: "0.875rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
          {linkage.reasoning}
        </div>
      </div>

      {isHealed && (
        <div className="mt-3 text-muted" style={{ fontSize: "0.8125rem" }}>
          🩹 Healed from linkage <code style={{ background: "var(--bg-surface-alt)", padding: "1px 6px", borderRadius: 4 }}>#{linkage.healed_from?.slice(-6)}</code>
        </div>
      )}

      <div
        className="mt-4 text-secondary"
        style={{
          fontSize: "0.75rem",
          padding: "8px 12px",
          background: "var(--bg-page)",
          borderRadius: "var(--radius-md)",
        }}
      >
        ⚡ First-class entity — self-verifies, carries reasoning, can heal autonomously.
      </div>
    </motion.div>
  );
}
