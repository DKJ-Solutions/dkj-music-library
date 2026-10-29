"use client";

// De sync-knop boven een tracktabel die bij één Spotify-playlist hoort (de werkbak op
// /mixen/preparation/<id>, de mix op /mixen/published/<slug>): haalt die ene playlist opnieuw op via
// POST /api/spotify/sync/playlist en ververst daarna de pagina, zodat de tabel weer gelijkloopt met Spotify
// (Dave, 29 oktober 2026). De volledige sync van alle playlists blijft op /spotify/verbinding.
//
// router.refresh() en geen page-reload: de pagina is een Server Component die snapshot en bibliotheek bij
// het renderen leest -- zelfde reden als in verbinding/SyncButton.tsx.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { readRouteErrorMessage } from "@/lib/http/routeError";

export function PlaylistSyncButton({ playlistId, playlistName }: { playlistId: string; playlistName: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [melding, setMelding] = useState<string | null>(null);

  async function sync() {
    if (status === "busy") return;
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
      >
        <svg
          className={status === "busy" ? "playlist-sync__icon is-spinning" : "playlist-sync__icon"}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3" />
          <path d="M18 3v3.7h-3.7M6 21v-3.7h3.7" />
        </svg>
        {status === "busy" ? "Bezig met sync…" : "Sync met Spotify"}
      </button>
    </div>
  );
}
