/**
 * Photo helper — maps a business (by id or by type fallback) to a stable
 * Unsplash hotlink so the UI can be photo-led without bundling images.
 * URLs use ?w=800&auto=format&fit=crop&q=70 to stay light.
 */

const BASE = "https://images.unsplash.com";
const PARAMS = "?w=800&auto=format&fit=crop&q=70";

const PHOTO_MAP = {
  biz_petronas_twin_towers: `${BASE}/photo-1596422846543-75c6fc197f07${PARAMS}`,
  biz_kl_tower:             `${BASE}/photo-1535970793482-07de93762dc4${PARAMS}`,
  biz_batu_caves:           `${BASE}/photo-1582461683458-a8de1abd5a91${PARAMS}`,
  biz_islamic_arts_museum:  `${BASE}/photo-1568910748155-01ca989dbdd6${PARAMS}`,
  biz_national_mosque:      `${BASE}/photo-1578926288207-32356a08c5a0${PARAMS}`,
  biz_klcc_park:            `${BASE}/photo-1572332622-1ce5e4d1d0f4${PARAMS}`,
  biz_thean_hou_temple:     `${BASE}/photo-1556895499-5c69ea1b1eaf${PARAMS}`,
  biz_central_market:       `${BASE}/photo-1601928336443-a849b0e3e83a${PARAMS}`,
  biz_lake_gardens:         `${BASE}/photo-1502884373138-7407eb19d6e3${PARAMS}`,
  biz_aquaria_klcc:         `${BASE}/photo-1535591273668-578e31182c4f${PARAMS}`,
  biz_kl_bird_park:         `${BASE}/photo-1452728960260-7f12f775b9d8${PARAMS}`,
  biz_petaling_street:      `${BASE}/photo-1583729242985-296ed8e1b502${PARAMS}`,
  biz_pavilion_kl:          `${BASE}/photo-1567401893414-76b7b1e5a7a5${PARAMS}`,
  biz_suria_klcc:           `${BASE}/photo-1570214476695-19bd467e6f7a${PARAMS}`,
  biz_mid_valley:           `${BASE}/photo-1581235720704-06d3acfcb36f${PARAMS}`,
  biz_bukit_bintang:        `${BASE}/photo-1596422846543-75c6fc197f07${PARAMS}`,
  biz_jalan_alor:           `${BASE}/photo-1504674900247-0877df9cc836${PARAMS}`,
  biz_kampung_baru_walking_tour: `${BASE}/photo-1532375810709-75b1da00537c${PARAMS}`,
  biz_merdeka_square:       `${BASE}/photo-1605552251716-a8d09e74e0b1${PARAMS}`,
  biz_sultan_abdul_samad:   `${BASE}/photo-1577717903315-1691ae25ab3f${PARAMS}`,
  biz_nasi_kandar_pelita:   `${BASE}/photo-1631515243349-e0cb75fb8d3a${PARAMS}`,
  biz_village_park:         `${BASE}/photo-1565299624946-b28f40a0ae38${PARAMS}`,
  biz_madam_kwan:           `${BASE}/photo-1567337710282-00832b415979${PARAMS}`,
  biz_jaslyn_cakes:         `${BASE}/photo-1559925393-8be0ec4767c8${PARAMS}`,
  biz_restoran_rebung:      `${BASE}/photo-1565299507177-b0ac66763828${PARAMS}`,
  biz_atmosphere_360:       `${BASE}/photo-1414235077428-338989a2e8c0${PARAMS}`,
  biz_kafe_attar:           `${BASE}/photo-1554118811-1e0d58224f24${PARAMS}`,
  biz_riwayat:              `${BASE}/photo-1565299543923-37dd37887442${PARAMS}`,
  biz_alrayyan:             `${BASE}/photo-1565299715199-866c917206bb${PARAMS}`,
  biz_dapur_jepun_kita:     `${BASE}/photo-1553621042-f6e147245754${PARAMS}`,
  biz_dolly_dim_sum:        `${BASE}/photo-1496116218417-1a781b1c416c${PARAMS}`,
  biz_telawi_street:        `${BASE}/photo-1554118811-1e0d58224f24${PARAMS}`,
  biz_rebung_terrace:       `${BASE}/photo-1521017432531-fbd92d768814${PARAMS}`,
  biz_concorde_kl:          `${BASE}/photo-1566073771259-6a8506099945${PARAMS}`,
  biz_grand_hyatt_kl:       `${BASE}/photo-1551882547-ff40c63fe5fa${PARAMS}`,
  biz_signature_kl:         `${BASE}/photo-1564501049412-61c2a3083791${PARAMS}`,
  biz_kl_journal:           `${BASE}/photo-1582719508461-905c673771fd${PARAMS}`,
};

const FALLBACK_BY_TYPE = {
  restaurant: `${BASE}/photo-1517248135467-4c7edcad34c4${PARAMS}`,
  cafe:       `${BASE}/photo-1554118811-1e0d58224f24${PARAMS}`,
  attraction: `${BASE}/photo-1564507592333-c60657eea523${PARAMS}`,
  shopping:   `${BASE}/photo-1567401893414-76b7b1e5a7a5${PARAMS}`,
  hotel:      `${BASE}/photo-1566073771259-6a8506099945${PARAMS}`,
  cultural:   `${BASE}/photo-1568910748155-01ca989dbdd6${PARAMS}`,
  park:       `${BASE}/photo-1502884373138-7407eb19d6e3${PARAMS}`,
};

const HERO_IMAGES = [
  `${BASE}/photo-1596422846543-75c6fc197f07${PARAMS}`,  // KL skyline
  `${BASE}/photo-1582461683458-a8de1abd5a91${PARAMS}`,  // Batu Caves
  `${BASE}/photo-1568910748155-01ca989dbdd6${PARAMS}`,  // Islamic Arts Museum
];

export function getPhotoForBusiness(b) {
  if (!b) return FALLBACK_BY_TYPE.attraction;
  return (
    PHOTO_MAP[b.id] ||
    PHOTO_MAP[b._id] ||
    FALLBACK_BY_TYPE[b.type] ||
    FALLBACK_BY_TYPE.attraction
  );
}

export function getHeroImage(idx = 0) {
  return HERO_IMAGES[idx % HERO_IMAGES.length];
}
