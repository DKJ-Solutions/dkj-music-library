"use client";
// Kale trigger-knop voor POST /api/spotify/sync (fase 3). Bewust ONGESTYLED, zie page.tsx --
// ontwerp is fase 5. Toont alleen de kale cijfers (aantal playlists/tracks, tijdstip) of de
// foutmelding; een volledige sync van honderden playlists kan een tijd duren, dus de knop toont
// een "bezig"-status i.p.v. te lijken te hangen.
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SyncResult {
  syncedAt: string;
  playlistCount: number;
  trackCount: number;
  /** Aantal playlists waarvan het ophalen van tracks is mislukt (niet-403) en op een fallback
   *  (vorige tracks, of leeg) is teruggevallen -- zie ingest.ts. 0 bij een schone sync. */
  failedPlaylistCount?: number;
}

interface SyncError {
  error: string;
  message: string;
}

export default function SyncButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<SyncError | null>(null);

  async function handleSync() {
    setStatus("syncing");
    setError(null);
    try {
      const res = await fetch("/api/spotify/sync", { method: "POST" });
      const data = (await res.json()) as SyncResult | SyncError;

      if (!res.ok) {
        setError(data as SyncError);
        setStatus("error");
        return;
      }

      setResult(data as SyncResult);
      setStatus("done");
      // De pagina is een Server Component die de snapshot éénmalig van schijf leest bij het
      // renderen; de sync heeft die snapshot zojuist herschreven. router.refresh() haalt de
      // Server Components van deze route opnieuw op (verse snapshot) zonder volledige page-reload
      // en zonder de "done"-status hierboven te verliezen -- anders blijft de werelden-/playlist-
      // laag de oude stand tonen tot de gebruiker handmatig ververst.
      router.refresh();
    } catch (err) {
      setError({ error: "network_error", message: err instanceof Error ? err.message : String(err) });
      setStatus("error");
    }
  }

  return (
    <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #ccc" }}>
      <h2>Sync (fase 3)</h2>
      <p>
        Haalt alle playlists + tracks op via de Spotify Web API en schrijft ze weg naar
        data/spotify/snapshot.json. Kan bij honderden playlists een tijd duren.
      </p>
      <button type="button" onClick={handleSync} disabled={status === "syncing"}>
        {status === "syncing" ? "Bezig met synchroniseren..." : "Start sync"}
      </button>

      {status === "done" && result && (
        <>
          <p style={{ color: "seagreen" }}>
            Klaar: {result.playlistCount} playlist(s), {result.trackCount} track(s). Tijdstip:{" "}
            {new Date(result.syncedAt).toLocaleString("nl-NL")}.
          </p>
          {!!result.failedPlaylistCount && (
            <p style={{ color: "darkorange" }}>
              Let op: {result.failedPlaylistCount} playlist(s) konden hun tracks niet ophalen
              (tijdelijke fout) en zijn teruggevallen op de vorige/lege stand -- zie de
              serverconsole voor details. De rest van de sync is gewoon gelukt.
            </p>
          )}
        </>
      )}

      {status === "error" && error && (
        <p style={{ color: "crimson" }}>
          Fout ({error.error}): {error.message}
          {error.error === "reauth_required" && " -- log opnieuw in via de link hierboven."}
        </p>
      )}
    </div>
  );
}
