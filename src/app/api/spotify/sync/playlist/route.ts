// De sync van ÉÉN playlist: haalt zijn metadata en tracks opnieuw op bij Spotify, zet hem op zijn plek in
// data/spotify/snapshot.json en werkt daarna de bibliotheek bij (librarySync.ts). Aangeroepen door de
// sync-knop boven een tracktabel (PlaylistSyncButton.tsx), zodat die tabel weer gelijkloopt met de playlist
// zonder de volledige sync van honderden playlists af te wachten.
//
// Body: `{ "playlistId": "<Spotify-playlist-id>" }`.
//
// READ-ONLY richting Spotify: uitsluitend GET-calls via ingest.ts/httpClient.ts.
//
// Geen archiefkopie van de oude snapshot, anders dan de volledige sync: elke klik zou dan een kopie van
// tientallen MB's maken en de historie (MAX_HISTORY_ENTRIES) volschuiven met bijna-gelijke versies.
import { NextResponse } from "next/server";
import { syncOnePlaylist } from "@/lib/spotify/ingest";
import { readSnapshot, writeSnapshot } from "@/lib/spotify/snapshotStore";
import { SpotifyApiError, SpotifyReauthRequiredError } from "@/lib/spotify/errors";
import { sameOriginGuard } from "@/lib/http/sameOrigin";
import { updateLibraryFromSnapshot } from "@/lib/library/librarySync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Spotify-ID's zijn base62 van 22 tekens; alles anders hoeft niet eens naar Spotify.
const PLAYLIST_ID = /^[A-Za-z0-9]{22}$/;

export async function POST(request: Request) {
  const guard = sameOriginGuard(request);
  if (guard) return guard;

  const body = (await request.json().catch(() => null)) as { playlistId?: unknown } | null;
  const playlistId = typeof body?.playlistId === "string" ? body.playlistId : "";
  if (!PLAYLIST_ID.test(playlistId)) {
    return NextResponse.json({ error: "bad_request", message: "Geen geldig playlist-id." }, { status: 400 });
  }

  const previous = readSnapshot();
  if (!previous) {
    return NextResponse.json(
      { error: "no_snapshot", message: "Er is nog geen snapshot -- start eerst een volledige sync op /spotify/verbinding." },
      { status: 409 }
    );
  }

  try {
    const { snapshot, playlist } = await syncOnePlaylist(previous, playlistId);
    writeSnapshot(snapshot);

    // Lukt de bibliotheek niet, dan staat de snapshot er wél -- zelfde afspraak als de volledige sync.
    let libraryUpdated = true;
    try {
      updateLibraryFromSnapshot(snapshot);
    } catch (err) {
      libraryUpdated = false;
      console.error("[api/spotify/sync/playlist] bibliotheek bijwerken mislukt:", err);
    }

    return NextResponse.json({ playlistId: playlist.id, name: playlist.name, trackCount: playlist.trackCount, libraryUpdated });
  } catch (err) {
    if (err instanceof SpotifyReauthRequiredError) {
      return NextResponse.json({ error: "reauth_required", message: err.message }, { status: 401 });
    }
    if (err instanceof SpotifyApiError && (err.status === 403 || err.status === 404)) {
      return NextResponse.json(
        { error: "not_available", message: "Spotify geeft deze playlist niet (meer) vrij." },
        { status: 404 }
      );
    }
    console.error("[api/spotify/sync/playlist] sync mislukt:", err);
    return NextResponse.json(
      {
        error: "sync_failed",
        message: "Synchronisatie mislukt. Zie de serverconsole (het venster waarin `npm run dev` draait) voor details.",
      },
      { status: 500 }
    );
  }
}
