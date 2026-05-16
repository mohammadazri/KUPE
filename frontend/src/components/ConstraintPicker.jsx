import { motion } from "framer-motion";
import { MoonStar, Accessibility, Leaf, Wheat, Shield, Users } from "lucide-react";

const CONSTRAINTS = [
  {
    key: "halal",
    label: "Halal",
    icon: MoonStar,
    desc: "JAKIM-certified restaurants & venues only",
    accent: "rgba(50,213,131,0.18)",
  },
  {
    key: "wheelchair_accessible",
    label: "Accessible",
    icon: Accessibility,
    desc: "Step-free, lifts, accessible toilets",
    accent: "rgba(20,189,235,0.18)",
  },
  {
    key: "vegetarian",
    label: "Vegetarian",
    icon: Leaf,
    desc: "Verified vegetarian menus",
    accent: "rgba(50,213,131,0.12)",
  },
  {
    key: "vegan",
    label: "Vegan",
    icon: Leaf,
    desc: "Fully plant-based options",
    accent: "rgba(50,213,131,0.12)",
  },
  {
    key: "gluten_free",
    label: "Gluten-Free",
    icon: Wheat,
    desc: "Verified GF preparation",
    accent: "rgba(245,166,35,0.18)",
  },
  {
    key: "nut_free",
    label: "Nut-Free",
    icon: Shield,
    desc: "Nut-free kitchen practice",
    accent: "rgba(245,166,35,0.18)",
  },
  {
    key: "family_friendly",
    label: "Family",
    icon: Users,
    desc: "Kid-friendly venues",
    accent: "rgba(20,189,235,0.10)",
  },
];

export default function ConstraintPicker({ value = [], onChange }) {
  const toggle = (k) => {
    if (value.includes(k)) onChange(value.filter((v) => v !== k));
    else onChange([...value, k]);
  };

  return (
    <div className="grid-3">
      {CONSTRAINTS.map((c) => {
        const active = value.includes(c.key);
        return (
          <motion.button
            type="button"
            key={c.key}
            onClick={() => toggle(c.key)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="card"
            style={{
              cursor: "pointer",
              textAlign: "left",
              minHeight: 160,
              background: active ? c.accent : "var(--bg-card)",
              borderColor: active ? "rgba(20,189,235,0.5)" : "var(--border-glass)",
              boxShadow: active ? "var(--shadow-glow)" : "var(--shadow-1)",
              color: "white",
            }}
          >
            <div
              className="center"
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(255,255,255,0.06)", color: "#B8E6F5",
              }}
            >
              <c.icon size={22} />
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginTop: 10 }}>
              {c.label}
            </div>
            <div className="text-muted" style={{ fontSize: "0.85rem", marginTop: 6 }}>
              {c.desc}
            </div>
            <div className="mt-4">
              <span className={`chip ${active ? "success" : ""}`}>
                {active ? "✓ Enabled" : "Tap to enable"}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
