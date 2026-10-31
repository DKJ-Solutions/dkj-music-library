// De volgorde van een playlist in het trackregister, en het verslepen van een rij daarin (Dave, 31 oktober
// 2026). Spotify is de bron van die volgorde, behalve voor een uitgestelde volgorde zolang Spotify niet te
// schrijven is (pendingOrder.ts, pendingOrderStore.ts). De tabel toont de rijen in de volgorde van de
// playlist; een sleepactie wordt een verplaatsing bij Spotify
// (POST /api/spotify/playlist-order -> PUT /playlists/{id}/items), of bij een rate limit een lokale.
//
// Pure module: geen fs, geen React -- vanuit een 'use client'-bestand te gebruiken, en los te testen.

/** Een playlist-plek zoals Spotify hem telt: de index in `playlist.tracks`, vanaf 0. */
export type PlaylistPosition = number;

/** Eén rij van de tabel met zijn plek in de playlist. `position` ontbreekt voor een rij die de playlist
 *  (nog) niet bevat volgens de snapshot; zo'n rij gaat achteraan en kan niet versleept worden. */
export interface OrderedRow<T> {
  row: T;
  position: PlaylistPosition | undefined;
}

/** De rijen in de volgorde van de playlist, elk met zijn plek.
 *
 *  `playlistTrackIds[i]` is de dkj_track_id van het item op plek i, of null als het item geen
 *  bibliotheektrack is (een lokaal bestand, een aflevering, een track zonder koppeling). De koppeling loopt
 *  via de Spotify-track-ID van het ITEM naar de dkj_track_id (spotify_track_ids, zie trackIds.ts): een rij
 *  van het register draagt maar één spotify_track_id, terwijl het item in de playlist een andere
 *  releasevariant van hetzelfde nummer kan zijn -- vergelijken op spotify_track_id zou die rij missen.
 *
 *  Een nummer dat twee keer in de playlist staat (of twee varianten met dezelfde dkj_track_id) is één rij,
 *  op zijn EERSTE plek: dat is de plek die een sleepactie verplaatst. Rijen zonder plek komen achteraan, in
 *  de volgorde waarin ze binnenkwamen. */
export function orderRowsByPlaylist<T extends { id: string }>(
  rows: readonly T[],
  playlistTrackIds: readonly (string | null)[]
): OrderedRow<T>[] {
  const firstPosition = new Map<string, PlaylistPosition>();
  playlistTrackIds.forEach((id, position) => {
    if (id !== null && !firstPosition.has(id)) firstPosition.set(id, position);
  });
  const ordered = rows.map((row) => ({ row, position: firstPosition.get(row.id) }));
  // sort is stabiel: rijen zonder plek behouden hun onderlinge volgorde.
  return ordered.sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
}

/** Wat Spotify nodig heeft voor één verplaatsing van één item (`range_length` is altijd 1). */
export interface PlaylistMove {
  rangeStart: PlaylistPosition;
  insertBefore: PlaylistPosition;
}

/** De verplaatsing voor een rij die van tabelindex `from` naar tabelindex `to` gaat, of null als er niets
 *  te doen valt.
 *
 *  `positions` zijn de playlist-plekken van de rijen in de GETOONDE volgorde. Spotify telt `insert_before`
 *  in de lijst zoals hij nu is, vóór het weghalen van het item: naar boven komt de rij vóór de rij die nu
 *  op `to` staat (insert_before = die plek), naar beneden komt hij ná die rij (insert_before = die plek +
 *  1). Items zonder bibliotheekrij tussen beide (lokale bestanden, dubbele plekken) schuiven vanzelf mee,
 *  omdat de plekken absoluut zijn.
 *
 *  Null ook als een van de twee rijen geen plek heeft: dan klopt de tabel niet met de snapshot en is
 *  verplaatsen gokken. */
export function planPlaylistMove(
  positions: readonly (PlaylistPosition | undefined)[],
  from: number,
  to: number
): PlaylistMove | null {
  if (from === to) return null;
  const start = positions[from];
  const target = positions[to];
  if (start === undefined || target === undefined) return null;
  const insertBefore = to > from ? target + 1 : target;
  // Voor of direct na zichzelf invoegen verandert niets.
  if (insertBefore === start || insertBefore === start + 1) return null;
  return { rangeStart: start, insertBefore };
}

/** `list` met het element op `from` naar `to` verplaatst (nieuwe array). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Wat de pagina verwacht te verplaatsen en waarheen: de Spotify-track-ID's op beide plekken. */
export interface MoveExpectation extends PlaylistMove {
  /** De plek van de rij waar de sleepactie op landt (de doelrij, niet insert_before). */
  targetPosition: PlaylistPosition;
  expectedStartId: string;
  expectedTargetId: string;
}

/** Klopt de verplaatsing met de LIVE playlist? `liveTrackIds[i]` is de Spotify-track-ID van item i bij
 *  Spotify nu (null voor een item zonder track). Alleen als de plekken binnen de lengte vallen en beide
 *  plekken de verwachte track dragen, mag er verplaatst worden: dan zijn de plekken van de pagina niet
 *  verouderd, welk snapshot_id er ook bij hoort. */
export function matchesLivePlaylist(liveTrackIds: readonly (string | null)[], move: MoveExpectation): boolean {
  const { rangeStart, insertBefore, targetPosition } = move;
  if (rangeStart >= liveTrackIds.length || targetPosition >= liveTrackIds.length || insertBefore > liveTrackIds.length) return false;
  return liveTrackIds[rangeStart] === move.expectedStartId && liveTrackIds[targetPosition] === move.expectedTargetId;
}
