import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { TranslateAPI } from "../api/client.js";

const LangCtx = createContext(null);

const LANGS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ms", label: "Bahasa Malaysia", flag: "🇲🇾" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

export function LanguageProvider({ children }) {
  const [target, setTarget] = useState("en");
  const [cache, setCache] = useState({});  // { en: text -> translated }

  const translate = useCallback(
    async (text) => {
      if (!text || target === "en") return text;
      const key = `${target}::${text}`;
      if (cache[key]) return cache[key];
      try {
        const res = await TranslateAPI.text(text, target, "en");
        const out = res.translated;
        setCache((prev) => ({ ...prev, [key]: out }));
        return out;
      } catch (err) {
        console.warn("translate failed", err);
        return text;
      }
    },
    [target, cache]
  );

  const value = useMemo(
    () => ({ target, setTarget, translate, LANGS }),
    [target, translate]
  );
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
