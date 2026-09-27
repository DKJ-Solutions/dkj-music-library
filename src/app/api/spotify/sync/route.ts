// Fase 3: de trigger voor de daadwerkelijke ingest. Draait de volledige sync (alle playlists +
// alle tracks, met snapshot_id-diffing) en schrijft het resultaat naar data/spotify/snapshot.json.
// Aangeroepen vanuit de playlist manager (/spotify, zie SyncButton.tsx) -- kan ook los aangeroepen
// worden, bv. `curl -X POST http://127.0.0.1:3000/api/spotify/sync`.
//
// READ-ONLY richting Spotify: uitsluitend GET-calls via ingest.ts/httpClient.ts.
import { NextResponse } from "next/server";
import { buildSnapshot } from "@/lib/spotify/ingest";
import { archiveCurrentSnapshot, readSnapshot, writeSnapshot } from "@/lib/spotify/snapshotStore";
import { SpotifyReauthRequiredError } from "@/lib/spotify/errors";
import { sameOriginGuard } from "@/lib/http/sameOrigin";
import { withLibrary } from "@/lib/library/libraryFile";
import { applyArtistIdsFromSnapshot, type ArtistIdResult } from "@/lib/library/artistIds";
import { applyTrackIdsFromSnapshot, type TrackIdResult } from "@/lib/library/trackIds";

// fs/de Spotify-token-laag vereisen de Node-runtime, niet de edge-runtime. Een volledige sync van
// honderden playlists kan een tijd duren -- force-dynamic voorkomt dat Next.js dit probeert te
// cachen/prerenderen.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = sameOriginGuard(request);
  if (guard) return guard;

  try {
    const previousSnapshot = readSnapshot();

    // Eén losse playlist die onderweg blijft falen (5xx, netwerk, ...) mag de hele sync van
    // soms honderden playlists niet laten crashen zonder snapshot -- ingest.ts vangt zo'n fout nu
    // per playlist af (net als een 403) en meldt het gefaalde aantal terug via het afsluitende
    // 'done'-voortgangsevent.
    let failedPlaylistCount = 0;
    const snapshot = await buildSnapshot({
      previousSnapshot,
      onProgress: (event) => {
        if (event.type === "done") failedPlaylistCount = event.failedCount ?? 0;
      },
    });

    // Archiveer de oude snapshot pas ná een geslaagde build, vlak vóór 'm overschreven wordt --
    // zo blijft de vorige versie intact als de sync halverwege was misgelopen.
    archiveCurrentSnapshot();
    writeSnapshot(snapshot);

    // Elk nummer en elke artiest in de nieuwe snapshot een eigen ID geven (trackIds.ts, artistIds.ts)
    // en de export in
    // data/library/export/ bijwerken (libraryFile.ts). Lukt dat niet, dan is de sync zelf nog steeds
    // geslaagd: de snapshot staat er, en `npm run library:assign-ids` haalt het in.
    let trackIds: TrackIdResult | null = null;
    let artistIds: ArtistIdResult | null = null;
    try {
      [trackIds, artistIds] = withLibrary((db) => [
        applyTrackIdsFromSnapshot(db, snapshot),
        applyArtistIdsFromSnapshot(db, snapshot),
      ] as const);
    } catch (err) {
      console.error("[api/spotify/sync] eigen track-ID's toekennen mislukt:", err);
    }

    const trackCount = snapshot.playlists.reduce((sum, p) => sum + p.tracks.length, 0);
    return NextResponse.json({
      syncedAt: snapshot.syncedAt,
      playlistCount: snapshot.playlists.length,
      trackCount,
      failedPlaylistCount,
      trackIds,
      artistIds,
    });
  } catch (err) {
    if (err instanceof SpotifyReauthRequiredError) {
      return NextResponse.json(
        { error: "reauth_required", message: err.message },
        { status: 401 }
      );
    }

    // De interne foutdetails (kan een rauwe Spotify-foutbody of een stacktrace-achtig bericht
    // bevatten) blijven server-side in de log -- de client krijgt een generieke melding, geen
    // 1-op-1-doorgifte.
    console.error("[api/spotify/sync] sync mislukt:", err);
    return NextResponse.json(
      {
        error: "sync_failed",
        message: "Synchronisatie mislukt. Zie de serverconsole (het venster waarin `npm run dev` draait) voor details.",
      },
      { status: 500 }
    );
  }
}
