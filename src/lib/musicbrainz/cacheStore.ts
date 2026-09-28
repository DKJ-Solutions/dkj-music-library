// Lokale cache van MusicBrainz-jaren, per Spotify-track-id (issue #45): data/musicbrainz/release-
// years.json, dezelfde al git-ignored data/-map als de Spotify-snapshot en de trackdatabase (zie
// .gitignore in de root -- "data/*" dekt ook deze nieuwe submap, geen aanpassing nodig).
//
// Het ophalen zelf (het echte netwerkverzoek, met MusicBrainz' regel van hooguit 1 verzoek per seconde)
// gebeurt in scripts/library/fetch-release-years.ts. Deze module doet zelf NOOIT een netwerkverzoek --
// de pagina's die het jaar tonen (en releaseYears.ts bij het vullen van de bibliotheek) lezen alleen
// deze cache, en vallen bij een lees- of parseerfout terug op "geen MusicBrainz-jaar bekend" in plaats
// van te crashen.
//
// Ook "niet gevonden" (year: null) wordt bewaard: zonder dat zou het script bij elke run opnieuw vragen
// naar een track die MusicBrainz toch nooit teruggeeft.
//
// SERVER-ONLY: gebruikt Node's `fs`, mag dus nooit vanuit een 'use client'-bestand geïmporteerd worden.
import fs from "fs";
import path from "path";

const DEFAULT_CACHE_PATH = path.join(process.cwd(), "data", "musicbrainz", "release-years.json");

export interface ReleaseYearCacheEntry {
  /** null = MusicBrainz kende geen bruikbare kandidaat voor deze track (zie chooseRelease() in
   *  releaseYear.ts) -- ook dat wordt bewaard, zie de kop hierboven. */
  year: number | null;
  /** De MusicBrainz-recording waaruit `year` kwam; afwezig als `year` null is. */
  recordingId?: string;
  /** ISO-tijdstip van deze opvraging. */
  fetchedAt: string;
}

/** sleutel: Spotify-track-id. */
export type ReleaseYearCache = Map<string, ReleaseYearCacheEntry>;

function getCachePath(): string {
  const override = process.env.MUSICBRAINZ_RELEASE_YEAR_CACHE_PATH;
  return override ? path.resolve(override) : DEFAULT_CACHE_PATH;
}

/** Leest de cache; een ontbrekend of kapot bestand levert een lege Map (net als readSnapshot() in
 *  spotify/snapshotStore.ts) -- een lezer hoeft daar nooit op te crashen. */
export function readReleaseYearCache(): ReleaseYearCache {
  const cachePath = getCachePath();
  if (!fs.existsSync(cachePath)) return new Map();

  try {
    const raw = fs.readFileSync(cachePath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, ReleaseYearCacheEntry>;
    return new Map(Object.entries(parsed));
  } catch (err) {
    console.warn(`[musicbrainz/cacheStore] kon ${cachePath} niet lezen, behandel als lege cache:`, err);
    return new Map();
  }
}

/** Schrijft de cache atomair: eerst een tijdelijk bestand, dan hernoemen -- zelfde recept als
 *  writeAtomic() in library/libraryFile.ts, zodat een onderbroken schrijfactie (crash, afgebroken
 *  script) nooit een half bestand achterlaat. */
export function writeReleaseYearCache(cache: ReleaseYearCache): void {
  const cachePath = getCachePath();
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  const content = JSON.stringify(Object.fromEntries(cache), null, 2);
  const tmp = `${cachePath}.tmp`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, cachePath);
}

/** Spotify-track-id -> MusicBrainz-jaar, alleen de tracks waarvoor MusicBrainz ook echt een jaar
 *  teruggaf ("niet gevonden", `year: null`, telt hier niet mee). Gebruikt door zowel
 *  library/releaseYears.ts (het vullen van de bibliotheek) als spotify/playlistTableRows.ts (de
 *  Maple Classic-pagina) -- één plek voor "wat de cache ECHT weet", zodat die twee niet uiteen kunnen
 *  lopen. */
export function foundReleaseYears(cache: ReadonlyMap<string, ReleaseYearCacheEntry>): Map<string, number> {
  const years = new Map<string, number>();
  for (const [spotifyId, entry] of cache) {
    if (entry.year !== null) years.set(spotifyId, entry.year);
  }
  return years;
}
