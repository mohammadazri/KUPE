import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const MESSAGES = [
  "Analyzing your constraints…",
  "Querying JAKIM-certified venues…",
  "Verifying wheelchair accessibility…",
  "Ranking with Gemini 2.5…",
  "Computing self-heal candidates…",
  "Anchoring with Google Search grounding…",
  "Building your route…",
];

export default function SkeletonLoader() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 1700);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid-2">
      <div className="stack">
        <div className="card">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="row"
          >
            <div
              className="center"
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: "var(--brand-blue-soft)", color: "var(--brand-blue)",
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{MESSAGES[idx]}</div>
              <div className="text-muted" style={{ fontSize: "0.8125rem" }}>
                This usually takes 30–40 seconds.
              </div>
            </div>
          </motion.div>
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="card flat" style={{ padding: 16 }}>
            <div className="row">
              <div className="skeleton" style={{ width: 64, height: 64 }} />
              <div className="stack" style={{ flex: 1, gap: 8 }}>
                <div className="skeleton" style={{ height: 14, width: "70%" }} />
                <div className="skeleton" style={{ height: 12, width: "50%" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="stack">
        <div className="map-wrap skeleton" style={{ minHeight: 360 }} />
        <div className="card skeleton" style={{ height: 140 }} />
      </div>
    </div>
  );
}
