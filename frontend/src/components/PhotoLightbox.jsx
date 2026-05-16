import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Star, Loader2 } from "lucide-react";
import { getPlacePhotoUrl } from "../utils/placesPhoto.js";

const HIGH_RES_WIDTH = 1600;

export default function PhotoLightbox({ business, thumbnailSrc, onClose }) {
  const [highResSrc, setHighResSrc] = useState(null);
  const [highResLoaded, setHighResLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHighResSrc(null);
    setHighResLoaded(false);
    if (!business) return;
    getPlacePhotoUrl(business, { maxWidth: HIGH_RES_WIDTH }).then((url) => {
      if (!cancelled && url) setHighResSrc(url);
    });
    return () => { cancelled = true; };
  }, [business]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!business) return null;

  const displaySrc = highResSrc || thumbnailSrc;
  const isLoadingHighRes = Boolean(highResSrc) && !highResLoaded;
  const isAwaitingHighRes = !highResSrc;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return createPortal(
    <motion.div
      className="photo-lightbox-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo of ${business.name}`}
    >
      <motion.div
        className="photo-lightbox-frame"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <button
          type="button"
          className="photo-lightbox-close"
          onClick={onClose}
          aria-label="Close photo"
        >
          <X size={20} />
        </button>

        {displaySrc && (
          <img
            key={displaySrc}
            src={displaySrc}
            alt={business.name}
            className="photo-lightbox-image"
            onLoad={() => {
              if (highResSrc && displaySrc === highResSrc) setHighResLoaded(true);
            }}
          />
        )}

        {(isAwaitingHighRes || isLoadingHighRes) && (
          <div className="photo-lightbox-spinner" aria-hidden="true">
            <Loader2 size={14} className="photo-lightbox-spin" />
            <span>loading high-res…</span>
          </div>
        )}

        <div className="photo-lightbox-caption">
          <strong>{business.name}</strong>
          <span className="photo-lightbox-caption-meta">
            {business.type}
            {business.rating > 0 && (
              <>
                {" · "}
                <Star size={11} style={{ display: "inline", color: "var(--review-yellow)", fill: "var(--review-yellow)" }} />
                {" "}
                {business.rating}
              </>
            )}
            {business.avg_spend_myr > 0 && (
              <>
                {" · "}
                <span style={{ color: "var(--brand-orange)", fontWeight: 600 }}>RM{business.avg_spend_myr}</span>
              </>
            )}
          </span>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
