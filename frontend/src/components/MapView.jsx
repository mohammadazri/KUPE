import { Fragment, useEffect, useMemo, useRef, useState } from "react";
// MarkerF + PolylineF are the React 18 Strict Mode-safe variants.
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { Maximize2 } from "lucide-react";
import { getRoute } from "../utils/directions.js";

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

const CAR_COLOR = "#1F2937";

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

const STROKE_BY_MODE = {
  WALKING: { weight: 4, opacity: 0.75, dash: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "10px" }] },
  TRANSIT: { weight: 5, opacity: 0.85, dash: null },
  DRIVING: { weight: 5, opacity: 0.85, dash: null },
};

// Build a Google Maps "dashed line" icons array in the given color.
// The trick: hide the polyline stroke (strokeOpacity: 0) and let these
// repeated vertical-line symbols paint the dashes.
function dashIcons(color) {
  return [
    {
      icon: {
        path: "M 0,-1 0,1",
        strokeOpacity: 1,
        strokeColor: color,
        strokeWeight: 3,
        scale: 3,
      },
      offset: "0",
      repeat: "14px",
    },
  ];
}

function styleForStep(step, dayColor) {
  if (step.travel_mode === "TRANSIT" && step.transit) {
    return {
      strokeColor: step.transit.line_color || dayColor,
      strokeOpacity: 0.95,
      strokeWeight: 6,
      geodesic: false,
      icons: null,
    };
  }
  if (step.travel_mode === "WALKING") {
    return {
      strokeOpacity: 0,
      strokeWeight: 4,
      geodesic: false,
      icons: dashIcons(dayColor),
    };
  }
  // DRIVING / unknown → solid
  return {
    strokeColor: dayColor,
    strokeOpacity: 0.85,
    strokeWeight: 5,
    geodesic: false,
    icons: null,
  };
}

// Style used when the route's steps aren't available — keeps the leg-mode look
// consistent with the per-step renderer above.
function styleForFallback(travelMode, color) {
  if (travelMode === "WALKING") {
    return { strokeOpacity: 0, strokeWeight: 4, geodesic: false, icons: dashIcons(color) };
  }
  if (travelMode === "TRANSIT") {
    return { strokeColor: color, strokeOpacity: 0.85, strokeWeight: 6, geodesic: false, icons: null };
  }
  return { strokeColor: color, strokeOpacity: 0.85, strokeWeight: 5, geodesic: false, icons: null };
}

export default function MapView({
  trip,
  businesses,
  activeLinkage,
  travelMode = "WALKING",
  carPosition = null,
  onCarPositionChange,
  activeDay: activeDayProp,
  onActiveDayChange,
  onExpand,
}) {
  const apiKey = import.meta.env.VITE_MAPS_BROWSER_KEY;
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: MAPS_LIBRARIES,
  });
  const [internalActiveDay, setInternalActiveDay] = useState(0);
  const activeDay = activeDayProp ?? internalActiveDay;
  const setActiveDay = onActiveDayChange ?? setInternalActiveDay;
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

  // Routes fetched from Directions API, keyed by segment.
  // Key: `${dayIdx}-${fromSeq}-${toSeq}` for between-stop legs.
  //      `car-${dayIdx}-1` for car → first stop (DRIVING + carPosition set).
  const [routes, setRoutes] = useState({});
  const [routesFailed, setRoutesFailed] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    const pending = [];

    visibleDays.forEach((day) => {
      // Car → first stop (DRIVING mode only, only for the trip's first visible day)
      const isFirstVisible = day.dayIdx === visibleDays[0]?.dayIdx;
      if (
        travelMode === "DRIVING" &&
        carPosition &&
        isFirstVisible &&
        day.points[0]
      ) {
        const key = `car-${day.dayIdx}-1`;
        pending.push({
          key,
          origin: carPosition,
          dest: day.points[0].position,
        });
      }
      // Between consecutive stops
      for (let i = 0; i < day.points.length - 1; i++) {
        const from = day.points[i];
        const to = day.points[i + 1];
        const key = `${day.dayIdx}-${from.sequence}-${to.sequence}`;
        pending.push({ key, origin: from.position, dest: to.position });
      }
    });

    // Fetch all in parallel; settle individually so a single failure doesn't
    // block the others.
    Promise.all(
      pending.map(async ({ key, origin, dest }) => {
        const route = await getRoute(origin, dest, travelMode);
        return [key, route];
      })
    ).then((entries) => {
      if (cancelled) return;
      const next = {};
      entries.forEach(([k, v]) => { next[k] = v; });
      setRoutes(next);
      setRoutesFailed(pending.length > 0 && entries.every(([, v]) => v === null));
    });

    return () => { cancelled = true; };
  }, [isLoaded, visibleDays, travelMode, carPosition]);

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
    if (travelMode === "DRIVING" && carPosition) {
      bounds.extend(carPosition);
    }
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [activeDay, dayPoints, travelMode, carPosition]);

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
              {visibleDays.map((day) => {
                const stroke = STROKE_BY_MODE[travelMode] || STROKE_BY_MODE.WALKING;
                const isFirstVisible = day.dayIdx === visibleDays[0]?.dayIdx;

                return (
                  <Fragment key={`day-${day.dayIdx}`}>
                    {/* Car → first stop leg (DRIVING only) */}
                    {travelMode === "DRIVING" && carPosition && isFirstVisible && day.points[0] && (() => {
                      const carRoute = routes[`car-${day.dayIdx}-1`];
                      if (carRoute?.steps?.length) {
                        return carRoute.steps.map((step, si) => {
                          const styling = styleForStep(step, CAR_COLOR);
                          const path = step.path?.length ? step.path : null;
                          if (!path) return null;
                          return (
                            <PolylineF key={`car-step-${si}`} path={path} options={styling} />
                          );
                        });
                      }
                      const path = carRoute?.path || [carPosition, day.points[0].position];
                      return (
                        <PolylineF
                          key="car-leg"
                          path={path}
                          options={styleForFallback(travelMode, CAR_COLOR)}
                        />
                      );
                    })()}

                    {/* Between-stop legs — render per-step so walking vs transit segments are visually distinct */}
                    {day.points.slice(0, -1).map((from, i) => {
                      const to = day.points[i + 1];
                      const key = `${day.dayIdx}-${from.sequence}-${to.sequence}`;
                      const route = routes[key];

                      // No route fetched yet → straight-line fallback (faded)
                      if (!route) {
                        return (
                          <PolylineF
                            key={`${key}-fallback`}
                            path={[from.position, to.position]}
                            options={{
                              ...styleForFallback(travelMode, day.color),
                              strokeOpacity: travelMode === "WALKING" ? 0 : 0.35,
                            }}
                          />
                        );
                      }

                      // Preferred path: render every step individually, styled by its travel_mode
                      if (route.steps?.length) {
                        return route.steps.map((step, si) => {
                          const styling = styleForStep(step, day.color);
                          const path = step.path?.length ? step.path : null;
                          if (!path) return null;
                          return (
                            <PolylineF key={`${key}-step-${si}`} path={path} options={styling} />
                          );
                        });
                      }

                      // Fallback: render overview polyline with the mode style
                      return (
                        <PolylineF
                          key={key}
                          path={route.path}
                          options={styleForFallback(travelMode, day.color)}
                        />
                      );
                    })}

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
                );
              })}

              {/* Draggable car marker (DRIVING mode) */}
              {travelMode === "DRIVING" && carPosition && (
                <MarkerF
                  position={carPosition}
                  draggable
                  onDragEnd={(e) => {
                    if (!e?.latLng) return;
                    onCarPositionChange?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                  }}
                  label={{ text: "🚗", fontSize: "18px" }}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 18,
                    fillColor: "#FFFFFF",
                    fillOpacity: 1,
                    strokeColor: CAR_COLOR,
                    strokeWeight: 3,
                  }}
                  title="Drag to set your car's location"
                  zIndex={2000}
                />
              )}
            </GoogleMap>

            {/* Expand button overlay */}
            {onExpand && hasAnyPoints && (
              <button
                type="button"
                className="map-expand-btn"
                onClick={onExpand}
                aria-label="Expand map with full directions"
                title="View full directions"
              >
                <Maximize2 size={16} />
              </button>
            )}

            {/* Walk vs transit legend (TRANSIT mode only) */}
            {travelMode === "TRANSIT" && hasAnyPoints && (
              <div className="map-mode-legend" aria-hidden="true">
                <div className="map-mode-legend__item">
                  <span className="map-mode-legend__swatch is-walk" />
                  Walk
                </div>
                <div className="map-mode-legend__item">
                  <span className="map-mode-legend__swatch is-transit" />
                  Transit line
                </div>
              </div>
            )}

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

            {/* Car-mode hint */}
            {travelMode === "DRIVING" && carPosition && !routesFailed && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  background: "rgba(255,255,255,0.96)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  boxShadow: "var(--shadow-card)",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  pointerEvents: "none",
                }}
              >
                🚗 Drag the car marker to set your start
              </div>
            )}

            {/* Routes failed banner — usually means Directions API not enabled on the Maps key */}
            {routesFailed && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  right: 12,
                  background: "rgba(255, 244, 230, 0.98)",
                  border: "1px solid #FFD3BC",
                  borderRadius: 8,
                  padding: "8px 12px",
                  boxShadow: "var(--shadow-card)",
                  fontSize: "0.75rem",
                  color: "#8a4a1f",
                  lineHeight: 1.4,
                }}
              >
                <strong>Routes unavailable.</strong> Enable <em>Directions API</em> in
                Google Cloud Console for the Maps key, or remove API restrictions on the key.
                Straight-line fallback shown.
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
