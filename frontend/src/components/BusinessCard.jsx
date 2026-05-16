import { Star, MoonStar, Accessibility, MapPin } from "lucide-react";
import { getPhotoForBusiness } from "../utils/photos.js";

export default function BusinessCard({ business, compact = false }) {
  if (!business) return null;
  const halal = business.constraints_met?.halal?.certified;
  const wheelchair = business.constraints_met?.accessibility?.wheelchair;
  const photo = getPhotoForBusiness(business);

  if (compact) {
    return (
      <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            flexShrink: 0,
            position: "relative",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <img
            src={photo}
            alt=""
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row-tight" style={{ flexWrap: "wrap" }}>
            <strong style={{ fontSize: "0.9375rem", color: "var(--text-primary)" }}>
              {business.name}
            </strong>
            {halal && (
              <span className="chip orange" style={{ padding: "2px 6px", fontSize: "0.6875rem" }}>
                <MoonStar size={10} /> Halal
              </span>
            )}
            {wheelchair && (
              <span className="chip brand" style={{ padding: "2px 6px", fontSize: "0.6875rem" }}>
                <Accessibility size={10} /> Access
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="photo-card">
      <div className="photo">
        <img
          src={photo}
          alt={business.name}
          loading="lazy"
        />
        <div className="photo-overlay-top">
          <div className="row-tight" style={{ gap: 6 }}>
            {halal && (
              <span className="badge orange">
                <MoonStar size={11} /> Halal
              </span>
            )}
            {wheelchair && (
              <span className="badge blue">
                <Accessibility size={11} /> Access
              </span>
            )}
          </div>
          {business.rating > 0 && (
            <span className="badge yellow">
              <Star size={11} style={{ fill: "currentColor" }} /> {business.rating}
            </span>
          )}
        </div>
      </div>
      <div className="body">
        <div className="row-tight" style={{ justifyContent: "space-between" }}>
          <strong style={{ fontSize: "1rem", color: "var(--text-primary)", lineHeight: 1.3 }}>
            {business.name}
          </strong>
        </div>
        <div className="text-secondary" style={{ fontSize: "0.8125rem", textTransform: "capitalize" }}>
          {business.type}
        </div>
        {business.address && (
          <div className="row-tight text-muted" style={{ fontSize: "0.75rem", gap: 4 }}>
            <MapPin size={11} /> {business.address}
          </div>
        )}
        {business.avg_spend_myr > 0 && (
          <div style={{ marginTop: 4, fontSize: "0.875rem" }}>
            From <span style={{ color: "var(--brand-orange)", fontWeight: 700 }}>RM{business.avg_spend_myr}</span>
            <span className="text-muted" style={{ fontSize: "0.75rem" }}> /person</span>
          </div>
        )}
      </div>
    </div>
  );
}
