// Fase 3: de daadwerkelijke ingest -- alle playlists van Dave + alle tracks per playlist ophalen
// en mappen op het datamodel uit types.ts. Bouwt hierop voort:
// - httpClient.ts: rate-limit-bewuste GET-wrapper + paginatie (429/Retry-After, `next`/`offset`).
// - auth.ts: getValidAccessToken() (indirect, via httpClient.ts).
//
// READ-ONLY: uitsluitend GET-calls (zie het dossier + de opdracht). Snapshot_id-diffing zit
// hierin: een playlist waarvan het snapshot_id ongewijzigd is t.o.v. de vorige snapshot wordt niet
// opnieuw opgehaald -- de vorige tracks worden hergebruikt (zie het dossier, §3/§5 -- dit houdt
// hersyncs licht en is vrijwel gratis versiehistorie).
//
// Drie dingen die pas bleken bij een echte call tegen de API (niet in het dossier
// gedocumenteerd -- de feb-2026-migratie blijkt verder gegaan dan de dossier-bronnen vermeldden):
// - Het trackcount-veld in SimplifiedPlaylistObject heet zelf ook `items` (niet `tracks`) --
//   dezelfde hernoeming als het endpoint zelf, maar dan ook op dit binnenveld.
// - Binnen één playlist-item heet het genest track/episode-object nu `item` (niet `track`) --
//   dit was de grootste valkuil: een `fields`-filter dat nog om `track(...)` vraagt matcht niets,
//   en levert stilzwijgend lege/undefined track-data op (geen fout, gewoon leeg) in plaats van
//   een duidelijke breuk. Pas zichtbaar geworden door een echte respons zonder `fields`-filter
//   te inspecteren.
// - GET /playlists/{id}/items geeft 403 op een playlist die Dave volgt maar niet zelf bezit/aan
//   meewerkt (bevestigt het dossier, §6 punt 5). Dat is een normaal, te verwachten geval bij
//   honderden playlists -- geen reden om de hele sync te laten crashen: zo'n playlist wordt
//   metadata-only opgeslagen (tracks: hergebruik de vorige snapshot, anders leeg) met een
//   duidelijke waarschuwing in de voortgang, i.p.v. de hele run te laten falen.
//
// Diezelfde bescherming geldt inmiddels voor ELKE fout op één losse playlist, niet alleen 403:
// een transiënte 5xx/netwerkfout op playlist 200 van de 375 mag de rest van de sync niet
// meeslepen. Zo'n playlist valt terug op de vorige snapshot (of leeg bij een eerste sync), krijgt
// een eigen 'playlist_failed'-voortgangsevent, en telt mee in het afsluitende failedCount --
// de sync als geheel loopt gewoon door en schrijft alsnog een snapshot weg.
//
// SERVER-ONLY (via httpClient.ts -> auth.ts -> tokenStore.ts, gebruikt fs).

import { SpotifyApiError } from "./errors";
import { fetchAllPages, type SpotifyFetchOptions } from "./httpClient";
import type { Album, Artist, Playlist, PlaylistItem, Snapshot, SpotifyImage, Track } from "./types";

// Beperkt tot wat het datamodel nodig heeft -- houdt de payload (en dus de rate-limit-druk)
// kleiner dan de volledige objecten die Spotify standaard teruggeeft. LET OP: `item(...)`, niet
// `track(...)` -- zie de opmerking bovenaan dit bestand.
const PLAYLIST_ITEMS_FIELDS =
  "items(added_at,added_by.id,is_local,item(id,uri,name,type,duration_ms,artists(id,name),album(id,name,images))),next,offset,limit,total";

// --- Ruwe Spotify-responsvormen (alleen de velden die we gebruiken) ------------------------

interface RawOwner {
  id: string;
  display_name: string | null;
}

interface RawSimplifiedPlaylist {
  id: string;
  name: string;
  uri: string;
  collaborative: boolean;
  public: boolean | null;
  snapshot_id: string;
  owner: RawOwner;
  images: SpotifyImage[] | null;
  description: string | null;
  // LET OP: heet in de echte API-respons `items`, niet `tracks` -- zie de opmerking bovenaan
  // dit bestand (pas ontdekt bij een live call, niet in het dossier gedocumenteerd).
  items: { total: number } | null;
}

interface RawArtist {
  id: string;
  name: string;
}

interface RawAlbum {
  id: string;
  name: string;
  images: SpotifyImage[] | null;
}

interface RawTrack {
  id: string | null;
  uri: string;
  name: string;
  type: string; // "track" | "episode" -- alleen "track" wordt gemodelleerd, zie types.ts
  duration_ms: number;
  artists: RawArtist[] | null;
  album: RawAlbum | null;
}

interface RawPlaylistItem {
  added_at: string | null;
  added_by: { id: string } | null;
  is_local: boolean;
  // LET OP: heet in de echte API-respons `item`, niet `track` -- zie de opmerking bovenaan dit
  // bestand (pas ontdekt bij een live call, niet in het dossier gedocumenteerd).
  item: RawTrack | null;
}

// --- Mapping: ruwe Spotify-objecten -> eigen datamodel -------------------------------------

function mapTrack(raw: RawTrack | null): Track | null {
  // Episodes (podcasts) worden bewust niet gemodelleerd (zie types.ts); een lokaal bestand zonder
  // Spotify-id heeft geen bruikbare track-metadata voor dedup/zoeken.
  if (!raw || raw.type !== "track" || !raw.id) return null;

  return {
    id: raw.id,
    uri: raw.uri,
    name: raw.name,
    artists: (raw.artists ?? []).map((artist): Artist => ({ id: artist.id, name: artist.name })),
    album: mapAlbum(raw.album),
    durationMs: raw.duration_ms,
  };
}

function mapAlbum(raw: RawAlbum | null): Album {
  return {
    id: raw?.id ?? "",
    name: raw?.name ?? "",
    images: raw?.images ?? [],
  };
}

function mapPlaylistItem(raw: RawPlaylistItem): PlaylistItem {
  return {
    addedAt: raw.added_at,
    addedBy: raw.added_by?.id ?? null,
    isLocal: raw.is_local,
    track: mapTrack(raw.item),
  };
}

function mapPlaylistMeta(raw: RawSimplifiedPlaylist): Omit<Playlist, "tracks" | "folderPath" | "tags"> {
  return {
    id: raw.id,
    name: raw.name,
    uri: raw.uri,
    collaborative: raw.collaborative,
    public: raw.public,
    snapshotId: raw.snapshot_id,
    owner: { id: raw.owner?.id ?? "", displayName: raw.owner?.display_name ?? null },
    images: raw.images ?? [],
    description: raw.description ?? null,
    trackCount: raw.items?.total ?? 0,
  };
}

// --- Ophalen ---------------------------------------------------------------------------------

// GET /me/playlists, gepagineerd (limit=50) tot alles binnen is. Metadata-only -- geen tracks.
export async function fetchAllPlaylists(
  options: SpotifyFetchOptions = {}
): Promise<RawSimplifiedPlaylist[]> {
  return fetchAllPages<RawSimplifiedPlaylist>("/me/playlists", {}, options);
}

// GET /playlists/{id}/items (NIET het deprecated /tracks, zie het dossier §2), gepagineerd
// (limit=50) tot alles binnen is, met een fields-filter om de payload te beperken.
export async function fetchAllPlaylistItems(
  playlistId: string,
  options: SpotifyFetchOptions = {}
): Promise<PlaylistItem[]> {
  const rawItems = await fetchAllPages<RawPlaylistItem>(
    `/playlists/${playlistId}/items`,
    { fields: PLAYLIST_ITEMS_FIELDS },
    options
  );
  return rawItems.map(mapPlaylistItem);
}

// --- Voortgang ---------------------------------------------------------------------------------

export interface SyncProgressEvent {
  type:
    | "playlists_fetched"
    | "playlist_synced"
    | "playlist_skipped"
    | "playlist_forbidden"
    | "playlist_failed"
    | "done";
  message: string;
  index?: number;
  total?: number;
  /** Alleen gevuld op het afsluitende 'done'-event: het aantal playlists dat is mislukt (niet-403)
   *  en op een fallback (vorige tracks, of leeg) is teruggevallen. */
  failedCount?: number;
}

// 403 op /playlists/{id}/items betekent: Dave volgt deze playlist maar bezit/beheert 'm niet (zie
// de opmerking bovenaan dit bestand + het dossier §6 punt 5). Verwacht bij honderden playlists --
// geen reden om de hele sync te laten crashen.
function isForbiddenItemsError(err: unknown): boolean {
  return err instanceof SpotifyApiError && err.status === 403;
}

export interface BuildSnapshotOptions extends SpotifyFetchOptions {
  /** De vorige snapshot, voor snapshot_id-diffing. `null`/ontbrekend = volledige (eerste) sync. */
  previousSnapshot?: Snapshot | null;
  /** Milde concurrency-cap over playlists heen -- géén request-storm (zie de opdracht). */
  concurrency?: number;
  onProgress?: (event: SyncProgressEvent) => void;
}

const DEFAULT_CONCURRENCY = 4;

// De volledige ingest van fase 3: alle playlists + (waar nodig) alle tracks per playlist, met
// snapshot_id-diffing tegen de vorige snapshot. Playlists worden met een milde concurrency-cap
// verwerkt (default 4 gelijktijdig) -- elke playlist zelf haalt zijn tracks sequentieel/gepagineerd
// op (fetchAllPages).
export async function buildSnapshot(options: BuildSnapshotOptions = {}): Promise<Snapshot> {
  const { previousSnapshot = null, concurrency = DEFAULT_CONCURRENCY, onProgress, ...fetchOptions } = options;

  const log = (event: SyncProgressEvent): void => {
    onProgress?.(event);
    console.log(`[spotify/ingest] ${event.message}`);
  };

  const rawPlaylists = await fetchAllPlaylists(fetchOptions);
  log({
    type: "playlists_fetched",
    message: `${rawPlaylists.length} playlist(s) gevonden -- start tracks ophalen`,
    total: rawPlaylists.length,
  });

  const previousById = new Map((previousSnapshot?.playlists ?? []).map((p) => [p.id, p]));
  const results: Playlist[] = new Array(rawPlaylists.length);
  let cursor = 0;
  let completed = 0;
  let failedCount = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = cursor++;
      if (i >= rawPlaylists.length) return;

      const raw = rawPlaylists[i];
      const meta = mapPlaylistMeta(raw);
      const previous = previousById.get(meta.id);
      const unchanged = previous !== undefined && previous.snapshotId === meta.snapshotId;

      let tracks: PlaylistItem[];
      let eventType: SyncProgressEvent["type"];
      let message: string;

      if (unchanged) {
        tracks = previous.tracks;
        eventType = "playlist_skipped";
        message = `[${completed + 1}/${rawPlaylists.length}] "${meta.name}" ongewijzigd (snapshot_id gelijk) -- ${tracks.length} tracks hergebruikt`;
      } else {
        try {
          tracks = await fetchAllPlaylistItems(meta.id, fetchOptions);
          eventType = "playlist_synced";
          message = `[${completed + 1}/${rawPlaylists.length}] "${meta.name}" gesynchroniseerd -- ${tracks.length} tracks`;
        } catch (err) {
          tracks = previous?.tracks ?? [];
          if (isForbiddenItemsError(err)) {
            // Gevolgde, niet-eigen playlist -- metadata wél bijwerken, tracks blijven zoals de
            // vorige snapshot ze had (leeg bij een eerste sync).
            eventType = "playlist_forbidden";
            message = `[${completed + 1}/${rawPlaylists.length}] "${meta.name}" -- 403 op /items (gevolgde, niet-eigen playlist), metadata-only opgeslagen`;
          } else {
            // Elke andere fout (5xx, netwerk, timeout, ...) mag deze ENE playlist raken, niet de
            // hele sync van soms honderden playlists -- val terug op de vorige tracks (leeg bij
            // een eerste sync) en ga door met de rest. Geteld in failedCount, zodat de aanroeper
            // (sync/route.ts) dit zichtbaar kan maken i.p.v. stil te slikken.
            failedCount++;
            const reason = err instanceof Error ? err.message : String(err);
            eventType = "playlist_failed";
            message = `[${completed + 1}/${rawPlaylists.length}] "${meta.name}" -- fout bij ophalen tracks (${reason}), ${previous ? "vorige tracks hergebruikt" : "leeg opgeslagen (geen vorige snapshot)"}, sync gaat door`;
          }
        }
      }

      completed++;
      log({ type: eventType, message, index: completed, total: rawPlaylists.length });

      // trackCount: bij een geslaagde/hergebruikte ophaal is tracks.length altijd de juiste,
      // actuele waarde. Bij een forbidden/failed playlist ZONDER vorige snapshot is tracks leeg
      // (tracks.length === 0) terwijl Spotify's eigen `items.total` best positief kan zijn --
      // dan telt de door Spotify doorgegeven meta.trackCount, in plaats van 'm te verdringen door
      // een misleidende 0.
      const trackCount = tracks.length > 0 ? tracks.length : meta.trackCount;

      results[i] = {
        ...meta,
        trackCount,
        tracks,
        // Fase-4-velden overleven een hersync ongewijzigd -- de Spotify-brondata bevat ze niet
        // (zie types.ts), dus alleen overnemen uit de vorige snapshot, nooit uit de API.
        ...(previous?.folderPath ? { folderPath: previous.folderPath } : {}),
        ...(previous?.tags ? { tags: previous.tags } : {}),
      };
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, rawPlaylists.length || 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const totalTracks = results.reduce((sum, p) => sum + p.tracks.length, 0);
  const snapshot: Snapshot = { syncedAt: new Date().toISOString(), playlists: results };
  log({
    type: "done",
    message:
      `Sync klaar: ${results.length} playlist(s), ${totalTracks} track(s) totaal` +
      (failedCount > 0 ? `, ${failedCount} playlist(s) mislukt (fallback toegepast)` : ""),
    failedCount,
  });

  return snapshot;
}
