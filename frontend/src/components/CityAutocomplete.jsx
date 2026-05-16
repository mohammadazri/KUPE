import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";

import { PlacesAPI } from "../api/client.js";

// Stable per-session token for autocomplete → details billing pairing.
function newSessionToken() {
  return (crypto.randomUUID?.() || `kupe-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

export default function CityAutocomplete({ value, onSelect, defaultLabel }) {
  const inputId = useId();
  const [query, setQuery] = useState(value?.city || defaultLabel || "");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const sessionRef = useRef(newSessionToken());
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Sync input when parent changes the selected city externally (e.g. quick-pick chips)
  useEffect(() => {
    if (value?.city && value.city !== query) {
      setQuery(value.city);
      setSuggestions([]);
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.city]);

  // Debounced autocomplete fetch
  useEffect(() => {
    if (!query || query.length < 2 || query === value?.city) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        // No regionCode lock — discovery is worldwide.
        const res = await PlacesAPI.autocomplete(query, sessionRef.current, "");
        const sugs = (res?.suggestions || []).map((s) => ({
          placeId: s.placePrediction?.placeId,
          mainText: s.placePrediction?.structuredFormat?.mainText?.text,
          secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text,
          fullText: s.placePrediction?.text?.text,
        })).filter((s) => s.placeId);
        setSuggestions(sugs);
        setOpen(true);
      } catch (err) {
        setError("Autocomplete failed");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, value?.city]);

  const pick = async (sug) => {
    setOpen(false);
    setLoading(true);
    try {
      const det = await PlacesAPI.details(sug.placeId, sessionRef.current);
      const loc = det?.location || {};
      const lat = loc.latitude ?? loc.lat;
      const lng = loc.longitude ?? loc.lng;
      const label = det?.displayName?.text || sug.fullText || sug.mainText || "";
      setQuery(label);
      onSelect?.({
        city: label,
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null,
        place_id: sug.placeId,
        formatted_address: det?.formattedAddress || null,
      });
      // Start a fresh session for the next autocomplete cycle.
      sessionRef.current = newSessionToken();
    } catch (err) {
      setError("Could not load place details");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setQuery("");
    setSuggestions([]);
    onSelect?.({ city: "", lat: null, lng: null, place_id: null });
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <div className="search-input mt-2">
        <Search size={18} className="search-input__icon" aria-hidden="true" />
        <input
          id={inputId}
          className="input search-input__field"
          type="text"
          placeholder="Type a city — Kuala Lumpur, Penang, Tokyo, London…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
          aria-autocomplete="list"
        />
        {loading && (
          <span className="search-input__spinner" aria-hidden="true" />
        )}
        {query && !loading && (
          <button
            type="button"
            className="search-input__clear"
            onClick={clear}
            aria-label="Clear destination"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {error && (
        <div style={{ fontSize: "0.75rem", marginTop: 6, color: "var(--brand-orange)" }}>
          {error}
        </div>
      )}

      {open && suggestions.length > 0 && (
        <div
          className="card flat"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: 6,
            padding: 4,
            maxHeight: 320,
            overflowY: "auto",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => pick(s)}
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
                <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{s.mainText}</div>
                {s.secondaryText && (
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>{s.secondaryText}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
