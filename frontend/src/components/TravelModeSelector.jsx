import { Footprints, Bus, Car } from "lucide-react";

const MODES = [
  { id: "WALKING", label: "Walk", Icon: Footprints },
  { id: "TRANSIT", label: "Transit", Icon: Bus },
  { id: "DRIVING", label: "Car", Icon: Car },
];

export default function TravelModeSelector({ value, onChange }) {
  return (
    <div
      className="row"
      role="radiogroup"
      aria-label="Travel mode"
      style={{
        gap: 0,
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 999,
        padding: 3,
        boxShadow: "var(--shadow-card)",
        width: "fit-content",
      }}
    >
      {MODES.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "none",
              background: active ? "var(--brand-blue)" : "transparent",
              color: active ? "white" : "var(--text-secondary)",
              fontWeight: active ? 700 : 500,
              fontSize: "0.8125rem",
              padding: "6px 14px",
              borderRadius: 999,
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
