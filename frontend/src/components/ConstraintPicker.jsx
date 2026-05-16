import { MoonStar, Accessibility, Leaf, Wheat, Shield, Users, Sprout } from "lucide-react";

const CONSTRAINTS = [
  { key: "halal", label: "Halal", icon: MoonStar, desc: "JAKIM-certified only" },
  { key: "wheelchair_accessible", label: "Accessible", icon: Accessibility, desc: "Step-free venues" },
  { key: "vegetarian", label: "Vegetarian", icon: Leaf, desc: "Verified menus" },
  { key: "vegan", label: "Vegan", icon: Sprout, desc: "Plant-based" },
  { key: "gluten_free", label: "Gluten-Free", icon: Wheat, desc: "GF preparation" },
  { key: "nut_free", label: "Nut-Free", icon: Shield, desc: "Nut-free kitchen" },
  { key: "family_friendly", label: "Family", icon: Users, desc: "Kid-friendly" },
];

export default function ConstraintPicker({ value = [], onChange }) {
  const toggle = (k) => {
    if (value.includes(k)) onChange(value.filter((v) => v !== k));
    else onChange([...value, k]);
  };

  return (
    <div>
      <div className="tile-row" role="tablist" aria-label="Travel constraints">
        {CONSTRAINTS.map((c) => {
          const active = value.includes(c.key);
          return (
            <button
              type="button"
              key={c.key}
              onClick={() => toggle(c.key)}
              role="tab"
              aria-selected={active}
              title={c.desc}
              className={`category-tile ${active ? "active" : ""}`}
            >
              <div className="icon-circle">
                <c.icon size={22} />
              </div>
              <div className="tile-label">{c.label}</div>
            </button>
          );
        })}
      </div>
      <div
        className="text-muted"
        style={{ fontSize: "0.8125rem", marginTop: 8 }}
      >
        Selected constraints are <strong>hard requirements</strong> — KUPE never compromises on them.
      </div>
    </div>
  );
}
