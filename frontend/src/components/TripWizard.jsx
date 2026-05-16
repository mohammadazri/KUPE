import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Mic, Sparkles, MapPin, Globe } from "lucide-react";

import CityAutocomplete from "./CityAutocomplete.jsx";
import ConstraintPicker from "./ConstraintPicker.jsx";
import VoiceCapture from "./VoiceCapture.jsx";

const PREFS = ["outdoor", "cultural", "shopping", "food", "photography", "nature", "skyline", "wellness", "history"];
const PACES = ["relaxed", "moderate", "adventurous"];

// Tier mapping (matches backend BudgetTier enum)
function budgetToTier(myr) {
  if (myr < 1500) return "budget";
  if (myr <= 5000) return "mid";
  return "premium";
}
function tierToBudgetDefault(tier) {
  return tier === "budget" ? 1000 : tier === "premium" ? 6000 : 3000;
}

const STEP_LABELS = ["Destination", "Dates", "Constraints", "Preferences", "Review"];

const POPULAR_CITIES = [
  { city: "Kuala Lumpur", lat: 3.139, lng: 101.6869 },
  { city: "Penang", lat: 5.4164, lng: 100.3327 },
  { city: "Singapore", lat: 1.3521, lng: 103.8198 },
  { city: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { city: "Bangkok", lat: 13.7563, lng: 100.5018 },
  { city: "Dubai", lat: 25.2048, lng: 55.2708 },
];

function StepDots({ step, total }) {
  return (
    <div className="step-progress">
      <div className="step-progress__track">
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < step;
          const current = i === step;
          return (
            <div
              key={i}
              className={`step-progress__pip ${filled ? "is-filled" : ""} ${current ? "is-current" : ""}`}
            />
          );
        })}
      </div>
      <span className="step-progress__label">
        Step {step + 1} of {total} · {STEP_LABELS[step] || ""}
      </span>
    </div>
  );
}

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function readHeroSearch() {
  try {
    const raw = sessionStorage.getItem("kupe.heroSearch");
    if (!raw) return null;
    sessionStorage.removeItem("kupe.heroSearch");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function TripWizard({ onSubmit, initialValues }) {
  const heroPrefill = useMemo(() => readHeroSearch(), []);
  const prefill = initialValues || heroPrefill;
  // Edit-mode lands on the review step; hero-search lands on constraints; cold start at the top.
  const [step, setStep] = useState(initialValues ? 4 : (heroPrefill ? 2 : 0));
  const [destination, setDestination] = useState({
    city: prefill?.city || "Kuala Lumpur",
    lat: prefill?.lat ?? (Number(import.meta.env.VITE_DEFAULT_LAT) || 3.139),
    lng: prefill?.lng ?? (Number(import.meta.env.VITE_DEFAULT_LNG) || 101.6869),
    place_id: prefill?.place_id || null,
  });
  const [start, setStart] = useState(prefill?.start || todayISO(1));
  const [end, setEnd] = useState(prefill?.end || todayISO(2));
  const [constraints, setConstraints] = useState(prefill?.constraints || ["halal"]);
  const [preferences, setPreferences] = useState(prefill?.preferences || ["cultural", "food"]);
  const [pace, setPace] = useState(prefill?.pace || "moderate");
  const [budget, setBudget] = useState(
    typeof prefill?.budget === "number"
      ? prefill.budget
      : tierToBudgetDefault(prefill?.budget || "mid")
  );
  const [partySize, setPartySize] = useState(prefill?.party_size || 2);
  const [notes, setNotes] = useState(prefill?.notes || "");

  const total = 5;

  const valid = useMemo(() => {
    if (step === 0) return Boolean(destination?.city);
    if (step === 1) return Boolean(start && end && start <= end);
    return true;
  }, [step, start, end, destination?.city]);

  const next = () => setStep((s) => Math.min(s + 1, total - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = () => {
    onSubmit({
      city: destination.city,
      lat: destination.lat ?? undefined,
      lng: destination.lng ?? undefined,
      start_date: start,
      end_date: end,
      constraints,
      preferences,
      pace,
      budget: budgetToTier(budget),
      party_size: Number(partySize) || 1,
      notes: notes || undefined,
    });
  };

  const onVoice = (parsed) => {
    if (!parsed) return;
    if (Array.isArray(parsed.constraints)) setConstraints(parsed.constraints);
    if (Array.isArray(parsed.preferences)) setPreferences(parsed.preferences);
    if (parsed.pace) setPace(parsed.pace);
    if (parsed.budget) setBudget(tierToBudgetDefault(parsed.budget));
    if (parsed.party_size) setPartySize(parsed.party_size);
    if (parsed.notes) setNotes(parsed.notes);
  };

  return (
    <div className="card">
      <StepDots step={step} total={total} />
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <h2>Where to?</h2>
            <p className="text-secondary mt-2">
              Pick anywhere on earth. Live Google Places discovery finds real venues; KUPE verifies your constraints on top.
            </p>

            <div className="mt-4">
              <label className="label">Destination</label>
              <CityAutocomplete value={destination} onSelect={setDestination} defaultLabel={destination?.city} />

              <div className="quick-chips" aria-label="Popular destinations">
                {POPULAR_CITIES.map((c) => {
                  const active = destination?.city === c.city;
                  return (
                    <button
                      key={c.city}
                      type="button"
                      className="quick-chip"
                      onClick={() => setDestination({ ...c, place_id: null })}
                      style={
                        active
                          ? {
                              background: "var(--brand-blue-soft)",
                              borderColor: "rgba(1,148,243,0.45)",
                              color: "var(--brand-blue-hover)",
                              fontWeight: 600,
                            }
                          : undefined
                      }
                    >
                      <MapPin size={12} /> {c.city}
                    </button>
                  );
                })}
              </div>
            </div>

            {destination?.city && (
              <div
                className="card tinted-blue mt-4"
                style={{ borderColor: "rgba(1,148,243,0.2)" }}
              >
                <div className="row">
                  <div
                    className="center"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "var(--brand-blue)",
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {destination.place_id ? <Globe size={22} /> : <MapPin size={22} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: "1rem" }}>{destination.city}</strong>
                    <div className="text-secondary" style={{ fontSize: "0.8125rem", marginTop: 2 }}>
                      {destination.place_id
                        ? "Live discovery via Google Places — real businesses, KUPE-verified constraints."
                        : "Picked from popular cities. Type above to search anywhere on earth."}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <h2>When?</h2>
            <p className="text-secondary mt-2">Pick your travel dates.</p>
            <div className="grid-2 mt-4">
              <div>
                <label className="label">Start</label>
                <div className="row mt-2" style={{ gap: 8 }}>
                  <Calendar size={16} color="var(--brand-blue)" />
                  <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">End</label>
                <div className="row mt-2" style={{ gap: 8 }}>
                  <Calendar size={16} color="var(--brand-blue)" />
                  <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <h2>Your non-negotiables</h2>
            <p className="text-secondary mt-2">These are HARD constraints. KUPE never compromises on them.</p>
            <div className="mt-4">
              <ConstraintPicker value={constraints} onChange={setConstraints} />
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <h2>Preferences & pace</h2>
            <p className="text-secondary mt-2">Soft preferences shape ranking but don't block matches.</p>

            <div className="mt-4">
              <label className="label">Interests</label>
              <div className="row mt-2">
                {PREFS.map((p) => {
                  const active = preferences.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      className={`chip ${active ? "brand" : ""}`}
                      onClick={() =>
                        setPreferences(active ? preferences.filter((x) => x !== p) : [...preferences, p])
                      }
                      style={{
                        cursor: "pointer",
                        border: active ? "1px solid rgba(1,148,243,0.4)" : "1px solid var(--border-subtle)",
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid-2 mt-5">
              <div>
                <label className="label">Pace</label>
                <select className="select mt-2" value={pace} onChange={(e) => setPace(e.target.value)}>
                  {PACES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Budget (MYR, whole trip)</label>
                <input
                  className="input mt-2"
                  type="number"
                  min={0}
                  step={50}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value) || 0)}
                  placeholder="e.g. 3000"
                />
                <div className="text-muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>
                  Maps to: <strong>{budgetToTier(budget)}</strong> tier
                </div>
              </div>
            </div>

            <div className="grid-2 mt-5">
              <div>
                <label className="label">Party size</label>
                <input
                  className="input mt-2"
                  type="number"
                  min={1}
                  max={20}
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <input
                  className="input mt-2"
                  placeholder="Anything else? e.g. quiet venues, kid-friendly"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="card tinted-orange mt-5">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="row-tight">
                  <Mic size={14} color="var(--brand-orange)" />
                  <strong style={{ fontSize: "0.9375rem" }}>Or just talk to it</strong>
                </div>
              </div>
              <p className="text-secondary mt-2" style={{ fontSize: "0.8125rem" }}>
                Tap & speak. Speech-to-Text (Chirp 2) + Gemini will fill these fields.
              </p>
              <div className="mt-3">
                <VoiceCapture onParsed={onVoice} />
              </div>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <h2>Review & generate</h2>
            <p className="text-secondary mt-2">Last look. Click generate when ready.</p>
            <div className="card flat mt-4" style={{ background: "var(--bg-page)" }}>
              <div className="stack" style={{ gap: 10 }}>
                <Row label="Destination" value={destination.city} />
                <Row label="Dates" value={`${start} → ${end}`} />
                <Row
                  label="Constraints"
                  value={<>{constraints.map((c) => <span key={c} className="chip success">{c}</span>)}</>}
                />
                <Row
                  label="Preferences"
                  value={<>{preferences.map((p) => <span key={p} className="chip brand">{p}</span>)}</>}
                />
                <Row label="Pace · Budget" value={`${pace} · MYR ${budget} (${budgetToTier(budget)})`} />
                <Row label="Party · Notes" value={`${partySize} ${notes ? "· " + notes : ""}`} />
              </div>
            </div>
            <div className="row mt-5">
              <button type="button" className="btn primary" onClick={submit}>
                <Sparkles size={18} /> Generate my trip
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="row mt-5" style={{ justifyContent: "space-between" }}>
        <button className="btn ghost" onClick={back} disabled={step === 0}>
          <ArrowLeft size={16} /> Back
        </button>
        {step < total - 1 && (
          <button className="btn secondary" onClick={next} disabled={!valid}>
            Next <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
      <div className="text-muted" style={{ fontSize: "0.8125rem", minWidth: 110, fontWeight: 500 }}>
        {label}
      </div>
      <div className="row-tight" style={{ gap: 6, justifyContent: "flex-end", flex: 1, flexWrap: "wrap", color: "var(--text-primary)", fontWeight: 500 }}>
        {value || "—"}
      </div>
    </div>
  );
}
