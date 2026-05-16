import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";

import { useTrip } from "../hooks/useTrip.jsx";
import { useLanguage } from "../hooks/useTranslation.jsx";

import ItineraryTimeline from "../components/ItineraryTimeline.jsx";
import MapView from "../components/MapView.jsx";
import LinkageCard from "../components/LinkageCard.jsx";
import SelfHealDemo from "../components/SelfHealDemo.jsx";
import EthicalAIPanel from "../components/EthicalAIPanel.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import HalalLogoScanner from "../components/HalalLogoScanner.jsx";

export default function ItineraryPage() {
  const { tripId } = useParams();
  const { trip, linkages, businesses, loadById, loading } = useTrip();
  const { target } = useLanguage();
  const [activeLinkage, setActiveLinkage] = useState(null);

  useEffect(() => {
    if (!trip || trip.id !== tripId) {
      loadById(tripId).catch((e) => console.error("load trip failed", e));
    }
  }, [tripId, trip, loadById]);

  if (loading || !trip) return <div className="container"><SkeletonLoader /></div>;

  const linkageById = Object.fromEntries(linkages.map((l) => [l.id, l]));
  const businessById = Object.fromEntries(businesses.map((b) => [b.id, b]));

  return (
    <div className="container">
      <header className="row mb-5" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>{trip.city} · {trip.dates.start} → {trip.dates.end}</h1>
          <div className="row mt-2">
            {trip.constraint_profile.map((c) => (
              <span key={c} className="chip success">{c}</span>
            ))}
            {trip.preferences.slice(0, 4).map((p) => (
              <span key={p} className="chip">{p}</span>
            ))}
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      <div className="grid-2">
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
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="stack"
        >
          <MapView trip={trip} businesses={businessById} activeLinkage={activeLinkage} />

          {activeLinkage && (
            <LinkageCard
              linkage={activeLinkage}
              business={businessById[activeLinkage.business_id]}
            />
          )}

          <SelfHealDemo trip={trip} linkages={linkages} businesses={businessById} />

          <EthicalAIPanel trip={trip} linkages={linkages} />

          <HalalLogoScanner />
        </motion.div>
      </div>
    </div>
  );
}
