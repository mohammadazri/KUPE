import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import TripWizard from "../components/TripWizard.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import { useTrip } from "../hooks/useTrip.jsx";

function readEditPrefill() {
  try {
    const raw = sessionStorage.getItem("kupe.editTrip");
    if (!raw) return null;
    sessionStorage.removeItem("kupe.editTrip");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function PlannerPage() {
  const { generate, loading, error } = useTrip();
  const nav = useNavigate();
  const [stage, setStage] = useState("form"); // form | loading | done
  const editPrefill = useMemo(() => readEditPrefill(), []);
  const isEdit = Boolean(editPrefill);

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
            <h1>{isEdit ? "Edit your trip" : "Plan your trip"}</h1>
            <p className="text-secondary mt-2">
              {isEdit
                ? "Tweak any field and regenerate. Your current selections are pre-filled."
                : "Step-by-step. No overwhelm. Your constraints come first."}
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
          <TripWizard onSubmit={handleGenerate} initialValues={editPrefill} />
        </motion.div>
      )}

      {stage === "loading" && <SkeletonLoader />}
    </div>
  );
}
