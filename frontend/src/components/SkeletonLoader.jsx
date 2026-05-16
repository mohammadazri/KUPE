import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const MESSAGES = [
  "Analyzing your constraints…",
  "Querying JAKIM-certified businesses…",
  "Verifying wheelchair accessibility…",
  "Ranking with Gemini 3.1 Pro…",
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
                background: "rgba(20,189,235,0.16)", color: "#B8E6F5",
              }}
            >
              ✨
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{MESSAGES[idx]}</div>
              <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                This usually takes 4–8 seconds.
              </div>
            </div>
          </motion.div>
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="card" style={{ padding: 16 }}>
            <div className="row">
              <div className="skeleton" style={{ width: 60, height: 60 }} />
              <div className="stack" style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 16, width: "70%" }} />
                <div className="skeleton" style={{ height: 12, width: "50%" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="stack">
        <div className="map-wrap skeleton" style={{ minHeight: 360 }} />
        <div className="card skeleton" style={{ height: 160 }} />
      </div>
    </div>
  );
}
