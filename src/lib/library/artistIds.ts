// EIGEN ARTIEST-ID'S UIT DE SPOTIFY-SNAPSHOT: elke Spotify-artiest krijgt één ID, bv. PRO01.
//
// Het ID is drie letters plus een nummer van (minstens) twee cijfers:
//   - de letters zijn de eerste drie letters van de naam, met een lidwoord aan het begin weggelaten
//     ("The Prodigy" -> PRO, "De Dijk" -> DIJ), accenten eraf (Röyksopp -> ROY) en alles wat geen
//     letter is genegeerd (T.I. -> TI). Heeft een naam minder dan drie letters, dan wordt hij
//     aangevuld met X (U2 -> UXX, 1991 -> XXX);
//   - het nummer is het laagste dat voor die letters nog vrij is: PRO01, PRO02, ... Raakt een groep
//     ooit vol, dan groeit het door (PRO99 -> PRO100), zodat geen artiest zonder ID blijft.
//
// Eén ID per Spotify-artiest (op artist-id, niet op naam): twee artiesten met dezelfde naam blijven
// twee artiesten, en een artiest die op Spotify van naam verandert, houdt zijn ID. De tabel `artists`
// onthoudt de koppeling; opnieuw toekennen op dezelfde snapshot doet niets.
//
// Elke track krijgt in `dkj_artist_ids` de lijst eigen artiest-ID's, hoofdartiest eerst, maar alleen
// zolang dat veld nog leeg is: wat je zelf invult, blijft staan.
//
// planArtistIds() is puur (geen database) en daardoor los te testen; applyArtistIdsFromSnapshot()
// voert het plan uit, in één transactie.
import type { DatabaseSync } from "node:sqlite";
import type { Snapshot } from "@/lib/spotify/types";
import { TRACKS_TABLE } from "./db";
import { ARTIST_IDS_KEY, TRACK_ID_KEY } from "./fields";
import {
  SPOTIFY_LINK_TABLE,
  applyTrackIdsFromSnapshot,
  ensureSpotifyLinkTable,
  renumberLegacyTrackIds,
  type TrackIdResult,
} from "./trackIds";

export const ARTISTS_TABLE = "artists";
export const ARTIST_IDS_FIELD = ARTIST_IDS_KEY;

const PREFIX_LENGTH = 3;
const NUMBER_DIGITS = 2;

/** Lidwoorden die aan het begin van een naam niet meetellen (Engels, Nederlands, Duits, Frans,
 *  Spaans). Alleen als los woord: "Theo" en "Delain" blijven gewoon THE en DEL. */
const LEADING_ARTICLE = /^(?:the|an?|de|het|een|der|die|das|les?|la|los|las|el)\s+(?=\S)|^(?:['’]t\s*|l['’])(?=\S)/i;

/** Letters die NFD niet in een basisletter plus accent uit elkaar haalt. */
const SPECIAL_LETTERS: Record<string, string> = { ø: "o", æ: "ae", œ: "oe", ß: "ss", ł: "l", đ: "d", þ: "th", ð: "d" };

/** De drie letters vooraan het ID van een artiest met deze naam. */
export function artistPrefix(name: string): string {
  const withoutArticle = name.trim().replace(LEADING_ARTICLE, "");
  const letters = withoutArticle
    .toLowerCase()
    .replace(/[øæœßłđþð]/g, (ch) => SPECIAL_LETTERS[ch])
    .normalize("NFD")
    .replace(/[^a-z]/g, "")
    .toUpperCase();
  return letters.slice(0, PREFIX_LENGTH).padEnd(PREFIX_LENGTH, "X");
}

export function formatArtistId(prefix: string, n: number): string {
  return prefix + String(n).padStart(NUMBER_DIGITS, "0");
}

const ID_SHAPE = /^([A-Z]{3})(\d+)$/;

export interface ArtistLink {
  spotifyArtistId: string;
  artistId: string;
}

export interface NewArtist extends ArtistLink {
  name: string;
}

/** Bepaalt welke Spotify-artiesten uit de snapshot een nieuw eigen ID krijgen. Volgorde van
 *  toekenning = volgorde van eerste voorkomen in de snapshot (playlist voor playlist, track voor
 *  track, artiest voor artiest), zodat hetzelfde snapshot altijd dezelfde ID's oplevert. */
export function planArtistIds(snapshot: Snapshot, existing: readonly ArtistLink[]): NewArtist[] {
  const known = new Set(existing.map((artist) => artist.spotifyArtistId));
  const used = new Map<string, Set<number>>();
  for (const { artistId } of existing) {
    const hit = ID_SHAPE.exec(artistId);
    if (!hit) continue;
    if (!used.has(hit[1])) used.set(hit[1], new Set());
    used.get(hit[1])!.add(Number(hit[2]));
  }

  const plan: NewArtist[] = [];
  for (const playlist of snapshot.playlists) {
    for (const item of playlist.tracks) {
      for (const artist of item.track?.artists ?? []) {
        if (!artist.id || known.has(artist.id)) continue;
        known.add(artist.id);
        const prefix = artistPrefix(artist.name);
        if (!used.has(prefix)) used.set(prefix, new Set());
        const taken = used.get(prefix)!;
        let n = 1;
        while (taken.has(n)) n++;
        taken.add(n);
        plan.push({ spotifyArtistId: artist.id, artistId: formatArtistId(prefix, n), name: artist.name });
      }
    }
  }
  return plan;
}

export function ensureArtistsTable(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${ARTISTS_TABLE} (
      dkj_artist_id TEXT PRIMARY KEY NOT NULL,
      spotify_artist_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
}

export interface ArtistIdResult {
  /** Artiesten die in deze run een eigen ID kregen. */
  newArtists: number;
  /** Tracks waarvan `dkj_artist_ids` in deze run gevuld werd. */
  tracksFilled: number;
  /** Totaal aantal artiesten na deze run. */
  totalArtists: number;
}

/** Kent eigen ID's toe aan elke nieuwe artiest in de snapshot en vult `dkj_artist_ids` bij tracks waar
 *  dat nog leeg is. Draai dit ná applyTrackIdsFromSnapshot(): een track moet zijn eigen ID al hebben. */
export function applyArtistIdsFromSnapshot(db: DatabaseSync, snapshot: Snapshot): ArtistIdResult {
  ensureArtistsTable(db);
  ensureSpotifyLinkTable(db);
  const existing = (
    db.prepare(`SELECT dkj_artist_id, spotify_artist_id FROM ${ARTISTS_TABLE}`).all() as {
      dkj_artist_id: string;
      spotify_artist_id: string;
    }[]
  ).map((row) => ({ spotifyArtistId: row.spotify_artist_id, artistId: row.dkj_artist_id }));
  const plan = planArtistIds(snapshot, existing);
  const idOf = new Map([...existing, ...plan].map((artist) => [artist.spotifyArtistId, artist.artistId]));

  const trackIdOf = new Map(
    (
      db.prepare(`SELECT spotify_track_id, ${TRACK_ID_KEY} FROM ${SPOTIFY_LINK_TABLE}`).all() as {
        spotify_track_id: string;
        dkj_track_id: string;
      }[]
    ).map((row) => [row.spotify_track_id, row.dkj_track_id])
  );
  const empty = new Set(
    (
      db.prepare(`SELECT ${TRACK_ID_KEY} FROM ${TRACKS_TABLE} WHERE "${ARTIST_IDS_FIELD}" IS NULL`).all() as {
        dkj_track_id: string;
      }[]
    ).map((row) => row.dkj_track_id)
  );

  const now = new Date().toISOString();
  const insertArtist = db.prepare(
    `INSERT INTO ${ARTISTS_TABLE} (dkj_artist_id, spotify_artist_id, name, created_at) VALUES (?, ?, ?, ?)`
  );
  const fillTrack = db.prepare(
    `UPDATE ${TRACKS_TABLE} SET "${ARTIST_IDS_FIELD}" = ?, updated_at = ? ` +
      `WHERE ${TRACK_ID_KEY} = ? AND "${ARTIST_IDS_FIELD}" IS NULL`
  );

  let tracksFilled = 0;
  db.exec("BEGIN");
  try {
    for (const artist of plan) insertArtist.run(artist.artistId, artist.spotifyArtistId, artist.name, now);
    // De eerste Spotify-variant van een nummer in de snapshot bepaalt de artiesten; alle varianten
    // hebben per definitie dezelfde (zie songKey in trackIds.ts).
    for (const playlist of snapshot.playlists) {
      for (const item of playlist.tracks) {
        const track = item.track;
        const trackId = track?.id ? trackIdOf.get(track.id) : undefined;
        if (!track || !trackId || !empty.has(trackId)) continue;
        const ids = track.artists.map((a) => (a.id ? idOf.get(a.id) : undefined)).filter(Boolean);
        empty.delete(trackId);
        if (ids.length === 0) continue;
        fillTrack.run(JSON.stringify(ids), now, trackId);
        tracksFilled++;
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  const total = db.prepare(`SELECT COUNT(*) AS n FROM ${ARTISTS_TABLE}`).get() as { n: number };
  return { newArtists: plan.length, tracksFilled, totalArtists: Number(total.n) };
}

/** Spotify-artist-id -> eigen artiest-ID, voor trackIds.ts. */
export function readArtistIdMap(db: DatabaseSync): Map<string, string> {
  ensureArtistsTable(db);
  const rows = db.prepare(`SELECT spotify_artist_id, dkj_artist_id FROM ${ARTISTS_TABLE}`).all() as {
    spotify_artist_id: string;
    dkj_artist_id: string;
  }[];
  return new Map(rows.map((row) => [row.spotify_artist_id, row.dkj_artist_id]));
}

export interface LibraryIdResult {
  artists: ArtistIdResult;
  /** Tracks die in deze run van een oud ID (T000001) naar het nieuwe formaat gingen. */
  renumbered: number;
  tracks: TrackIdResult;
}

/** Alle eigen ID's uit de snapshot, in de volgorde die nodig is: eerst de artiesten (en `dkj_artist_ids`
 *  bij bestaande tracks), dan het eenmalig omnummeren van oude track-ID's, dan de nieuwe nummers --
 *  een track-ID begint met het artiest-ID van zijn hoofdartiest. */
export function applyLibraryIdsFromSnapshot(db: DatabaseSync, snapshot: Snapshot): LibraryIdResult {
  const artists = applyArtistIdsFromSnapshot(db, snapshot);
  const renumbered = renumberLegacyTrackIds(db);
  const tracks = applyTrackIdsFromSnapshot(db, snapshot, readArtistIdMap(db));
  return { artists, renumbered, tracks };
}
