// EIGEN TRACK-ID'S UIT DE SPOTIFY-SNAPSHOT: elk NUMMER krijgt één ID, bv. PRO02-01.
//
// HET FORMAAT: <dkj_artist_id van de hoofdartiest>-<volgnummer>. The Prodigy is PRO02, dus hun
// eerste nummer is PRO02-01, het tweede PRO02-02. Het volgnummer is het laagste dat voor die artiest
// nog vrij is, minstens twee cijfers, en groeit door na 99 (IMM01-143). Het streepje houdt het
// eenduidig: artiest-ID en volgnummer kunnen allebei doorgroeien, en zonder scheiding zou MAR10001
// zowel MAR100 + 01 als MAR10 + 001 kunnen zijn. De hoofdartiest is de eerste artiest die Spotify
// noemt; heeft die (nog) geen eigen ID, dan wordt het XXX00-NN. Artiesten krijgen dus eerst hun ID
// (artistIds.ts, applyLibraryIdsFromSnapshot), daarna de nummers.
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
// renumberLegacyTrackIds(): per hoofdartiest in de volgorde van hun T-nummer, dus het oudste nummer van
// een artiest krijgt -01.
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
import { ARTIST_IDS_KEY, LEGACY_TRACK_ID_KEY, TRACK_FIELDS, TRACK_ID_KEY } from "./fields";
import { toSqlValue, type TrackValue } from "./trackStore";

export const SPOTIFY_LINK_TABLE = "spotify_track_ids";

/** Het artiest-deel van een track-ID als de hoofdartiest geen eigen ID heeft. */
export const NO_ARTIST_ID = "XXX00";

const NUMBER_DIGITS = 2;
const OWN_ID_SHAPE = /^(.+)-(\d+)$/;
const LEGACY_ID_SHAPE = /^T\d+$/;

/** Het eigen ID van het `n`-de nummer van een artiest: PRO02-01. Na 99 groeit het door (IMM01-100). */
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

function mainArtistId(track: Track, artistIdOf: ArtistIdMap): string {
  const main = track.artists[0];
  return (main?.id && artistIdOf.get(main.id)) || NO_ARTIST_ID;
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
        trackId = numbers.next(mainArtistId(track, artistIdOf));
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

/** Nummert elke track met een oud ID (T000001) om naar het nieuwe formaat, in één transactie: per
 *  hoofdartiest (de eerste in `dkj_artist_ids`) in de volgorde van het oude nummer. Werkt de
 *  koppeltabel mee bij. Geeft het aantal omgenummerde tracks terug; een tweede keer doet niets. */
export function renumberLegacyTrackIds(db: DatabaseSync): number {
  ensureSpotifyLinkTable(db);
  const legacy = (
    db
      .prepare(`SELECT ${TRACK_ID_KEY}, "${ARTIST_IDS_KEY}" FROM ${TRACKS_TABLE}`)
      .all() as { dkj_track_id: string; dkj_artist_ids: string | null }[]
  ).filter((row) => LEGACY_ID_SHAPE.test(row.dkj_track_id));
  if (legacy.length === 0) return 0;

  const numbers = new TrackNumbers(allTrackIds(db));
  const now = new Date().toISOString();
  const renameTrack = db.prepare(`UPDATE ${TRACKS_TABLE} SET ${TRACK_ID_KEY} = ?, updated_at = ? WHERE ${TRACK_ID_KEY} = ?`);
  const renameLinks = db.prepare(`UPDATE ${SPOTIFY_LINK_TABLE} SET ${TRACK_ID_KEY} = ? WHERE ${TRACK_ID_KEY} = ?`);

  db.exec("BEGIN");
  try {
    // Op het oude getal, niet op de tekst: T1000000 hoort na T999999.
    legacy.sort((a, b) => Number(a.dkj_track_id.slice(1)) - Number(b.dkj_track_id.slice(1)));
    for (const row of legacy) {
      let main: string | undefined;
      try {
        const ids = row.dkj_artist_ids ? (JSON.parse(row.dkj_artist_ids) as unknown) : null;
        if (Array.isArray(ids) && typeof ids[0] === "string" && ids[0] !== "") main = ids[0];
      } catch {
        // met de hand verknoeid; valt terug op XXX00
      }
      const id = numbers.next(main ?? NO_ARTIST_ID);
      renameTrack.run(id, now, row.dkj_track_id);
      renameLinks.run(id, row.dkj_track_id);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return legacy.length;
}
