import { motion } from "framer-motion";
import { Link2, ShieldCheck, AlertTriangle, Sparkles } from "lucide-react";
import ConfidenceBadge from "./ConfidenceBadge.jsx";
import BusinessCard from "./BusinessCard.jsx";

export default function LinkageCard({ linkage, business }) {
  if (!linkage) return null;
  const isHealed = Boolean(linkage.healed_from);
  const isBroken = linkage.status === "broken";

  return (
    <motion.div
      key={linkage.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card ${isHealed ? "heal-in" : ""}`}
      style={{
        borderColor: isBroken
          ? "rgba(239,68,68,0.5)"
          : isHealed
          ? "rgba(50,213,131,0.5)"
          : "rgba(20,189,235,0.3)",
      }}
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <Link2 size={18} color="#B8E6F5" />
          <strong>LINKAGE <span className="text-muted">#{linkage.id.slice(-6)}</span></strong>
        </div>
        <span className={`chip ${isBroken ? "danger" : isHealed ? "success" : "brand"}`}>
          {isBroken ? <AlertTriangle size={12} /> : isHealed ? <Sparkles size={12} /> : <ShieldCheck size={12} />}
          {linkage.status?.toUpperCase()}
        </span>
      </div>

      <div className="mt-4">
        <BusinessCard business={business} />
      </div>

      <div className="mt-4">
        <div className="label">Constraint checks (deterministic)</div>
        <div className="stack mt-2" style={{ gap: 6 }}>
          {linkage.constraint_checks?.map((c, i) => (
            <div key={i} className="row" style={{ justifyContent: "space-between" }}>
              <span>{c.constraint}</span>
              <span className={`chip ${c.passed ? "success" : "danger"}`}>
                {c.passed ? "✓ pass" : "✗ fail"} · {c.method}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2 mt-4">
        <ConfidenceBadge value={linkage.confidence} label="AI confidence" />
        <ConfidenceBadge value={linkage.strength} label="Match strength" />
      </div>

      <div
        className="mt-4"
        style={{
          background: "rgba(20,189,235,0.06)",
          borderLeft: "3px solid var(--kupe-secondary)",
          padding: "10px 14px",
          borderRadius: 8,
        }}
      >
        <div className="label">AI reasoning</div>
        <div className="mt-2" style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
          {linkage.reasoning}
        </div>
      </div>

      {isHealed && (
        <div className="mt-3 text-muted" style={{ fontSize: "0.8rem" }}>
          🩹 Healed from linkage <code>#{linkage.healed_from?.slice(-6)}</code>
        </div>
      )}

      <div className="mt-4 text-muted" style={{ fontSize: "0.78rem" }}>
        ⚡ First-class entity — self-verifies, carries reasoning, can heal autonomously.
      </div>
    </motion.div>
  );
}
