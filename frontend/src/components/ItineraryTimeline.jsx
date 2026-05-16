import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLanguage } from "../hooks/useTranslation.jsx";
import BusinessCard from "./BusinessCard.jsx";
import ConfidenceBadge from "./ConfidenceBadge.jsx";

function SlotRow({ slot, linkage, business, onClick, translationTarget }) {
  const { translate } = useLanguage();
  const [labelText, setLabelText] = useState(slot.type);

  useEffect(() => {
    let cancelled = false;
    translate(slot.type).then((t) => !cancelled && setLabelText(t));
    return () => { cancelled = true; };
  }, [slot.type, translate, translationTarget]);

  const statusChip = {
    verified: "success",
    healed: "brand",
    broken: "danger",
    pending: "warn",
  }[slot.status] || "";

  const nodeClass =
    slot.status === "healed"
      ? "timeline-node healed"
      : slot.status === "broken"
      ? "timeline-node broken"
      : "timeline-node";

  return (
    <motion.div
      whileHover={{ x: 2 }}
      style={{ position: "relative", paddingBottom: 14 }}
    >
      <div className={nodeClass} />
      <div
        className="card flat"
        style={{
          padding: 14,
          cursor: linkage ? "pointer" : "default",
        }}
        onClick={() => linkage && onClick?.(linkage)}
      >
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.9375rem",
              color: "var(--brand-blue)",
            }}
          >
            {slot.time}
          </strong>
          <div className="row-tight">
            <span className="chip">{labelText}</span>
            {statusChip && <span className={`chip ${statusChip}`}>{slot.status}</span>}
          </div>
        </div>
        <div className="mt-3">
          {business ? (
            <BusinessCard business={business} compact />
          ) : (
            <div className="text-muted" style={{ fontSize: "0.875rem" }}>
              No business assigned
            </div>
          )}
        </div>
        {linkage && (
          <div className="mt-3" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
            <ConfidenceBadge value={linkage.confidence} label="AI confidence" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ItineraryTimeline({ trip, linkages, businesses, onLinkageClick, translationTarget }) {
  if (!trip?.itinerary?.length) return <div className="card">No itinerary yet.</div>;
  return (
    <div className="stack">
      {trip.itinerary.map((day) => (
        <div key={day.day} className="card flat">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3>Day {day.day}</h3>
            <span className="text-muted" style={{ fontSize: "0.875rem" }}>
              {day.date}
            </span>
          </div>
          <div className="timeline mt-4">
            {day.slots.map((slot, slotIdx) => (
              <SlotRow
                key={`${day.day}-${slotIdx}`}
                slot={slot}
                linkage={slot.linkage_id ? linkages[slot.linkage_id] : null}
                business={slot.business_id ? businesses[slot.business_id] : null}
                onClick={onLinkageClick}
                translationTarget={translationTarget}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
