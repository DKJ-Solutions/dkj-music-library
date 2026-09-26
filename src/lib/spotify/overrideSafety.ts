// Gedeelde veiligheidslaag voor de drie sync-bestendige override-stores (bpmStore.ts,
// worldStore.ts, doneStore.ts) -- elk bewaart een JSON-object met de playlist-id als sleutel.
// Zonder voorzorg zou een playlistId als "__proto__" of "constructor" via bracket-assignment
// (`overrides[playlistId] = ...`) het prototype van het overrides-object kunnen herschrijven
// (prototype pollution), en zou `playlistId in overrides` stilzwijgend "true" kunnen teruggeven
// voor een geërfde Object.prototype-eigenschap (bv. "toString") die nooit een echte override is.
// Drie maatregelen, samen en consistent toegepast door alle drie de stores:
//   1. createOverrideContainer()/readOverrideFile() -- een object ZONDER prototype
//      (Object.create(null)), zodat zelfs een sleutel als "__proto__" gewoon als een eigen
//      eigenschap landt, nooit als een prototype-herschrijving.
//   2. hasOverride() -- Object.prototype.hasOwnProperty.call(...) i.p.v. de `in`-operator, zodat
//      een geërfde naam nooit als "bestaande override" telt.
//   3. isValidPlaylistId() -- een lichte vorm-check (Spotify-playlist-ids zijn kale alfanumerieke
//      strings) vóór een playlistId als sleutel bij een SCHRIJFACTIE (set) gebruikt wordt -- zie
//      ook de gelijknamige check op de API-routes (api/spotify/bpm|world|done/route.ts), die
//      dezelfde vorm afdwingt vóórdat een request de store bereikt.
//
// SERVER-ONLY: gebruikt Node's `fs`, mag dus nooit vanuit een 'use client'-bestand geïmporteerd
// worden.
import fs from "fs";

const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9]+$/;
const MAX_PLAYLIST_ID_LENGTH = 64; // ruime marge -- Spotify's eigen ids zijn 22 tekens

/** Spotify-playlist-ids zijn kale alfanumerieke strings -- nooit leeg, nooit "__proto__" /
 *  "constructor", nooit iets met punten/slashes/underscores erin. Gedeeld door de drie stores én
 *  de API-routes, zodat "wat een geldige playlist-id is" op precies één plek staat. */
export function isValidPlaylistId(playlistId: string): boolean {
  return (
    typeof playlistId === "string" &&
    playlistId.length > 0 &&
    playlistId.length <= MAX_PLAYLIST_ID_LENGTH &&
    PLAYLIST_ID_PATTERN.test(playlistId)
  );
}

/** Een nieuw, leeg overrides-object ZONDER prototype (maatregel 1 hierboven). */
export function createOverrideContainer<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

/** Leest+parseert een override-JSON-bestand naar een object zonder prototype. Ontbreekt het
 *  bestand, of is de inhoud geen geldige JSON, dan komt er een leeg (eveneens prototype-loos)
 *  object terug -- `warnLabel` identificeert de aanroepende store in de console-waarschuwing
 *  (zelfde boodschap-vorm als voorheen, nu op één gedeelde plek). */
export function readOverrideFile<T>(storePath: string, warnLabel: string): Record<string, T> {
  const overrides = createOverrideContainer<T>();
  if (!fs.existsSync(storePath)) return overrides;

  try {
    const raw = fs.readFileSync(storePath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, T>;
    // Kopieert veld-voor-veld in het prototype-loze object i.p.v. het geparste object zelf terug
    // te geven -- JSON.parse() levert een gewoon object op (met Object.prototype in zijn keten),
    // dus alleen déze stap voorkomt dat een sleutel als "__proto__" uit het bestand zelf verderop
    // (bv. bij een write-modify-write) alsnog een echte prototype-herschrijving zou kunnen zijn.
    for (const key of Object.keys(parsed)) {
      overrides[key] = parsed[key];
    }
    return overrides;
  } catch (err) {
    console.warn(
      `[spotify/${warnLabel}] kon ${storePath} niet lezen, behandel als geen bekende override:`,
      err
    );
    return overrides;
  }
}

/** Bestaat er een override voor deze playlist? `hasOwnProperty`-gebaseerd (maatregel 2
 *  hierboven) i.p.v. de `in`-operator. */
export function hasOverride<T>(overrides: Record<string, T>, playlistId: string): boolean {
  return Object.prototype.hasOwnProperty.call(overrides, playlistId);
}
