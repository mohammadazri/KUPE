import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";

import { useTrip } from "../hooks/useTrip.jsx";
import { useLanguage } from "../hooks/useTranslation.jsx";

import ItineraryTimeline from "../components/ItineraryTimeline.jsx";
import MapView from "../components/MapView.jsx";
import LinkageCard from "../components/LinkageCard.jsx";
import SelfHealDemo from "../components/SelfHealDemo.jsx";
import EthicalAIFooter from "../components/EthicalAIFooter.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import HalalLogoScanner from "../components/HalalLogoScanner.jsx";
import TravelModeSelector from "../components/TravelModeSelector.jsx";

export default function ItineraryPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { trip, linkages, businesses, loadById, loading } = useTrip();
  const { target } = useLanguage();
  const [activeLinkage, setActiveLinkage] = useState(null);

  const handleEditTrip = () => {
    if (!trip) return;
    sessionStorage.setItem(
      "kupe.editTrip",
      JSON.stringify({
        city: trip.city,
        start: trip.dates.start,
        end: trip.dates.end,
        constraints: trip.constraint_profile,
        preferences: trip.preferences,
        pace: trip.pace,
        budget: trip.budget,
      })
    );
    navigate("/plan");
  };

  const modeKey = `kupe:travel:${tripId}:mode`;
  const carKey = `kupe:travel:${tripId}:car`;

  const [travelMode, setTravelMode] = useState(() => {
    try { return sessionStorage.getItem(modeKey) || "WALKING"; } catch { return "WALKING"; }
  });
  const [carPosition, setCarPosition] = useState(() => {
    try {
      const raw = sessionStorage.getItem(carKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  useEffect(() => {
    try { sessionStorage.setItem(modeKey, travelMode); } catch { /* quota */ }
  }, [travelMode, modeKey]);

  useEffect(() => {
    try {
      if (carPosition) sessionStorage.setItem(carKey, JSON.stringify(carPosition));
    } catch { /* quota */ }
  }, [carPosition, carKey]);

  useEffect(() => {
    if (!trip || trip.id !== tripId) {
      loadById(tripId).catch((e) => console.error("load trip failed", e));
    }
  }, [tripId, trip, loadById]);

  const businessById = useMemo(
    () => Object.fromEntries((businesses || []).map((b) => [b.id, b])),
    [businesses]
  );

  // Seed the car marker at the trip's first stop the first time DRIVING is selected.
  useEffect(() => {
    if (travelMode !== "DRIVING" || carPosition || !trip?.itinerary?.length) return;
    for (const day of trip.itinerary) {
      const firstSlot = day.slots.find((s) => s.business_id);
      if (!firstSlot) continue;
      const b = businessById[firstSlot.business_id];
      if (b?.location) {
        // Offset slightly south so the car is visibly separate from the stop.
        setCarPosition({ lat: b.location.lat - 0.008, lng: b.location.lng });
        return;
      }
    }
  }, [travelMode, carPosition, trip, businessById]);

  if (loading || !trip) return <div className="container" style={{ paddingTop: 32 }}><SkeletonLoader /></div>;

  const linkageById = Object.fromEntries(linkages.map((l) => [l.id, l]));

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 72 }}>
      <header
        className="card"
        style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, var(--brand-blue-soft) 0%, var(--bg-surface) 100%)",
          border: "1px solid rgba(1,148,243,0.18)",
        }}
      >
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Your trip
            </div>
            <h1 style={{ marginTop: 4 }}>
              {trip.city}
            </h1>
            <div className="text-secondary" style={{ fontSize: "0.9375rem", marginTop: 4 }}>
              {trip.dates.start} → {trip.dates.end} ·{" "}
              {trip.itinerary.length} day{trip.itinerary.length > 1 ? "s" : ""} ·{" "}
              {linkages.length} verified linkages
            </div>
            <div className="row mt-3">
              {trip.constraint_profile.map((c) => (
                <span key={c} className="chip success">{c}</span>
              ))}
              {trip.preferences.slice(0, 4).map((p) => (
                <span key={p} className="chip brand">{p}</span>
              ))}
            </div>
          </div>
          <div className="row-tight" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={handleEditTrip}
              aria-label="Edit trip"
            >
              <Pencil size={14} /> Edit Trip
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="itinerary-grid">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <ItineraryTimeline
            trip={trip}
            linkages={linkageById}
            businesses={businessById}
            onLinkageClick={setActiveLinkage}
            translationTarget={target}
            travelMode={travelMode}
          />
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="stack"
        >
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <TravelModeSelector value={travelMode} onChange={setTravelMode} />
            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
              Routes via Google Directions
            </span>
          </div>

          <MapView
            trip={trip}
            businesses={businessById}
            activeLinkage={activeLinkage}
            travelMode={travelMode}
            carPosition={carPosition}
            onCarPositionChange={setCarPosition}
          />

          {activeLinkage && (
            <LinkageCard
              linkage={activeLinkage}
              business={businessById[activeLinkage.business_id]}
            />
          )}

          <SelfHealDemo trip={trip} linkages={linkages} businesses={businessById} />

          <HalalLogoScanner />
        </motion.aside>
      </div>
      <EthicalAIFooter trip={trip} linkages={linkages} />
    </div>
  );
}
