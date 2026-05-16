/**
 * Client-side Google Places photo lookup.
 *
 * Uses the Maps JS Places library (already loaded by MapView) to find a
 * business by name + lat/lng and return its first photo URL. Caches results
 * in-memory and in sessionStorage so we only hit Places once per business.
 *
 * Returns null if Places is unavailable, the business can't be matched, or
 * the matched place has no photos — callers should fall back to their own
 * static image in that case.
 */

const CITY = import.meta.env.VITE_DEFAULT_CITY || "Kuala Lumpur";
const STORAGE_KEY = "kupe:placesPhoto:v1";
const MAX_WIDTH = 800;

const memoryCache = new Map();
const inflight = new Map();

function loadDiskCache() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([k, v]) => memoryCache.set(k, v));
  } catch {
    // ignore — sessionStorage may be unavailable (Safari private mode, SSR)
  }
}

function persist() {
  try {
    const obj = {};
    memoryCache.forEach((v, k) => { obj[k] = v; });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore quota / availability errors
  }
}

let diskLoaded = false;

function placesReady() {
  return Boolean(
    typeof window !== "undefined" &&
    window.google?.maps?.importLibrary
  );
}

function waitForPlaces(timeoutMs = 6000) {
  if (placesReady()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (placesReady()) return resolve(true);
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(tick, 150);
    };
    tick();
  });
}

// "Jaslyn Cakes (Bangsar)" → "Jaslyn Cakes". Parenthetical district/alt-name
// suffixes hurt Places match rates more often than they help.
function cleanName(name) {
  return name.replace(/\s*\([^)]*\)\s*/g, " ").trim();
}

let placeLibPromise = null;
async function getPlaceClass() {
  if (!placeLibPromise) {
    placeLibPromise = window.google.maps.importLibrary("places");
  }
  const lib = await placeLibPromise;
  return lib.Place;
}

async function tryQuery(Place, textQuery, locationBias) {
  try {
    const request = {
      textQuery,
      fields: ["photos", "displayName", "id"],
      maxResultCount: 1,
    };
    if (locationBias) request.locationBias = locationBias;
    const { places } = await Place.searchByText(request);
    if (!places?.length) return null;
    const photos = places[0].photos;
    if (!photos?.length) return null;
    return photos[0].getURI({ maxWidth: MAX_WIDTH });
  } catch (err) {
    if (typeof console !== "undefined") {
      console.warn("[placesPhoto] searchByText failed:", err?.message || err);
    }
    return null;
  }
}

async function findPhoto(business) {
  const Place = await getPlaceClass();
  let locationBias = null;
  if (business.location?.lat && business.location?.lng) {
    const { lat, lng } = business.location;
    // ~1km bias box centred on the business
    const d = 0.01;
    locationBias = {
      north: lat + d,
      south: lat - d,
      east: lng + d,
      west: lng - d,
    };
  }
  const cleaned = cleanName(business.name);
  const queries = [
    `${cleaned}, ${CITY}`,
    `${business.name}, ${CITY}`,
  ].filter((q, i, arr) => arr.indexOf(q) === i);

  for (const q of queries) {
    const url = await tryQuery(Place, q, locationBias);
    if (url) return url;
  }
  return null;
}

export async function getPlacePhotoUrl(business) {
  if (!business?.name) return null;
  if (!diskLoaded) { loadDiskCache(); diskLoaded = true; }

  const key = business.id || business._id || business.name;
  if (memoryCache.has(key)) return memoryCache.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    const ok = await waitForPlaces();
    if (!ok) return null;
    const url = await findPhoto(business);
    memoryCache.set(key, url);
    persist();
    return url;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
