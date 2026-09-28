// ALLEEN JE EIGEN PLAYLISTS VULLEN DE BIBLIOTHEEK. Een gedeelde playlist -- een playlist van een ander
// account die je volgt, ook als je er aan mag meewerken -- staat wel in de snapshot en op /spotify, maar
// levert geen nummers, geen artiesten en geen `spotify_playlist`-regels in de trackdatabase. Eigen is
// wat `owner.id` gelijk heeft aan `ownerUserId` uit private-rules.json (privateRules.ts).
//
// Een nummer dat ook in een van je eigen playlists staat, blijft gewoon: de gedeelde playlist telt dan
// alleen niet als bron. Wat er vóór 28 september 2026 alleen via gedeelde playlists in kwam, haalt
// removeSharedOnlyTracks() weg, en dat blijft het bij elke sync doen: een nummer dat de snapshot alleen
// in gedeelde playlists kent, verdwijnt uit de bibliotheek, met zijn koppelingen in `spotify_track_ids`.
// Een nummer dat in geen enkele playlist meer staat, blijft staan zoals altijd: de bibliotheek is een
// back-up. Zet je zo'n weggehaald nummer later in een eigen playlist, dan komt het terug als nieuw
// nummer, met een nieuw ID.
//
// Daarna gaat ook elke artiest weg die bij geen enkel nummer meer hoort (dkj_artist_id). Dat zijn de
// artiesten die alleen via gedeelde playlists binnenkwamen; tot deze regel had elke artiest een nummer.
//
// Is er geen eigen account ingesteld (ownerUserId null), dan valt eigen niet van gedeeld te
// onderscheiden: dan telt alles, zoals vóór deze regel, en wordt er niets weggehaald.
import type { DatabaseSync } from "node:sqlite";
import type { Playlist, Snapshot } from "@/lib/spotify/types";
import { ARTISTS_TABLE, ensureArtistsTable } from "./artistIds";
import { TRACKS_TABLE } from "./db";
import { ARTIST_IDS_KEY, TRACK_ID_KEY } from "./fields";
import { SPOTIFY_LINK_TABLE, ensureSpotifyLinkTable } from "./trackIds";

/** Of deze playlist van je eigen account is. Zonder eigen account telt elke playlist als eigen. */
export function isOwnPlaylist(playlist: Pick<Playlist, "owner">, ownerUserId: string | null): boolean {
  return ownerUserId === null || playlist.owner.id === ownerUserId;
}

/** De snapshot met alleen je eigen playlists: wat de bibliotheek te zien krijgt. */
export function ownPlaylistsOnly(snapshot: Snapshot, ownerUserId: string | null): Snapshot {
  if (ownerUserId === null) return snapshot;
  return { ...snapshot, playlists: snapshot.playlists.filter((p) => isOwnPlaylist(p, ownerUserId)) };
}

/** De Spotify-track-ID's die de snapshot alleen in gedeelde playlists kent, in geen enkele eigen. */
export function sharedOnlySpotifyIds(snapshot: Snapshot, ownerUserId: string | null): Set<string> {
  if (ownerUserId === null) return new Set();
  const own = new Set<string>();
  const shared = new Set<string>();
  for (const playlist of snapshot.playlists) {
    const into = isOwnPlaylist(playlist, ownerUserId) ? own : shared;
    for (const item of playlist.tracks) if (item.track?.id) into.add(item.track.id);
  }
  return new Set([...shared].filter((id) => !own.has(id)));
}

/** Welke dkj_track_id's weg moeten: minstens één Spotify-variant alleen in gedeelde playlists, en geen
 *  enkele variant in een eigen playlist. Puur, zodat de regel los te testen is. */
export function planSharedOnlyRemovals(
  snapshot: Snapshot,
  ownerUserId: string | null,
  links: ReadonlyMap<string, string>
): Set<string> {
  const sharedOnly = sharedOnlySpotifyIds(snapshot, ownerUserId);
  if (sharedOnly.size === 0) return new Set();
  const own = new Set<string>();
  for (const playlist of ownPlaylistsOnly(snapshot, ownerUserId).playlists) {
    for (const item of playlist.tracks) {
      const trackId = item.track?.id ? links.get(item.track.id) : undefined;
      if (trackId) own.add(trackId);
    }
  }
  const remove = new Set<string>();
  for (const [spotifyId, trackId] of links) {
    if (sharedOnly.has(spotifyId) && !own.has(trackId)) remove.add(trackId);
  }
  return remove;
}

export interface SharedOnlyResult {
  /** Nummers die weg zijn omdat ze alleen in gedeelde playlists stonden. */
  tracksRemoved: number;
  /** Artiesten die daarna bij geen enkel nummer meer hoorden. */
  artistsRemoved: number;
}

/** Haalt de nummers weg die de snapshot alleen in gedeelde playlists kent, hun koppelingen, en daarna
 *  de artiesten zonder nummer. In één transactie; opnieuw draaien doet niets. */
export function removeSharedOnlyTracks(db: DatabaseSync, snapshot: Snapshot, ownerUserId: string | null): SharedOnlyResult {
  if (ownerUserId === null) return { tracksRemoved: 0, artistsRemoved: 0 };
  ensureSpotifyLinkTable(db);
  ensureArtistsTable(db);
  const links = new Map(
    (db.prepare(`SELECT spotify_track_id, ${TRACK_ID_KEY} FROM ${SPOTIFY_LINK_TABLE}`).all() as {
      spotify_track_id: string;
      dkj_track_id: string;
    }[]).map((row) => [row.spotify_track_id, row.dkj_track_id])
  );
  const remove = planSharedOnlyRemovals(snapshot, ownerUserId, links);

  const deleteTrack = db.prepare(`DELETE FROM ${TRACKS_TABLE} WHERE ${TRACK_ID_KEY} = ?`);
  const deleteLinks = db.prepare(`DELETE FROM ${SPOTIFY_LINK_TABLE} WHERE ${TRACK_ID_KEY} = ?`);
  let tracksRemoved = 0;
  let artistsRemoved = 0;
  db.exec("BEGIN");
  try {
    for (const trackId of remove) {
      tracksRemoved += Number(deleteTrack.run(trackId).changes);
      deleteLinks.run(trackId);
    }
    if (tracksRemoved > 0) {
      const used = new Set<string>();
      for (const row of db.prepare(`SELECT "${ARTIST_IDS_KEY}" AS ids FROM ${TRACKS_TABLE}`).all() as { ids: string | null }[]) {
        for (const id of parseIds(row.ids)) used.add(id);
      }
      const deleteArtist = db.prepare(`DELETE FROM ${ARTISTS_TABLE} WHERE dkj_artist_id = ?`);
      for (const { dkj_artist_id } of db.prepare(`SELECT dkj_artist_id FROM ${ARTISTS_TABLE}`).all() as { dkj_artist_id: string }[]) {
        if (!used.has(dkj_artist_id)) artistsRemoved += Number(deleteArtist.run(dkj_artist_id).changes);
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return { tracksRemoved, artistsRemoved };
}

function parseIds(value: string | null): string[] {
  try {
    const ids = value ? (JSON.parse(value) as unknown) : null;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
