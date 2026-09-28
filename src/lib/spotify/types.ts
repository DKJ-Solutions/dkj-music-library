// Datamodel voor de Spotify-snapshot. Fase 2 levert alleen deze types -- de ophaal-logica die ze
// vult (GET /me/playlists + GET /playlists/{id}/items) is fase 3.
//
// Gebaseerd op Rebecca's endpoint-onderzoek, zie
// life-hub (privé): Brains/plutchik-brain/feiten/werk/dj-cylow/spotify-playlist-manager/CORTEX.md:
// - GET /me/playlists (limit 50, gepagineerd)        -> SimplifiedPlaylistObject[]
// - GET /playlists/{id}/items (limit 50, gepagineerd) -> playlist-items (NIET /tracks, dat
//   endpoint is deprecated sinds de februari-2026-migratie)
// Sinds feb 2026 zijn popularity/available_markets/external_ids (track, album, artist) en
// followers (artist) verwijderd uit de API -- bewust NIET opgenomen in dit model.

export interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface PlaylistOwner {
  id: string;
  displayName: string | null;
}

export interface Artist {
  id: string;
  name: string;
}

export interface Album {
  id: string;
  name: string;
  images: SpotifyImage[];
  /** Spotify's `release_date`: "1997", "1997-05" of "1997-05-12" (de precisie verschilt per album).
   *  null = Spotify kent geen datum. Ontbreekt in een snapshot van vóór 28 september 2026; de ingest
   *  haalt zo'n playlist daarom één keer opnieuw op (zie buildSnapshot in ingest.ts). */
  releaseDate?: string | null;
}

export interface Track {
  id: string;
  uri: string;
  name: string;
  artists: Artist[];
  album: Album;
  durationMs: number;
}

// Eén entry uit GET /playlists/{id}/items. `track` is null bij een lokaal bestand zonder
// bruikbare metadata, of een episode/podcast-aflevering (die dit model bewust niet modelleert --
// buiten scope voor "playlists doorzoeken/dedupen").
export interface PlaylistItem {
  addedAt: string | null;
  addedBy: string | null; // Spotify user-id; null bij een onbekend/verwijderd account
  isLocal: boolean;
  track: Track | null;
}

export interface Playlist {
  id: string;
  name: string;
  uri: string;
  collaborative: boolean;
  public: boolean | null;
  snapshotId: string;
  owner: PlaylistOwner;
  images: SpotifyImage[];
  description: string | null;
  trackCount: number;
  tracks: PlaylistItem[];

  // Fase 4 (nog niet gevuld door fase 2/3): de gereconstrueerde folder-structuur + eigen tags.
  // De Spotify API geeft playlist-folders niet terug (zie het dossier, §4) -- deze velden worden
  // apart van de Spotify-brondata bijgehouden zodat een hersync ze niet overschrijft. Optioneel
  // en bewust nog leeg/afwezig in fase 2.
  folderPath?: string[];
  tags?: string[];
}

// De envelope van één sync-run. `snapshotId` per playlist maakt hersyncs goedkoop (ongewijzigde
// playlists overslaan) en levert vrijwel gratis een lichte versiehistorie op (zie het dossier,
// §5/"Concreet advies").
export interface Snapshot {
  syncedAt: string; // ISO-tijdstip van deze sync-run
  playlists: Playlist[];
}
