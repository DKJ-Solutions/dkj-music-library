// Haalt voor elk nummer in de Spotify-snapshot het jaar van eerste uitgave op bij MusicBrainz, en
// bewaart het resultaat in de lokale cache (data/musicbrainz/release-years.json, zie
// src/lib/musicbrainz/cacheStore.ts) -- de pagina's lezen alleen die cache en doen zelf nooit een
// netwerkverzoek (issue #45).
//
//   npm run library:release-years                      -- alle playlists
//   npm run library:release-years -- --playlist <id>    -- alleen die playlist
//   npm run library:release-years -- --refresh          -- ook tracks die al in de cache staan opnieuw
//   npm run library:release-years -- --limit 15         -- proefrun: hooguit 15 nieuwe tracks
//
// MusicBrainz staat zonder API-key hooguit 1 verzoek per seconde toe -- dit script houdt dat tempo aan,
// ook na een 503 of een netwerkfout: dan wacht het en probeert het een beperkt aantal keer opnieuw, en
// slaat die track daarna over ZONDER hem als "niet gevonden" te cachen (het probleem was het netwerk,
// niet de track -- een volgende run mag het opnieuw proberen). De cache wordt elke SAVE_EVERY tracks
// tussentijds weggeschreven, zodat een afgebroken run niet alles kwijtraakt.
import { readSnapshot } from "../../src/lib/spotify/snapshotStore";
import { readReleaseYearCache, writeReleaseYearCache, type ReleaseYearCache } from "../../src/lib/musicbrainz/cacheStore";
import { buildSearchUrl, chooseRelease, type MusicBrainzSearchResponse } from "../../src/lib/musicbrainz/releaseYear";
import type { Snapshot } from "../../src/lib/spotify/types";

// GEEN e-mailadres in de User-Agent: deze repo is publiek (zie MusicBrainz' eigen richtlijn -- een
// identificeerbare app is genoeg, een privéadres hoort daar niet in thuis).
const USER_AGENT = "dkj-music-library/0.1.0 ( https://github.com/DKJ-Solutions/dkj-music-library )";
const REQUEST_INTERVAL_MS = 1000; // MusicBrainz' regel: hooguit 1 verzoek per seconde zonder API-key
const MAX_ATTEMPTS = 3;
const SAVE_EVERY = 25;

interface Args {
  playlistId: string | null;
  refresh: boolean;
  limit: number | null;
}

function parseArgs(argv: string[]): Args {
  let playlistId: string | null = null;
  let refresh = false;
  let limit: number | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--playlist") playlistId = argv[++i] ?? null;
    else if (argv[i] === "--refresh") refresh = true;
    else if (argv[i] === "--limit") {
      const value = Number(argv[++i]);
      if (Number.isFinite(value)) limit = value;
    }
  }
  return { playlistId, refresh, limit };
}

interface SearchTrack {
  spotifyId: string;
  title: string;
  artist: string;
}

/** Eén rij per uniek Spotify-track-id -- een nummer staat vaak in meer dan één playlist, en titel +
 *  hoofdartiest zijn voor elke variant hetzelfde. Een track zonder artiest (kan niet echt voorkomen,
 *  Spotify vult `artists` altijd) levert geen zinnige zoekopdracht op en wordt overgeslagen. */
function uniqueTracks(snapshot: Snapshot, playlistId: string | null): SearchTrack[] {
  const seen = new Map<string, SearchTrack>();
  for (const playlist of snapshot.playlists) {
    if (playlistId && playlist.id !== playlistId) continue;
    for (const item of playlist.tracks) {
      const track = item.track;
      if (!track || seen.has(track.id)) continue;
      const artist = track.artists[0]?.name;
      if (!artist) continue;
      seen.set(track.id, { spotifyId: track.id, title: track.name, artist });
    }
  }
  return [...seen.values()];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type FetchResult = MusicBrainzSearchResponse | "skip";

/** Eén opvraging, met een beperkt aantal pogingen bij een 503 of een netwerkfout -- daarna "skip"
 *  (overslaan, niet als "niet gevonden" cachen, zie de kop hierboven). */
async function fetchWithRetry(url: string): Promise<FetchResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
      if (res.status === 503) {
        console.warn(`  503 van MusicBrainz -- wacht en probeer opnieuw (poging ${attempt}/${MAX_ATTEMPTS})`);
        if (attempt < MAX_ATTEMPTS) await sleep(REQUEST_INTERVAL_MS * attempt);
        continue;
      }
      if (!res.ok) {
        console.warn(`  MusicBrainz gaf ${res.status} terug, wordt overgeslagen`);
        return "skip";
      }
      return (await res.json()) as MusicBrainzSearchResponse;
    } catch (err) {
      console.warn(`  netwerkfout (poging ${attempt}/${MAX_ATTEMPTS}):`, err instanceof Error ? err.message : err);
      if (attempt < MAX_ATTEMPTS) await sleep(REQUEST_INTERVAL_MS * attempt);
    }
  }
  return "skip";
}

async function main() {
  const { playlistId, refresh, limit } = parseArgs(process.argv.slice(2));

  const snapshot = readSnapshot();
  if (!snapshot) {
    console.error("Geen snapshot gevonden -- start eerst een sync op /spotify.");
    process.exit(1);
  }
  if (playlistId && !snapshot.playlists.some((p) => p.id === playlistId)) {
    console.error(`Playlist ${playlistId} staat niet in de snapshot.`);
    process.exit(1);
  }

  const cache: ReleaseYearCache = readReleaseYearCache();
  const tracks = uniqueTracks(snapshot, playlistId);
  const todo = tracks.filter((track) => refresh || !cache.has(track.spotifyId));
  const scoped = limit !== null ? todo.slice(0, limit) : todo;

  console.log(`${tracks.length} unieke tracks, ${todo.length} nog te doen, ${scoped.length} deze run.`);

  let found = 0;
  let notFound = 0;
  let skipped = 0;

  for (let i = 0; i < scoped.length; i++) {
    const track = scoped[i];
    const label = `[${i + 1}/${scoped.length}] ${track.artist} - ${track.title}`;
    const response = await fetchWithRetry(buildSearchUrl(track.title, track.artist));

    if (response === "skip") {
      skipped++;
      console.log(`${label} -> overgeslagen (netwerk)`);
    } else {
      const chosen = chooseRelease(response, track.artist);
      cache.set(track.spotifyId, { year: chosen?.year ?? null, recordingId: chosen?.recordingId, fetchedAt: new Date().toISOString() });
      if (chosen) found++;
      else notFound++;
      console.log(`${label} -> ${chosen?.year ?? "niet gevonden"}`);
    }

    if ((i + 1) % SAVE_EVERY === 0) writeReleaseYearCache(cache);
    if (i < scoped.length - 1) await sleep(REQUEST_INTERVAL_MS);
  }

  writeReleaseYearCache(cache);
  console.log(`Klaar: ${found} gevonden, ${notFound} niet gevonden, ${skipped} overgeslagen (netwerk).`);
}

main().catch((err) => {
  console.error("Ophalen mislukt:", err instanceof Error ? err.message : err);
  process.exit(1);
});
