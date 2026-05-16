import { Globe } from "lucide-react";
import { useLanguage } from "../hooks/useTranslation.jsx";

export default function LanguageSwitcher() {
  const { target, setTarget, LANGS } = useLanguage();
  return (
    <div className="row">
      <Globe size={16} color="#B8E6F5" />
      <select
        className="select"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        style={{ width: "auto", padding: "8px 12px" }}
        aria-label="Translate itinerary"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
