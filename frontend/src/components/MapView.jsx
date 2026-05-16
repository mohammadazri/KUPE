import { useMemo } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";

const DEFAULT_CENTER = {
  lat: Number(import.meta.env.VITE_DEFAULT_LAT) || 3.139,
  lng: Number(import.meta.env.VITE_DEFAULT_LNG) || 101.6869,
};

const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: 360,
};

const darkStyle = [
  { elementType: "geometry", stylers: [{ color: "#0E1626" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0A0F1A" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#B6C0CF" }] },
  { featureType: "water", stylers: [{ color: "#0A1B2A" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1A2A3E" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];

export default function MapView({ trip, businesses, activeLinkage }) {
  const apiKey = import.meta.env.VITE_MAPS_BROWSER_KEY;
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
  });

  const points = useMemo(() => {
    const out = [];
    trip?.itinerary?.forEach((day, dIdx) =>
      day.slots.forEach((s, sIdx) => {
        if (!s.business_id) return;
        const b = businesses[s.business_id];
        if (!b?.location) return;
        out.push({
          dayIdx: dIdx,
          slotIdx: sIdx,
          time: s.time,
          name: b.name,
          position: { lat: b.location.lat, lng: b.location.lng },
        });
      })
    );
    return out;
  }, [trip, businesses]);

  if (!apiKey) {
    return (
      <div className="map-wrap card" style={{ minHeight: 360 }}>
        <div className="center" style={{ height: 320 }}>
          <div className="text-muted" style={{ textAlign: "center" }}>
            🗺️ Map preview disabled — set <code>VITE_MAPS_BROWSER_KEY</code> in <code>.env.local</code>.
            <br />
            <span style={{ fontSize: "0.8rem" }}>Backend & AI still fully functional.</span>
          </div>
        </div>
      </div>
    );
  }

  const center = points[0]?.position || DEFAULT_CENTER;

  return (
    <div className="map-wrap" style={{ height: 420 }}>
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          options={{
            styles: darkStyle,
            disableDefaultUI: true,
            zoomControl: true,
            backgroundColor: "#0A0F1A",
          }}
        >
          {points.map((p, i) => {
            const active = activeLinkage?.business_id && businesses[activeLinkage.business_id]?.location;
            const isActive =
              active &&
              businesses[activeLinkage.business_id].location.lat === p.position.lat &&
              businesses[activeLinkage.business_id].location.lng === p.position.lng;
            return (
              <Marker
                key={`${p.dayIdx}-${p.slotIdx}`}
                position={p.position}
                label={{
                  text: `${p.dayIdx + 1}.${p.slotIdx + 1}`,
                  color: "white",
                  fontSize: "11px",
                  fontWeight: "700",
                }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: isActive ? 14 : 10,
                  fillColor: isActive ? "#FF6B35" : "#14BDEB",
                  fillOpacity: 1,
                  strokeColor: "#0A0F1A",
                  strokeWeight: 2,
                }}
                title={p.name}
              />
            );
          })}
          {trip?.itinerary?.map((day, di) => {
            const path = points
              .filter((p) => p.dayIdx === di)
              .map((p) => p.position);
            if (path.length < 2) return null;
            return (
              <Polyline
                key={`route-${di}`}
                path={path}
                options={{
                  strokeColor: "#14BDEB",
                  strokeOpacity: 0.7,
                  strokeWeight: 3,
                  geodesic: true,
                }}
              />
            );
          })}
        </GoogleMap>
      ) : (
        <div className="skeleton" style={{ width: "100%", height: 360 }} />
      )}
    </div>
  );
}
