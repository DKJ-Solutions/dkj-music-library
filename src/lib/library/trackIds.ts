// EIGEN TRACK-ID'S UIT DE SPOTIFY-SNAPSHOT: elk NUMMER krijgt één ID, bv. PRO02-01 of MAR01-BRU01-01.
//
// HET FORMAAT: <dkj_artist_id>-<dkj_artist_id>-...-<volgnummer>: de eigen ID's van ALLE artiesten van
// het nummer, in de volgorde die Spotify noemt (dus hoofdartiest eerst, gelijk aan `dkj_artist_ids`),
// met een streepje ertussen, en daarachter een volgnummer. Firestarter van The Prodigy (PRO02) is
// PRO02-21; Uptown Funk van Mark Ronson (MAR01) en Bruno Mars (BRU01) is MAR01-BRU01-01. Het
// volgnummer telt per combinatie van artiesten: het laagste dat voor die combinatie nog vrij is,
// minstens twee cijfers, en het groeit door na 99 (IMM01-143). Het laatste stuk na een streepje is dus
// altijd het volgnummer. Heeft geen enkele artiest (nog) een eigen ID, dan wordt het XXX00-NN.
// Artiesten krijgen daarom eerst hun ID (artistIds.ts, applyLibraryIdsFromSnapshot), daarna de nummers.
//
// Een nummer is niet hetzelfde als een Spotify-track. Dezelfde opname staat vaak meerdere keren op
// Spotify (single, album, compilatie), elk met een eigen Spotify-ID. Twee Spotify-tracks tellen als
// hetzelfde nummer als de titel gelijk is (hoofdletterongevoelig, spaties aan de randen genegeerd) en
// de artiesten precies dezelfde zijn (op artist-id). Een "Radio Edit" of remix heeft een andere titel
// en blijft dus een eigen nummer.
//
// STABIEL OVER SYNCS HEEN. De koppeltabel `spotify_track_ids` onthoudt per Spotify-ID welk eigen ID
// het kreeg, samen met de nummer-sleutel. Een bekend Spotify-ID houdt zijn ID. Een nieuw Spotify-ID
// van een bekend nummer krijgt het ID van dat nummer, ook als de oude variant intussen uit je
// playlists is verdwenen. Alleen een echt nieuw nummer krijgt een nieuw ID. Een ID verandert daarna
// niet meer, ook niet als je `dkj_artist_ids` later zelf aanpast.
//
// DE OUDE ID'S (T000001, tot 27 september 2026) worden één keer omgenummerd door
// renumberLegacyTrackIds(): per artiestencombinatie in de volgorde van hun T-nummer, dus het oudste
// nummer van een combinatie krijgt -01. Het tussenformaat van diezelfde dag (alleen de hoofdartiest,
// MAR01-03 voor Uptown Funk) is op 27 september 2026 met renumberTrackIds() omgezet; zie het
// changelog-item van fix/track-id-all-artists.
//
// Bestaande rijen in `tracks` worden verder nooit aangepast: een nieuw nummer krijgt bij het aanmaken
// zijn Spotify-metadata (titel, artiesten, album, duur, eigen artiest-ID's), en alles wat je daarna
// zelf invult blijft staan.
//
// planTrackIds() is puur (geen database) en daardoor los te testen; applyTrackIdsFromSnapshot()
// voert het plan uit, in één transactie.
import type { DatabaseSync } from "node:sqlite";
import type { Snapshot, Track } from "@/lib/spotify/types";
import { TRACKS_TABLE, renameLegacyColumn } from "./db";
import {
  ALBUM_ARTIST_KEY,
  ARTIST_IDS_KEY,
  LEGACY_TRACK_ID_KEY,
  PRIMARY_ARTIST_KEY,
  TRACK_FIELDS,
  TRACK_ID_KEY,
  albumArtistOf,
} from "./fields";
import { toSqlValue, type TrackValue } from "./trackStore";

export const SPOTIFY_LINK_TABLE = "spotify_track_ids";

/** Het artiest-deel van een track-ID als geen van de artiesten een eigen ID heeft. */
export const NO_ARTIST_ID = "XXX00";

const NUMBER_DIGITS = 2;
const OWN_ID_SHAPE = /^(.+)-(\d+)$/;
const LEGACY_ID_SHAPE = /^T\d+$/;

/** Het eigen ID van het `n`-de nummer van een artiest of combinatie: PRO02-01, MAR01-BRU01-01. Na 99
 *  groeit het door (IMM01-100). */
export function formatTrackId(artistId: string, n: number): string {
  return `${artistId}-${String(n).padStart(NUMBER_DIGITS, "0")}`;
}

/** De sleutel waarop Spotify-tracks tot één nummer samenvallen: titel + gesorteerde artist-id's. */
export function songKey(track: Pick<Track, "name" | "artists">): string {
  const artists = track.artists.map((a) => a.id).sort().join(",");
  return `${track.name.trim().toLowerCase()}|${artists}`;
}

/** Deelt nieuwe volgnummers uit per artiest-ID: steeds het laagste dat nog vrij is. */
class TrackNumbers {
  private used = new Map<string, Set<number>>();

  constructor(existingTrackIds: Iterable<string>) {
    for (const id of existingTrackIds) {
      const hit = OWN_ID_SHAPE.exec(id);
      if (hit) this.taken(hit[1]).add(Number(hit[2]));
    }
  }

  private taken(artistId: string): Set<number> {
    if (!this.used.has(artistId)) this.used.set(artistId, new Set());
    return this.used.get(artistId)!;
  }

  next(artistId: string): string {
    const taken = this.taken(artistId);
    let n = 1;
    while (taken.has(n)) n++;
    taken.add(n);
    return formatTrackId(artistId, n);
  }
}

/** Spotify-artist-id -> eigen artiest-ID (uit de tabel `artists`, zie artistIds.ts). */
export type ArtistIdMap = ReadonlyMap<string, string>;

function ownArtistIds(track: Track, artistIdOf: ArtistIdMap): string[] {
  return track.artists.map((a) => (a.id ? artistIdOf.get(a.id) : undefined)).filter((id): id is string => !!id);
}

/** Het artiest-deel van een track-ID: alle eigen artiest-ID's in volgorde, met streepjes. Krijgt dezelfde
 *  lijst als `dkj_artist_ids` (ownArtistIds, ook in metadataOf), zodat ID en veld altijd overeenkomen. */
export function artistPart(artistIds: readonly string[]): string {
  return artistIds.length > 0 ? artistIds.join("-") : NO_ARTIST_ID;
}

export interface SpotifyLink {
  spotifyTrackId: string;
  trackId: string;
  songKey: string;
}

export interface NewTrack {
  trackId: string;
  /** De Spotify-track waarmee dit nummer voor het eerst gezien werd; levert de metadata. */
  track: Track;
}

export interface TrackIdPlan {
  /** Nummers die nog geen eigen ID hadden, in volgorde van toekenning. */
  newTracks: NewTrack[];
  /** Spotify-ID's die nog niet in de koppeltabel stonden (ook nieuwe varianten van bekende nummers). */
  newLinks: SpotifyLink[];
}

/** Bepaalt welke Spotify-tracks uit de snapshot een (nieuw of bestaand) eigen ID krijgen. Volgorde van
 *  toekenning = volgorde van eerste voorkomen in de snapshot (playlist voor playlist), zodat hetzelfde
 *  snapshot altijd dezelfde nummers oplevert. Items zonder track of zonder Spotify-ID worden
 *  overgeslagen. */
export function planTrackIds(
  snapshot: Snapshot,
  existingLinks: readonly SpotifyLink[],
  existingTrackIds: readonly string[],
  artistIdOf: ArtistIdMap
): TrackIdPlan {
  const bySpotifyId = new Map(existingLinks.map((link) => [link.spotifyTrackId, link.trackId]));
  const bySongKey = new Map(existingLinks.map((link) => [link.songKey, link.trackId]));
  const numbers = new TrackNumbers(existingTrackIds);

  const plan: TrackIdPlan = { newTracks: [], newLinks: [] };
  for (const playlist of snapshot.playlists) {
    for (const item of playlist.tracks) {
      const track = item.track;
      if (!track?.id || bySpotifyId.has(track.id)) continue;

      const key = songKey(track);
      let trackId = bySongKey.get(key);
      if (!trackId) {
        trackId = numbers.next(artistPart(ownArtistIds(track, artistIdOf)));
        bySongKey.set(key, trackId);
        plan.newTracks.push({ trackId, track });
      }
      bySpotifyId.set(track.id, trackId);
      plan.newLinks.push({ spotifyTrackId: track.id, trackId, songKey: key });
    }
  }
  return plan;
}

/** Maakt de koppeltabel als die er nog niet is. */
export function ensureSpotifyLinkTable(db: DatabaseSync): void {
  renameLegacyColumn(db, SPOTIFY_LINK_TABLE, LEGACY_TRACK_ID_KEY, TRACK_ID_KEY);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${SPOTIFY_LINK_TABLE} (
      spotify_track_id TEXT PRIMARY KEY NOT NULL,
      ${TRACK_ID_KEY} TEXT NOT NULL,
      song_key TEXT NOT NULL
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS ${SPOTIFY_LINK_TABLE}_song_key ON ${SPOTIFY_LINK_TABLE} (song_key)`);
}

function readLinks(db: DatabaseSync): SpotifyLink[] {
  const rows = db
    .prepare(`SELECT spotify_track_id, ${TRACK_ID_KEY}, song_key FROM ${SPOTIFY_LINK_TABLE}`)
    .all() as { spotify_track_id: string; dkj_track_id: string; song_key: string }[];
  return rows.map((row) => ({ spotifyTrackId: row.spotify_track_id, trackId: row.dkj_track_id, songKey: row.song_key }));
}

/** De Spotify-metadata waarmee een nieuw nummer in `tracks` komt. */
function metadataOf(track: Track, artistIdOf: ArtistIdMap): Record<string, TrackValue> {
  const ownIds = ownArtistIds(track, artistIdOf);
  return {
    spotify_track_id: track.id,
    title: track.name,
    artists: track.artists.map((a) => a.name),
    album: track.album.name,
    duration_ms: track.durationMs,
    [ARTIST_IDS_KEY]: ownIds.length > 0 ? ownIds : null,
    [PRIMARY_ARTIST_KEY]: track.artists[0]?.name ?? null,
    [ALBUM_ARTIST_KEY]: albumArtistOf(track.artists.map((a) => a.name)),
  };
}

export interface TrackIdResult {
  /** Nummers die in deze run een nieuw eigen ID kregen. */
  newTracks: number;
  /** Spotify-ID's die in deze run gekoppeld werden (nieuwe nummers + nieuwe varianten). */
  newLinks: number;
  /** Totaal aantal Spotify-ID's in de koppeltabel na deze run. */
  totalLinks: number;
}

function allTrackIds(db: DatabaseSync): string[] {
  return (db.prepare(`SELECT ${TRACK_ID_KEY} FROM ${TRACKS_TABLE}`).all() as { dkj_track_id: string }[]).map(
    (row) => row.dkj_track_id
  );
}

/** Kent eigen ID's toe aan alles in de snapshot wat er nog geen heeft, in één transactie. Opnieuw
 *  draaien op dezelfde snapshot doet niets. Ken eerst de artiest-ID's toe; gebruik daarom meestal
 *  applyLibraryIdsFromSnapshot() uit artistIds.ts. */
export function applyTrackIdsFromSnapshot(
  db: DatabaseSync,
  snapshot: Snapshot,
  artistIdOf: ArtistIdMap
): TrackIdResult {
  ensureSpotifyLinkTable(db);
  const links = readLinks(db);
  const plan = planTrackIds(snapshot, links, allTrackIds(db), artistIdOf);

  const fields = new Map(TRACK_FIELDS.map((field) => [field.key, field]));
  const now = new Date().toISOString();
  const insertLink = db.prepare(
    `INSERT INTO ${SPOTIFY_LINK_TABLE} (spotify_track_id, ${TRACK_ID_KEY}, song_key) VALUES (?, ?, ?)`
  );

  db.exec("BEGIN");
  try {
    for (const { trackId, track } of plan.newTracks) {
      // Alleen velden die (nog) in fields.ts staan -- wie er een weghaalt, krijgt hier geen fout.
      const entries = Object.entries(metadataOf(track, artistIdOf)).filter(([key]) => fields.has(key));
      const columns = [TRACK_ID_KEY, "created_at", "updated_at", ...entries.map(([key]) => key)];
      db.prepare(
        `INSERT INTO ${TRACKS_TABLE} (${columns.map((c) => `"${c}"`).join(", ")}) ` +
          `VALUES (${columns.map(() => "?").join(", ")}) ON CONFLICT(${TRACK_ID_KEY}) DO NOTHING`
      ).run(trackId, now, now, ...entries.map(([key, value]) => toSqlValue(fields.get(key)!, value)));
    }
    for (const link of plan.newLinks) insertLink.run(link.spotifyTrackId, link.trackId, link.songKey);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return {
    newTracks: plan.newTracks.length,
    newLinks: plan.newLinks.length,
    totalLinks: links.length + plan.newLinks.length,
  };
}

function parseArtistIds(value: string | null): string[] {
  try {
    const ids = value ? (JSON.parse(value) as unknown) : null;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string" && id !== "") : [];
  } catch {
    return []; // met de hand verknoeid; valt terug op XXX00
  }
}

/** Volgorde waarin tracks bij het omnummeren hun nieuwe volgnummer krijgen: op het oude ID, met het
 *  getal als getal (T1000000 na T999999, MAR01-10 na MAR01-09). */
function oldOrder(a: string, b: string): number {
  const split = (id: string): [string, number] => {
    const own = OWN_ID_SHAPE.exec(id);
    if (own) return [own[1], Number(own[2])];
    if (LEGACY_ID_SHAPE.test(id)) return ["T", Number(id.slice(1))];
    return [id, 0];
  };
  const [pa, na] = split(a);
  const [pb, nb] = split(b);
  return pa < pb ? -1 : pa > pb ? 1 : na - nb;
}

/** Geeft elke track waarvoor `isStale` waar is een nieuw ID uit zijn huidige `dkj_artist_ids`, in één
 *  transactie, en werkt de koppeltabel mee bij. Volgorde van toekenning = volgorde van het oude ID.
 *  Geeft het aantal omgenummerde tracks terug. Bewust niet automatisch voor elk ID: een ID verandert
 *  niet meer zodra het bestaat, ook niet als `dkj_artist_ids` later wijzigt. */
export function renumberTrackIds(
  db: DatabaseSync,
  isStale: (trackId: string, artistIds: readonly string[]) => boolean
): number {
  ensureSpotifyLinkTable(db);
  const stale = (
    db
      .prepare(`SELECT ${TRACK_ID_KEY}, "${ARTIST_IDS_KEY}" FROM ${TRACKS_TABLE}`)
      .all() as { dkj_track_id: string; dkj_artist_ids: string | null }[]
  )
    .map((row) => ({ id: row.dkj_track_id, artistIds: parseArtistIds(row.dkj_artist_ids) }))
    .filter((row) => isStale(row.id, row.artistIds))
    .sort((a, b) => oldOrder(a.id, b.id));
  if (stale.length === 0) return 0;

  // Alle bestaande ID's tellen als bezet, ook de oude die nog omgezet worden: zo kan een nieuw ID nooit
  // samenvallen met een rij die nog niet aan de beurt was.
  const numbers = new TrackNumbers(allTrackIds(db));
  const now = new Date().toISOString();
  const renameTrack = db.prepare(`UPDATE ${TRACKS_TABLE} SET ${TRACK_ID_KEY} = ?, updated_at = ? WHERE ${TRACK_ID_KEY} = ?`);
  const renameLinks = db.prepare(`UPDATE ${SPOTIFY_LINK_TABLE} SET ${TRACK_ID_KEY} = ? WHERE ${TRACK_ID_KEY} = ?`);

  db.exec("BEGIN");
  try {
    for (const row of stale) {
      const id = numbers.next(artistPart(row.artistIds));
      renameTrack.run(id, now, row.id);
      renameLinks.run(id, row.id);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return stale.length;
}

/** Nummert elke track met een oud ID (T000001) om naar het huidige formaat. Een tweede keer doet niets:
 *  dat formaat wordt nergens meer gemaakt. */
export function renumberLegacyTrackIds(db: DatabaseSync): number {
  return renumberTrackIds(db, (trackId) => LEGACY_ID_SHAPE.test(trackId));
}
