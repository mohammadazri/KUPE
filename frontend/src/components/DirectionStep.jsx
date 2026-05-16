import {
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  CornerUpLeft,
  CornerUpRight,
  RotateCw,
  RotateCcw,
  Merge,
  Circle,
  Footprints,
  Bus,
  Train,
  Car,
  TramFront,
} from "lucide-react";

const MANEUVER_ICONS = {
  "turn-left": ArrowLeft,
  "turn-right": ArrowRight,
  "turn-slight-left": CornerUpLeft,
  "turn-slight-right": CornerUpRight,
  "turn-sharp-left": ArrowLeft,
  "turn-sharp-right": ArrowRight,
  "uturn-left": RotateCcw,
  "uturn-right": RotateCw,
  straight: ArrowUp,
  merge: Merge,
  "roundabout-left": Circle,
  "roundabout-right": Circle,
  "fork-left": CornerUpLeft,
  "fork-right": CornerUpRight,
  "ramp-left": CornerUpLeft,
  "ramp-right": CornerUpRight,
};

const VEHICLE_ICONS = {
  BUS: Bus,
  SUBWAY: Train,
  RAIL: Train,
  HEAVY_RAIL: Train,
  COMMUTER_TRAIN: Train,
  HIGH_SPEED_TRAIN: Train,
  METRO_RAIL: Train,
  MONORAIL: Train,
  TRAM: TramFront,
  TROLLEYBUS: Bus,
};

function pickIcon(step) {
  if (step.travel_mode === "TRANSIT" && step.transit) {
    return VEHICLE_ICONS[step.transit.vehicle_type] || Bus;
  }
  if (step.travel_mode === "DRIVING") return Car;
  if (step.travel_mode === "WALKING") return Footprints;
  return MANEUVER_ICONS[step.maneuver] || ArrowUp;
}

function TransitDetails({ transit }) {
  const badgeStyle = transit.line_color
    ? { background: transit.line_color, color: transit.line_text_color || "#fff" }
    : { background: "var(--brand-blue)", color: "#fff" };
  const label = transit.line_short || transit.line_name || "Line";

  return (
    <div className="step-transit">
      <div className="row-tight" style={{ flexWrap: "wrap", gap: 6 }}>
        <span className="transit-badge" style={badgeStyle}>{label}</span>
        {transit.line_name && transit.line_short && transit.line_name !== transit.line_short && (
          <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{transit.line_name}</span>
        )}
        {transit.agency && (
          <span className="text-muted" style={{ fontSize: "0.75rem" }}>· {transit.agency}</span>
        )}
      </div>

      <div className="step-transit__row">
        <span className="step-transit__label">Board</span>
        <span>
          <strong>{transit.departure_stop || "—"}</strong>
          {transit.departure_time && (
            <span className="text-muted" style={{ marginLeft: 6, fontSize: "0.75rem" }}>
              {transit.departure_time}
            </span>
          )}
        </span>
      </div>

      {transit.headsign && (
        <div className="step-transit__row">
          <span className="step-transit__label">Towards</span>
          <span>{transit.headsign}</span>
        </div>
      )}

      <div className="step-transit__row">
        <span className="step-transit__label">Ride</span>
        <span>
          {transit.num_stops} stop{transit.num_stops === 1 ? "" : "s"}
        </span>
      </div>

      <div className="step-transit__row">
        <span className="step-transit__label">Alight</span>
        <span>
          <strong>{transit.arrival_stop || "—"}</strong>
          {transit.arrival_time && (
            <span className="text-muted" style={{ marginLeft: 6, fontSize: "0.75rem" }}>
              {transit.arrival_time}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function DirectionStep({ step }) {
  const Icon = pickIcon(step);
  const isTransit = step.travel_mode === "TRANSIT" && step.transit;

  return (
    <div className="step-row">
      <div className="step-row__icon" aria-hidden="true">
        <Icon size={16} />
      </div>
      <div className="step-row__body">
        <div
          className="step-row__instruction"
          dangerouslySetInnerHTML={{ __html: step.instructions || "Continue" }}
        />
        {isTransit && <TransitDetails transit={step.transit} />}
      </div>
      <div className="step-row__meta">
        {step.distance && <div>{step.distance}</div>}
        {step.duration && <div className="text-muted">{step.duration}</div>}
      </div>
    </div>
  );
}
