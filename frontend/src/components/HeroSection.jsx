import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  MapPin,
  Calendar,
  MoonStar,
  Accessibility,
  Search,
  Globe,
} from "lucide-react";

import { PlacesAPI } from "../api/client.js";

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function newSessionToken() {
  return crypto.randomUUID?.() || `kupe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const CONSTRAINT_OPTIONS = [
  { key: "halal", label: "Halal", icon: MoonStar },
  { key: "wheelchair_accessible", label: "Accessible", icon: Accessibility },
];

const DEFAULT_DESTINATION = {
  city: "Kuala Lumpur",
  lat: Number(import.meta.env.VITE_DEFAULT_LAT) || 3.139,
  lng: Number(import.meta.env.VITE_DEFAULT_LNG) || 101.6869,
  place_id: null,
};

export default function HeroSection({ onPrimary }) {
  const nav = useNavigate();
  const [start, setStart] = useState(todayISO(1));
  const [end, setEnd] = useState(todayISO(3));
  const [constraints, setConstraints] = useState(["halal"]);

  // Destination state
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [query, setQuery] = useState(DEFAULT_DESTINATION.city);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef(newSessionToken());
  const debounceRef = useRef(null);
  const fieldRef = useRef(null);

  // Close suggestions on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (!fieldRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    // If the input matches the picked destination, don't re-fetch.
    if (!query || query.length < 2 || query === destination.city) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await PlacesAPI.autocomplete(query, sessionRef.current, "");
        const sugs = (res?.suggestions || [])
          .map((s) => ({
            placeId: s.placePrediction?.placeId,
            mainText: s.placePrediction?.structuredFormat?.mainText?.text,
            secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text,
            fullText: s.placePrediction?.text?.text,
          }))
          .filter((s) => s.placeId);
        setSuggestions(sugs);
        setOpen(sugs.length > 0);
      } catch {
        // silent — user can still submit the free-text query (backend will geocode)
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, destination.city]);

  const pickSuggestion = async (sug) => {
    setOpen(false);
    setLoading(true);
    try {
      const det = await PlacesAPI.details(sug.placeId, sessionRef.current);
      const loc = det?.location || {};
      const lat = typeof loc.latitude === "number" ? loc.latitude : loc.lat;
      const lng = typeof loc.longitude === "number" ? loc.longitude : loc.lng;
      const label = det?.displayName?.text || sug.fullText || sug.mainText || query;
      const next = {
        city: label,
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null,
        place_id: sug.placeId,
      };
      setDestination(next);
      setQuery(label);
      sessionRef.current = newSessionToken();
    } finally {
      setLoading(false);
    }
  };

  const toggleConstraint = (k) => {
    setConstraints((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    );
  };

  const handleSearch = () => {
    // If the user typed a city but didn't pick from the dropdown, keep the typed text
    // and clear lat/lng — backend will geocode it.
    const final =
      query && query !== destination.city
        ? { city: query, lat: null, lng: null, place_id: null }
        : destination;

    sessionStorage.setItem(
      "kupe.heroSearch",
      JSON.stringify({
        start,
        end,
        constraints,
        city: final.city,
        lat: final.lat,
        lng: final.lng,
        place_id: final.place_id,
      })
    );
    if (onPrimary) onPrimary();
    else nav("/plan");
  };

  return (
    <section
      style={{
        position: "relative",
        padding: "56px 0 80px",
        background: "var(--bg-hero)",
        borderBottom: "1px solid var(--border-subtle)",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        paddingLeft: "calc(50vw - 50%)",
        paddingRight: "calc(50vw - 50%)",
      }}
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="chip brand">
            <Sparkles size={14} /> Powered by Gemini 2.5 · Vertex AI
          </span>
          <h1 style={{ marginTop: 18, maxWidth: 720 }}>
            Your perfect trip to{" "}
            <span style={{ color: "var(--brand-blue)" }}>
              {destination.city || "anywhere"}
            </span>
            ,
            <br />
            auto-crafted by AI.
          </h1>
          <p
            style={{
              fontSize: "1.0625rem",
              marginTop: 14,
              maxWidth: 640,
              color: "var(--text-secondary)",
            }}
          >
            KUPE turns your constraints — Halal, wheelchair-accessible, dietary —
            into a self-verified itinerary that heals itself if a venue closes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="search-widget"
          style={{ marginTop: 32 }}
        >
          <label
            className="field"
            ref={fieldRef}
            style={{ position: "relative" }}
          >
            <span className="field-label">
              {destination.place_id ? (
                <Globe size={11} style={{ display: "inline", marginRight: 4 }} />
              ) : (
                <MapPin size={11} style={{ display: "inline", marginRight: 4 }} />
              )}
              Destination
            </span>
            <input
              className="field-value"
              type="text"
              placeholder="Kuala Lumpur, Penang, Tokyo, London…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (open && suggestions[0]) {
                    pickSuggestion(suggestions[0]);
                  } else {
                    handleSearch();
                  }
                }
                if (e.key === "Escape") setOpen(false);
              }}
              autoComplete="off"
              aria-autocomplete="list"
              spellCheck={false}
            />

            {open && suggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  zIndex: 60,
                  padding: 4,
                  maxHeight: 320,
                  overflowY: "auto",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 10px 28px rgba(0,0,0,0.14)",
                  cursor: "default",
                }}
                onClick={(e) => e.preventDefault()}
              >
                {suggestions.map((s) => (
                  <button
                    key={s.placeId}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickSuggestion(s);
                    }}
                    className="row"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      gap: 10,
                      cursor: "pointer",
                      background: "transparent",
                      border: "none",
                      borderRadius: 8,
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-page)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <MapPin size={14} color="var(--brand-blue)" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                        {s.mainText}
                      </div>
                      {s.secondaryText && (
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {s.secondaryText}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
                {loading && (
                  <div className="text-muted" style={{ fontSize: "0.75rem", padding: "6px 10px" }}>
                    Searching…
                  </div>
                )}
              </div>
            )}
          </label>

          <label className="field">
            <span className="field-label">
              <Calendar size={11} style={{ display: "inline", marginRight: 4 }} />
              Start date
            </span>
            <input
              className="field-value"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">
              <Calendar size={11} style={{ display: "inline", marginRight: 4 }} />
              End date
            </span>
            <input
              className="field-value"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={handleSearch}
            className="btn primary"
            style={{ alignSelf: "stretch", paddingLeft: 22, paddingRight: 22 }}
          >
            <Search size={16} /> Search trips
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="row"
          style={{ marginTop: 18, gap: 10 }}
        >
          <span
            className="text-secondary"
            style={{ fontSize: "0.8125rem", fontWeight: 600 }}
          >
            Quick filters:
          </span>
          {CONSTRAINT_OPTIONS.map((c) => {
            const active = constraints.includes(c.key);
            return (
              <button
                type="button"
                key={c.key}
                onClick={() => toggleConstraint(c.key)}
                className={`chip ${active ? "brand" : ""}`}
                style={{
                  cursor: "pointer",
                  border: active
                    ? "1px solid rgba(1,148,243,0.4)"
                    : "1px solid var(--border-subtle)",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <c.icon size={12} /> {c.label}
                {active && <span style={{ marginLeft: 2 }}>✓</span>}
              </button>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="row"
          style={{ marginTop: 18, gap: 24, color: "var(--text-muted)", fontSize: "0.8125rem" }}
        >
          <span>★ 4.7 average satisfaction</span>
          <span className="hidden-mobile">· Live Google Places discovery worldwide</span>
          <span className="hidden-mobile">· Self-healing in &lt;5s</span>
        </motion.div>
      </div>
    </section>
  );
}
