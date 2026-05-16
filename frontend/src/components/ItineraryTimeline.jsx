import { motion } from "framer-motion";
import { Fragment, useEffect, useState } from "react";
import { Footprints, Bus, Car } from "lucide-react";
import { useLanguage } from "../hooks/useTranslation.jsx";
import { getRoute } from "../utils/directions.js";
import BusinessCard from "./BusinessCard.jsx";
import ConfidenceBadge from "./ConfidenceBadge.jsx";

const MODE_LABEL = { WALKING: "walk", TRANSIT: "transit", DRIVING: "drive" };
const MODE_ICON = { WALKING: Footprints, TRANSIT: Bus, DRIVING: Car };

function LegHint({ from, to, mode }) {
  const [state, setState] = useState({ status: "loading", leg: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", leg: null });
    if (!from?.location || !to?.location) {
      setState({ status: "done", leg: null });
      return;
    }
    getRoute(from.location, to.location, mode).then((r) => {
      if (!cancelled) setState({ status: "done", leg: r });
    });
    return () => { cancelled = true; };
  }, [from, to, mode]);

  // Hide entirely when the API failed — don't leave "finding…" hanging.
  if (state.status === "done" && !state.leg) return null;

  const Icon = MODE_ICON[mode] || Footprints;
  const label = MODE_LABEL[mode] || "travel";

  return (
    <div
      style={{
        position: "relative",
        paddingLeft: 28,
        paddingBottom: 6,
        marginTop: -8,
      }}
    >
      <div
        className="row-tight text-muted"
        style={{
          fontSize: "0.6875rem",
          gap: 6,
          opacity: state.leg ? 1 : 0.55,
        }}
      >
        <Icon size={11} />
        {state.leg
          ? <span>{state.leg.duration} {label} · {state.leg.distance}</span>
          : <span>finding {label} route…</span>}
      </div>
    </div>
  );
}

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

  if (!business) {
    return (
      <div
        style={{
          position: "relative",
          paddingBottom: 8,
          paddingLeft: 24,
          minHeight: 32,
        }}
      >
        <div className={nodeClass} style={{ top: 10, left: 5, width: 12, height: 12, borderWidth: 2 }} />
        <div
          className="row"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            padding: "4px 0",
            opacity: 0.75,
            flexWrap: "nowrap",
            minWidth: 0,
          }}
        >
          <div className="row-tight" style={{ gap: 10 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.8125rem",
                color: "var(--text-muted, var(--text-secondary))",
                fontWeight: 600,
                minWidth: 42,
              }}
            >
              {slot.time}
            </span>
            <span
              className="text-muted"
              style={{ fontSize: "0.8125rem" }}
            >
              {labelText} · No business assigned
            </span>
          </div>
          {statusChip && (
            <span
              className={`chip ${statusChip}`}
              style={{ padding: "1px 8px", fontSize: "0.6875rem" }}
            >
              {slot.status}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ x: 2 }}
      style={{ position: "relative", paddingBottom: 14, paddingLeft: 28 }}
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
          <BusinessCard business={business} compact />
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

export default function ItineraryTimeline({
  trip,
  linkages,
  businesses,
  onLinkageClick,
  translationTarget,
  travelMode = "WALKING",
}) {
  if (!trip?.itinerary?.length) return <div className="card">No itinerary yet.</div>;
  return (
    <div className="stack">
      {trip.itinerary.map((day) => {
        // Pre-compute which slot indices have a business — used to find the
        // next filled slot when rendering between-stop hints.
        const filled = day.slots
          .map((s, i) => (s.business_id ? i : -1))
          .filter((i) => i !== -1);
        return (
          <div key={day.day} className="card flat">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3>Day {day.day}</h3>
              <span className="text-muted" style={{ fontSize: "0.875rem" }}>
                {day.date}
              </span>
            </div>
            <div className="timeline mt-4">
              {day.slots.map((slot, slotIdx) => {
                const business = slot.business_id ? businesses[slot.business_id] : null;
                // Render a leg hint AFTER this slot if it's filled AND there
                // is another filled slot later in the day.
                const filledPos = filled.indexOf(slotIdx);
                const nextSlotIdx = filledPos !== -1 ? filled[filledPos + 1] : undefined;
                const nextBiz = nextSlotIdx != null ? businesses[day.slots[nextSlotIdx].business_id] : null;

                return (
                  <Fragment key={`${day.day}-${slotIdx}`}>
                    <SlotRow
                      slot={slot}
                      linkage={slot.linkage_id ? linkages[slot.linkage_id] : null}
                      business={business}
                      onClick={onLinkageClick}
                      translationTarget={translationTarget}
                    />
                    {business && nextBiz && (
                      <LegHint from={business} to={nextBiz} mode={travelMode} />
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
