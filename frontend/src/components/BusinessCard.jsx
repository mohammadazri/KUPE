import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Star, MoonStar, Accessibility, MapPin, Sparkles, ShieldCheck, Clock, Quote } from "lucide-react";
import { getPhotoForBusiness } from "../utils/photos.js";
import { getPlacePhotoUrl } from "../utils/placesPhoto.js";
import PhotoLightbox from "./PhotoLightbox.jsx";

const MAPS_KEY = import.meta.env.VITE_MAPS_BROWSER_KEY;

function streetViewUrl(business, size = "800x450") {
  if (!MAPS_KEY || !business?.location?.lat || !business?.location?.lng) return null;
  const { lat, lng } = business.location;
  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&fov=80&key=${MAPS_KEY}`;
}

// Determine the trust tier for the halal claim on a given business:
// - "jakim" — seeded JAKIM-certified (green)
// - "ai_inferred" — Gemini- or regex-inferred from Google Places (amber)
// - "deterministic" — direct Places field (cyan/blue) — used for wheelchair, not halal
// - null when no halal claim is being made
function halalTier(business) {
  const certified = business?.constraints_met?.halal?.certified;
  if (!certified) return null;
  const body = business?.constraints_met?.halal?.body || "";
  if (body.startsWith("ai_inferred:")) return "ai_inferred";
  if (body.toUpperCase() === "JAKIM") return "jakim";
  if (body) return "deterministic";
  // No body but certified=true + seed source → assume jakim-equivalent
  return business?.source === "seed" ? "jakim" : "ai_inferred";
}

export default function BusinessCard({ business, compact = false }) {
  const fallback = getPhotoForBusiness(business);
  const [photo, setPhoto] = useState(fallback);
  const [errored, setErrored] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPhoto(fallback);
    setErrored(false);
    if (!business) return;
    getPlacePhotoUrl(business).then((url) => {
      if (!cancelled && url) {
        setPhoto(url);
        setErrored(false);
      }
    });
    return () => { cancelled = true; };
  }, [business, fallback]);

  const handleImgError = () => {
    const sv = streetViewUrl(business, compact ? "128x128" : "800x450");
    if (sv && photo !== sv) {
      setPhoto(sv);
    } else {
      setErrored(true);
    }
  };

  if (!business) return null;
  const halal = business.constraints_met?.halal?.certified;
  const wheelchair = business.constraints_met?.accessibility?.wheelchair;
  const hTier = halalTier(business);
  const isLive = business.source === "google_places";
  const openNow = business.opening_hours?.open_now;

  const placeholderBg = "linear-gradient(135deg, var(--brand-blue-soft) 0%, #E8EEF5 100%)";
  const initial = (business.name || "?").trim().charAt(0).toUpperCase();

  if (compact) {
    const thumbClickable = !errored;
    const openLightbox = (e) => {
      e.stopPropagation();
      setLightboxOpen(true);
    };
    const onThumbKeyDown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(e);
      }
    };
    return (
      <>
      <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
        <div
          onClick={thumbClickable ? openLightbox : undefined}
          onKeyDown={thumbClickable ? onThumbKeyDown : undefined}
          role={thumbClickable ? "button" : undefined}
          tabIndex={thumbClickable ? 0 : undefined}
          aria-label={thumbClickable ? `View photo of ${business.name}` : undefined}
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            flexShrink: 0,
            position: "relative",
            border: "1px solid var(--border-subtle)",
            background: placeholderBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: thumbClickable ? "zoom-in" : "default",
          }}
        >
          {errored ? (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                color: "var(--brand-blue)",
                fontWeight: 700,
              }}
            >
              {initial}
            </span>
          ) : (
            <img
              src={photo}
              alt=""
              loading="lazy"
              onError={handleImgError}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row-tight" style={{ flexWrap: "wrap" }}>
            <strong style={{ fontSize: "0.9375rem", color: "var(--text-primary)" }}>
              {business.name}
            </strong>
            {halal && hTier === "jakim" && (
              <span className="chip success" style={{ padding: "2px 6px", fontSize: "0.6875rem" }}>
                <ShieldCheck size={10} /> JAKIM
              </span>
            )}
            {halal && hTier === "ai_inferred" && (
              <span className="chip orange" style={{ padding: "2px 6px", fontSize: "0.6875rem" }} title="Halal status inferred by AI — verify on-site">
                <Sparkles size={10} /> AI-Halal
              </span>
            )}
            {wheelchair && (
              <span className="chip brand" style={{ padding: "2px 6px", fontSize: "0.6875rem" }}>
                <Accessibility size={10} /> Access
              </span>
            )}
            {openNow === true && (
              <span className="chip success" style={{ padding: "2px 6px", fontSize: "0.6875rem" }}>
                <Clock size={10} /> Open
              </span>
            )}
            {openNow === false && (
              <span className="chip" style={{ padding: "2px 6px", fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                <Clock size={10} /> Closed
              </span>
            )}
          </div>
          <div className="text-secondary" style={{ fontSize: "0.8125rem", marginTop: 4 }}>
            {business.type}
            {business.rating > 0 && (
              <> · <Star size={11} style={{ display: "inline", color: "var(--review-yellow)", fill: "var(--review-yellow)" }} /> {business.rating}</>
            )}
            {business.avg_spend_myr > 0 && (
              <> · <span style={{ color: "var(--brand-orange)", fontWeight: 600 }}>RM{business.avg_spend_myr}</span></>
            )}
            {isLive && <> · <span className="text-muted" style={{ fontSize: "0.6875rem" }}>via Google</span></>}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {lightboxOpen && (
          <PhotoLightbox
            business={business}
            thumbnailSrc={photo}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>
      </>
    );
  }

  return (
    <div className="photo-card">
      <div className="photo" style={{ background: placeholderBg }}>
        {errored ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontSize: "3rem",
              color: "var(--brand-blue)",
              fontWeight: 700,
            }}
          >
            {initial}
          </div>
        ) : (
          <img
            src={photo}
            alt={business.name}
            loading="lazy"
            onError={handleImgError}
          />
        )}
        <div className="photo-overlay-top">
          <div className="row-tight" style={{ gap: 6, flexWrap: "wrap" }}>
            {halal && hTier === "jakim" && (
              <span className="badge green" title="JAKIM-certified Halal">
                <ShieldCheck size={11} /> JAKIM Halal
              </span>
            )}
            {halal && hTier === "ai_inferred" && (
              <span className="badge orange" title="Halal inferred by AI from Google Places data — please verify on-site">
                <Sparkles size={11} /> AI-Inferred Halal
              </span>
            )}
            {halal && hTier === "deterministic" && (
              <span className="badge orange">
                <MoonStar size={11} /> Halal
              </span>
            )}
            {wheelchair && (
              <span className="badge blue">
                <Accessibility size={11} /> Access
              </span>
            )}
            {openNow === true && (
              <span className="badge green">
                <Clock size={11} /> Open now
              </span>
            )}
          </div>
          {business.rating > 0 && (
            <span className="badge yellow">
              <Star size={11} style={{ fill: "currentColor" }} /> {business.rating}
              {business.user_rating_count > 0 && (
                <span style={{ marginLeft: 4, opacity: 0.8 }}>({business.user_rating_count.toLocaleString()})</span>
              )}
            </span>
          )}
        </div>
      </div>
      <div className="body">
        <div className="row-tight" style={{ justifyContent: "space-between" }}>
          <strong style={{ fontSize: "1rem", color: "var(--text-primary)", lineHeight: 1.3 }}>
            {business.name}
          </strong>
          {isLive && (
            <span
              className="text-muted"
              style={{ fontSize: "0.6875rem", border: "1px solid var(--border-subtle)", padding: "1px 6px", borderRadius: 999 }}
              title="Discovered live via Google Places"
            >
              Live · Google
            </span>
          )}
        </div>
        <div className="text-secondary" style={{ fontSize: "0.8125rem", textTransform: "capitalize" }}>
          {business.type}
        </div>
        {business.address && (
          <div className="row-tight text-muted" style={{ fontSize: "0.75rem", gap: 4 }}>
            <MapPin size={11} /> {business.address}
          </div>
        )}
        {business.editorial_summary && (
          <p
            className="text-secondary"
            style={{ fontSize: "0.8125rem", margin: "8px 0 0 0", lineHeight: 1.4 }}
          >
            {business.editorial_summary}
          </p>
        )}
        {business.top_review && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              borderLeft: "3px solid var(--brand-blue)",
              background: "var(--bg-page)",
              borderRadius: 6,
              fontSize: "0.75rem",
              lineHeight: 1.45,
              color: "var(--text-secondary)",
              fontStyle: "italic",
            }}
          >
            <Quote size={12} style={{ verticalAlign: "-2px", marginRight: 4, color: "var(--brand-blue)" }} />
            {business.top_review}
          </div>
        )}
        {business.opening_hours?.weekday_descriptions?.[0] && (
          <div className="text-muted" style={{ fontSize: "0.6875rem", marginTop: 6 }}>
            <Clock size={10} style={{ verticalAlign: "-1px" }} /> {business.opening_hours.weekday_descriptions[0]}
          </div>
        )}
        {business.avg_spend_myr > 0 && (
          <div style={{ marginTop: 6, fontSize: "0.875rem" }}>
            From <span style={{ color: "var(--brand-orange)", fontWeight: 700 }}>RM{business.avg_spend_myr}</span>
            <span className="text-muted" style={{ fontSize: "0.75rem" }}> /person</span>
          </div>
        )}
      </div>
    </div>
  );
}
