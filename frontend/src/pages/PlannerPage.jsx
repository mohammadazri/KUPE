import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import TripWizard from "../components/TripWizard.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import { useTrip } from "../hooks/useTrip.jsx";

export default function PlannerPage() {
  const { generate, loading, error } = useTrip();
  const nav = useNavigate();
  const [stage, setStage] = useState("form"); // form | loading | done

  const handleGenerate = async (payload) => {
    setStage("loading");
    try {
      const res = await generate(payload);
      setStage("done");
      nav(`/trip/${res.trip.id}`);
    } catch (e) {
      setStage("form");
    }
  };

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      {stage === "form" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <header className="mb-5">
            <h1>Plan your trip</h1>
            <p className="text-secondary mt-2">
              Step-by-step. No overwhelm. Your constraints come first.
            </p>
          </header>
          {error && (
            <div className="card tinted-danger mb-4">
              <strong className="text-danger">⚠ Couldn't generate trip</strong>
              <div className="text-secondary mt-2" style={{ fontSize: "0.875rem" }}>
                {error}
              </div>
            </div>
          )}
          <TripWizard onSubmit={handleGenerate} />
        </motion.div>
      )}

      {stage === "loading" && <SkeletonLoader />}
    </div>
  );
}
