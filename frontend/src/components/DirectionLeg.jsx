import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bus,
  Car,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Footprints,
} from "lucide-react";
import DirectionStep from "./DirectionStep.jsx";

const MODE_ICONS = {
  WALKING: Footprints,
  TRANSIT: Bus,
  DRIVING: Car,
};

function gmapsDeepLink(from, to, travelMode) {
  const params = new URLSearchParams({
    api: "1",
    origin: `${from.position.lat},${from.position.lng}`,
    destination: `${to.position.lat},${to.position.lng}`,
    travelmode: travelMode.toLowerCase(),
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function DirectionLeg({
  index,
  leg,
  route,
  travelMode,
  isFocused,
  onFocus,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ModeIcon = MODE_ICONS[travelMode] || Footprints;
  const steps = route?.steps || [];
  const hasSteps = steps.length > 0;

  const toggle = () => {
    setOpen((v) => !v);
    onFocus?.();
  };

  return (
    <div
      className={`leg-row ${isFocused ? "is-focused" : ""}`}
      onClick={onFocus}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div className="leg-row__header">
        <div className="leg-row__from-to">
          <div className="leg-row__index">{index + 1}</div>
          <div style={{ minWidth: 0 }}>
            <div className="leg-row__title">
              <span className="leg-row__stop">{leg.from.name}</span>
              <ArrowRight size={12} className="leg-row__arrow" />
              <span className="leg-row__stop">{leg.to.name}</span>
            </div>
            <div className="leg-row__meta">
              <ModeIcon size={12} />
              {route ? (
                <>
                  <span>{route.duration || "—"}</span>
                  <span>·</span>
                  <span>{route.distance || "—"}</span>
                </>
              ) : (
                <span className="text-muted">Loading directions…</span>
              )}
            </div>
          </div>
        </div>

        <div className="leg-row__actions">
          <a
            href={gmapsDeepLink(leg.from, leg.to, travelMode)}
            target="_blank"
            rel="noopener noreferrer"
            className="leg-row__gmaps"
            aria-label="Open in Google Maps"
            onClick={(e) => e.stopPropagation()}
            title="Open in Google Maps"
          >
            <ExternalLink size={13} />
          </a>
          <button
            type="button"
            className="leg-row__toggle"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            aria-expanded={open}
            aria-label={open ? "Hide step-by-step" : "Show step-by-step"}
            disabled={!hasSteps}
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && hasSteps && (
          <motion.div
            key="steps"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="leg-row__steps">
              {steps.map((s, i) => (
                <DirectionStep key={i} step={s} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
