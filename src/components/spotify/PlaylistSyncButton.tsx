"use client";

// De sync-knop boven een tracktabel die bij één Spotify-playlist hoort (de werkbak op
// /mixen/preparation/<id>, de mix op /mixen/published/<slug>): haalt die ene playlist opnieuw op via
// POST /api/spotify/sync/playlist en ververst daarna de pagina, zodat de tabel weer gelijkloopt met Spotify
// (Dave, 29 oktober 2026). De volledige sync van alle playlists blijft op /spotify.
//
// router.refresh() en geen page-reload: de pagina is een Server Component die snapshot en bibliotheek bij
// het renderen leest -- zelfde reden als in verbinding/SyncButton.tsx.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { readRouteErrorMessage } from "@/lib/http/routeError";
import { SyncDirectionIcon, SyncRoute } from "./SyncDirection";

/** `pendingMoves` is het aantal verplaatsingen in een uitgestelde volgorde van deze playlist (PendingOrderButton):
 *  ophalen bij Spotify vervangt de snapshot, waarna die lokale volgorde niet meer past en alleen nog
 *  weggegooid kan worden. Daarom eerst bevestigen, zodat een klik hem nooit stil vernietigt. */
export function PlaylistSyncButton({
  playlistId,
  playlistName,
  pendingMoves = 0,
}: {
  playlistId: string;
  playlistName: string;
  pendingMoves?: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [melding, setMelding] = useState<string | null>(null);

  async function sync() {
    if (status === "busy") return;
    if (
      pendingMoves > 0 &&
      !window.confirm(
        `Er staan ${pendingMoves} verplaatsingen nog niet in Spotify. Als je nu ophaalt, past de lokale volgorde niet meer en kun je hem alleen nog weggooien. Toch ophalen?`
      )
    ) {
      return;
    }
    setStatus("busy");
    setMelding(null);
    try {
      const res = await fetch("/api/spotify/sync/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });
      if (!res.ok) throw new Error((await readRouteErrorMessage(res)) ?? `status ${res.status}`);
      const data = (await res.json()) as { trackCount: number; libraryUpdated: boolean };
      setStatus("done");
      setMelding(
        data.libraryUpdated
          ? `In sync: ${data.trackCount} tracks.`
          : `Playlist opgehaald (${data.trackCount} tracks), maar de bibliotheek bijwerken mislukte -- zie de serverconsole.`
      );
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMelding(`Sync mislukt: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="playlist-sync">
      {melding && (
        <span className={status === "error" ? "playlist-sync__note playlist-sync__note--error" : "playlist-sync__note"} role="status">
          {melding}
        </span>
      )}
      <button
        type="button"
        className="btn btn--primary"
        disabled={status === "busy"}
        title={`Haal "${playlistName}" opnieuw op bij Spotify`}
        onClick={sync}
        aria-label={status === "busy" ? "Bezig met ophalen…" : "Ophalen uit Spotify"}
      >
        <SyncDirectionIcon direction="pull" spinning={status === "busy"} />
        {status === "busy" ? "Bezig met ophalen…" : "Ophalen"}
        <SyncRoute direction="pull" />
      </button>
    </div>
  );
}
