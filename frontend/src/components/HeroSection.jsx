import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  MapPin,
  Calendar,
  MoonStar,
  Accessibility,
  Search,
} from "lucide-react";

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const CONSTRAINT_OPTIONS = [
  { key: "halal", label: "Halal", icon: MoonStar },
  { key: "wheelchair_accessible", label: "Accessible", icon: Accessibility },
];

export default function HeroSection({ onPrimary }) {
  const nav = useNavigate();
  const [start, setStart] = useState(todayISO(1));
  const [end, setEnd] = useState(todayISO(3));
  const [constraints, setConstraints] = useState(["halal"]);

  const toggleConstraint = (k) => {
    setConstraints((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    );
  };

  const handleSearch = () => {
    sessionStorage.setItem(
      "kupe.heroSearch",
      JSON.stringify({ start, end, constraints })
    );
    if (onPrimary) onPrimary();
    else nav("/plan");
  };

  return (
    <section
      style={{
        position: "relative",
        padding: "56px 0 80px",
        background: "var(--bg-hero)",
        borderBottom: "1px solid var(--border-subtle)",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        paddingLeft: "calc(50vw - 50%)",
        paddingRight: "calc(50vw - 50%)",
      }}
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="chip brand">
            <Sparkles size={14} /> Powered by Gemini 2.5 · Vertex AI
          </span>
          <h1 style={{ marginTop: 18, maxWidth: 720 }}>
            Your perfect trip to{" "}
            <span style={{ color: "var(--brand-blue)" }}>Kuala Lumpur</span>,
            <br />
            auto-crafted by AI.
          </h1>
          <p
            style={{
              fontSize: "1.0625rem",
              marginTop: 14,
              maxWidth: 640,
              color: "var(--text-secondary)",
            }}
          >
            KUPE turns your constraints — Halal, wheelchair-accessible, dietary —
            into a self-verified itinerary that heals itself if a venue closes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="search-widget"
          style={{ marginTop: 32 }}
        >
          <label className="field">
            <span className="field-label">
              <MapPin size={11} style={{ display: "inline", marginRight: 4 }} />
              Destination
            </span>
            <input
              className="field-value"
              type="text"
              value="Kuala Lumpur"
              readOnly
            />
          </label>

          <label className="field">
            <span className="field-label">
              <Calendar size={11} style={{ display: "inline", marginRight: 4 }} />
              Start date
            </span>
            <input
              className="field-value"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">
              <Calendar size={11} style={{ display: "inline", marginRight: 4 }} />
              End date
            </span>
            <input
              className="field-value"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={handleSearch}
            className="btn primary"
            style={{ alignSelf: "stretch", paddingLeft: 22, paddingRight: 22 }}
          >
            <Search size={16} /> Search trips
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="row"
          style={{ marginTop: 18, gap: 10 }}
        >
          <span
            className="text-secondary"
            style={{ fontSize: "0.8125rem", fontWeight: 600 }}
          >
            Quick filters:
          </span>
          {CONSTRAINT_OPTIONS.map((c) => {
            const active = constraints.includes(c.key);
            return (
              <button
                type="button"
                key={c.key}
                onClick={() => toggleConstraint(c.key)}
                className={`chip ${active ? "brand" : ""}`}
                style={{
                  cursor: "pointer",
                  border: active
                    ? "1px solid rgba(1,148,243,0.4)"
                    : "1px solid var(--border-subtle)",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <c.icon size={12} /> {c.label}
                {active && <span style={{ marginLeft: 2 }}>✓</span>}
              </button>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="row"
          style={{ marginTop: 18, gap: 24, color: "var(--text-muted)", fontSize: "0.8125rem" }}
        >
          <span>★ 4.7 average satisfaction</span>
          <span className="hidden-mobile">· 42 verified KL venues</span>
          <span className="hidden-mobile">· Self-healing in &lt;5s</span>
        </motion.div>
      </div>
    </section>
  );
}
