import { Fragment, useEffect, useMemo, useRef, useState } from "react";
// MarkerF + PolylineF are the React 18 Strict Mode-safe variants.
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";

// Module-level constant — useJsApiLoader warns + reloads if this array
// identity changes between renders. Keep it outside the component.
const MAPS_LIBRARIES = ["places"];

const DEFAULT_CENTER = {
  lat: Number(import.meta.env.VITE_DEFAULT_LAT) || 3.139,
  lng: Number(import.meta.env.VITE_DEFAULT_LNG) || 101.6869,
};

const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: 360,
};

// Distinct colour per day so routes don't blur together in "All" mode.
const DAY_COLORS = [
  "#0194F3", // Day 1 - brand blue
  "#FF5E1F", // Day 2 - brand orange
  "#4BB543", // Day 3 - green
  "#9C27B0", // Day 4 - purple
  "#FFC400", // Day 5 - yellow
  "#0770CD", // Day 6 - dark blue
];

// Light, friendly map style — minimal POIs + soft road colors so markers pop.
const lightStyle = [
  { elementType: "geometry", stylers: [{ color: "#FAFBFD" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#677488" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#CFE8F7" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#0770CD" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#F2F4F7" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#E5E9F0" }] },
  // Hide ALL road labels (the yellow E11, AH2 highway shields conflict with our day numbers)
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#FFF1EA" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#FFD3BC" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#E6F8E5" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#9AA3B0" }] },
];

export default function MapView({ trip, businesses, activeLinkage }) {
  const apiKey = import.meta.env.VITE_MAPS_BROWSER_KEY;
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: MAPS_LIBRARIES,
  });
  const [activeDay, setActiveDay] = useState(0);
  const mapRef = useRef(null);

  // Group points by day with a stable sequence number per day.
  const dayPoints = useMemo(() => {
    if (!trip?.itinerary?.length) return [];
    return trip.itinerary.map((day, dIdx) => {
      const points = [];
      day.slots.forEach((s, sIdx) => {
        if (!s.business_id) return;
        const b = businesses[s.business_id];
        if (!b?.location) return;
        points.push({
          dayIdx: dIdx,
          slotIdx: sIdx,
          time: s.time,
          name: b.name,
          businessId: b.id,
          position: { lat: b.location.lat, lng: b.location.lng },
        });
      });
      return {
        dayIdx: dIdx,
        date: day.date,
        color: DAY_COLORS[dIdx % DAY_COLORS.length],
        points: points.map((p, i) => ({ ...p, sequence: i + 1 })),
      };
    });
  }, [trip, businesses]);

  // What to render: one day or all
  const visibleDays = useMemo(() => {
    if (activeDay === -1) return dayPoints.filter((d) => d.points.length > 0);
    const sel = dayPoints[activeDay];
    return sel ? [sel] : [];
  }, [activeDay, dayPoints]);

  const visiblePoints = useMemo(() => visibleDays.flatMap((d) => d.points), [visibleDays]);

  // Auto-fit bounds when the active day (or its points) changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps || visiblePoints.length === 0) return;
    if (visiblePoints.length === 1) {
      map.panTo(visiblePoints[0].position);
      map.setZoom(15);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    visiblePoints.forEach((p) => bounds.extend(p.position));
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [activeDay, dayPoints]);

  if (!apiKey) {
    return (
      <div className="map-wrap card flat" style={{ minHeight: 360, padding: 24 }}>
        <div className="center" style={{ height: 320, flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: "2rem" }}>🗺️</div>
          <div className="text-secondary" style={{ textAlign: "center", fontSize: "0.9rem" }}>
            Map preview disabled
          </div>
          <div className="text-muted" style={{ textAlign: "center", fontSize: "0.8125rem", maxWidth: 280 }}>
            Set <code>VITE_MAPS_BROWSER_KEY</code> in <code>.env.local</code>. Backend & AI still fully functional.
          </div>
        </div>
      </div>
    );
  }

  const hasAnyPoints = dayPoints.some((d) => d.points.length > 0);
  const center = visiblePoints[0]?.position || DEFAULT_CENTER;

  return (
    <div className="stack" style={{ gap: 10 }}>
      {/* Day selector */}
      {dayPoints.length > 0 && hasAnyPoints && (
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {dayPoints.map((d, i) => {
            const active = activeDay === i;
            const empty = d.points.length === 0;
            return (
              <button
                key={i}
                type="button"
                disabled={empty}
                onClick={() => setActiveDay(i)}
                className="chip"
                style={{
                  cursor: empty ? "not-allowed" : "pointer",
                  border: "1px solid",
                  borderColor: active ? d.color : "var(--border-subtle)",
                  background: active ? `${d.color}1A` : "var(--bg-surface)",
                  color: active ? d.color : "var(--text-secondary)",
                  fontWeight: active ? 700 : 500,
                  fontSize: "0.8125rem",
                  padding: "6px 12px",
                  opacity: empty ? 0.5 : 1,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background: d.color,
                  }}
                />
                Day {i + 1}
                <span
                  className="text-muted"
                  style={{ fontWeight: 500, fontSize: "0.6875rem", marginLeft: 2 }}
                >
                  · {d.points.length} stop{d.points.length === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
          {dayPoints.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveDay(-1)}
              className="chip"
              style={{
                cursor: "pointer",
                border: "1px solid",
                borderColor: activeDay === -1 ? "var(--text-primary)" : "var(--border-subtle)",
                background: activeDay === -1 ? "var(--bg-page)" : "var(--bg-surface)",
                color: "var(--text-primary)",
                fontWeight: activeDay === -1 ? 700 : 500,
                fontSize: "0.8125rem",
                padding: "6px 12px",
              }}
            >
              All days
            </button>
          )}
        </div>
      )}

      <div className="map-wrap" style={{ height: 420, position: "relative" }}>
        {isLoaded ? (
          <>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={13}
              onLoad={(m) => { mapRef.current = m; }}
              onUnmount={() => { mapRef.current = null; }}
              options={{
                styles: lightStyle,
                disableDefaultUI: true,
                zoomControl: true,
                backgroundColor: "#FAFBFD",
                clickableIcons: false,
                gestureHandling: "greedy",
              }}
            >
              {visibleDays.map((day) => (
                <Fragment key={`day-${day.dayIdx}`}>
                  {/* Polyline first so markers sit on top */}
                  {day.points.length >= 2 && (
                    <PolylineF
                      path={day.points.map((p) => p.position)}
                      options={{
                        strokeColor: day.color,
                        strokeOpacity: 0.55,
                        strokeWeight: 4,
                        geodesic: false,
                      }}
                    />
                  )}
                  {day.points.map((p) => {
                    const isActive = activeLinkage?.business_id === p.businessId;
                    return (
                      <MarkerF
                        key={`${day.dayIdx}-${p.slotIdx}`}
                        position={p.position}
                        label={{
                          text: `${p.sequence}`,
                          color: "white",
                          fontSize: isActive ? "14px" : "13px",
                          fontWeight: "700",
                        }}
                        icon={{
                          path: window.google.maps.SymbolPath.CIRCLE,
                          scale: isActive ? 18 : 14,
                          fillColor: isActive ? "#FF5E1F" : day.color,
                          fillOpacity: 1,
                          strokeColor: "#FFFFFF",
                          strokeWeight: 3,
                        }}
                        title={`Day ${day.dayIdx + 1} · ${p.time} · ${p.name}`}
                        zIndex={isActive ? 1000 : 100 - p.sequence}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </GoogleMap>

            {/* Legend overlay (visible only in All-days mode) */}
            {activeDay === -1 && dayPoints.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  background: "rgba(255,255,255,0.96)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  boxShadow: "var(--shadow-card)",
                  fontSize: "0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  maxWidth: 160,
                }}
              >
                <div
                  className="text-muted"
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Legend
                </div>
                {dayPoints.map(
                  (d, i) =>
                    d.points.length > 0 && (
                      <div key={i} className="row-tight" style={{ gap: 6 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: d.color,
                            border: "2px solid white",
                            boxShadow: "0 0 0 1px " + d.color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                          Day {i + 1}
                        </span>
                      </div>
                    )
                )}
              </div>
            )}

            {/* Empty state inside the map */}
            {!hasAnyPoints && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.6)",
                  pointerEvents: "none",
                }}
              >
                <div
                  className="text-secondary"
                  style={{ fontSize: "0.875rem", background: "white", padding: "8px 14px", borderRadius: 999 }}
                >
                  No mapped stops yet
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="skeleton" style={{ width: "100%", height: 360 }} />
        )}
      </div>
    </div>
  );
}
