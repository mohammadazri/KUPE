import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import MapView from "./MapView.jsx";
import TravelModeSelector from "./TravelModeSelector.jsx";
import DirectionLeg from "./DirectionLeg.jsx";
import { getRoute } from "../utils/directions.js";

export default function DirectionsModal({
  open,
  onClose,
  trip,
  businesses,
  activeDay,
  onActiveDayChange,
  travelMode,
  onTravelModeChange,
  activeLinkage,
  carPosition,
  onCarPositionChange,
}) {
  const legs = useMemo(() => {
    const day = trip?.itinerary?.[activeDay];
    if (!day) return [];
    const points = day.slots
      .filter((s) => s.business_id && businesses[s.business_id]?.location)
      .map((s) => {
        const b = businesses[s.business_id];
        return {
          name: b.name,
          time: s.time,
          position: { lat: b.location.lat, lng: b.location.lng },
        };
      });
    const out = [];
    if (travelMode === "DRIVING" && carPosition && points[0]) {
      out.push({
        key: `car-${activeDay}`,
        from: { name: "Your car", position: carPosition },
        to: points[0],
      });
    }
    for (let i = 0; i < points.length - 1; i++) {
      out.push({
        key: `${activeDay}-${i}-${i + 1}`,
        from: points[i],
        to: points[i + 1],
      });
    }
    return out;
  }, [trip, businesses, activeDay, travelMode, carPosition]);

  const [routeByKey, setRouteByKey] = useState({});
  useEffect(() => {
    if (!open || legs.length === 0) {
      setRouteByKey({});
      return;
    }
    let cancelled = false;
    Promise.all(
      legs.map(async (l) => [
        l.key,
        await getRoute(l.from.position, l.to.position, travelMode),
      ])
    ).then((entries) => {
      if (cancelled) return;
      setRouteByKey(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [open, legs, travelMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const [focusedLegKey, setFocusedLegKey] = useState(null);
  useEffect(() => {
    setFocusedLegKey(null);
  }, [activeDay, travelMode]);

  if (typeof document === "undefined") return null;

  const totalDuration = legs.reduce(
    (acc, l) => acc + (routeByKey[l.key]?.durationValue || 0),
    0
  );
  const totalDistance = legs.reduce(
    (acc, l) => acc + (routeByKey[l.key]?.distanceValue || 0),
    0
  );
  const fmtMinutes = (sec) => {
    if (!sec) return "—";
    const m = Math.round(sec / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m - h * 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
  };
  const fmtKm = (m) => {
    if (!m) return "—";
    if (m < 1000) return `${m} m`;
    return `${(m / 1000).toFixed(1)} km`;
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="directions-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="directions-modal__backdrop" onClick={onClose} />
          <motion.div
            className="directions-modal__card"
            role="dialog"
            aria-modal="true"
            aria-label="Detailed directions"
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="directions-modal__header">
              <div style={{ minWidth: 0 }}>
                <div
                  className="text-muted"
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Directions · {trip?.city}
                </div>
                <div
                  className="row-tight"
                  style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}
                >
                  {(trip?.itinerary || []).map((_, i) => {
                    const active = activeDay === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        className="chip"
                        onClick={() => onActiveDayChange(i)}
                        style={{
                          cursor: "pointer",
                          borderColor: active
                            ? "var(--brand-blue)"
                            : "var(--border-subtle)",
                          background: active
                            ? "var(--brand-blue-soft)"
                            : "transparent",
                          color: active
                            ? "var(--brand-blue-hover)"
                            : "var(--text-secondary)",
                          fontWeight: active ? 700 : 500,
                        }}
                      >
                        Day {i + 1}
                      </button>
                    );
                  })}
                  <span
                    className="text-muted"
                    style={{ fontSize: "0.75rem", marginLeft: 8 }}
                  >
                    {fmtMinutes(totalDuration)} · {fmtKm(totalDistance)} total
                  </span>
                </div>
              </div>

              <div className="row-tight" style={{ gap: 12, flexShrink: 0 }}>
                <TravelModeSelector
                  value={travelMode}
                  onChange={onTravelModeChange}
                />
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={onClose}
                  aria-label="Close directions"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="directions-modal__body">
              <div className="directions-modal__legs">
                {legs.length === 0 && (
                  <div
                    className="text-secondary"
                    style={{ padding: 16, textAlign: "center" }}
                  >
                    No legs to show for this day.
                  </div>
                )}
                {legs.map((leg, idx) => (
                  <DirectionLeg
                    key={leg.key}
                    index={idx}
                    leg={leg}
                    route={routeByKey[leg.key]}
                    travelMode={travelMode}
                    isFocused={focusedLegKey === leg.key}
                    onFocus={() => setFocusedLegKey(leg.key)}
                    defaultOpen={idx === 0}
                  />
                ))}
              </div>
              <div className="directions-modal__map">
                <MapView
                  trip={trip}
                  businesses={businesses}
                  activeLinkage={activeLinkage}
                  travelMode={travelMode}
                  carPosition={carPosition}
                  onCarPositionChange={onCarPositionChange}
                  activeDay={activeDay}
                  onActiveDayChange={onActiveDayChange}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
