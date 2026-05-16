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

// Light, friendly Google Maps styling — minimal POIs, soft road colors
const lightStyle = [
  { elementType: "geometry", stylers: [{ color: "#FAFBFD" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#677488" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#CFE8F7" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#0770CD" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#F2F4F7" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#E5E9F0" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#FFF1EA" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#FFD3BC" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#E6F8E5" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
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

  const center = points[0]?.position || DEFAULT_CENTER;

  return (
    <div className="map-wrap" style={{ height: 420 }}>
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          options={{
            styles: lightStyle,
            disableDefaultUI: true,
            zoomControl: true,
            backgroundColor: "#FAFBFD",
            clickableIcons: false,
          }}
        >
          {points.map((p) => {
            const isActive =
              activeLinkage?.business_id &&
              businesses[activeLinkage.business_id]?.location &&
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
                  scale: isActive ? 15 : 11,
                  fillColor: isActive ? "#FF5E1F" : "#0194F3",
                  fillOpacity: 1,
                  strokeColor: "#FFFFFF",
                  strokeWeight: 2.5,
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
                  strokeColor: "#0194F3",
                  strokeOpacity: 0.8,
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
