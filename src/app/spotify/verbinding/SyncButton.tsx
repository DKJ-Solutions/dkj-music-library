"use client";
// De sync-card op /spotify/verbinding: de laatste snapshot en de knop voor POST /api/spotify/sync.
// Een volledige sync van honderden playlists kan een tijd duren, dus de knop toont een "bezig"-status
// i.p.v. te lijken te hangen. Is de login verlopen (reauth_required), dan staat de inlogknop in de
// melding zelf (#122): de status-card ernaast is server-gerenderd en wist nog niet dat de tokens weg zijn.
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

interface SyncButtonProps {
  /** Zonder: alleen de knop en de uitslag, voor de kop van een playlistpagina (classic-pop, maple-classic). */
  card?: { connected: boolean; snapshot: { playlistCount: number; trackCount: number; syncedAt: string } | null };
}

export default function SyncButton({ card }: SyncButtonProps) {
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
        // Bij reauth_required heeft de server de tokens net gewist; ververs de Server Components zodat de
        // status-card en de inlogknop in de kop dat ook laten zien.
        if ((data as SyncError).error === "reauth_required") router.refresh();
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

  const button = (
    <button
      type="button"
      className="btn btn--primary"
      onClick={handleSync}
      disabled={(card && !card.connected) || status === "syncing"}
    >
      {status === "syncing" ? "Bezig met synchroniseren..." : "Start sync"}
    </button>
  );

  const outcome = (
    <>
      {status === "done" && result && (
        <p className="msg pos verbinding-result">
          Klaar: {result.playlistCount} playlists, {result.trackCount} tracks.
          {!!result.failedPlaylistCount &&
            ` ${result.failedPlaylistCount} playlist(s) konden hun tracks niet ophalen en houden hun vorige stand -- zie de serverconsole.`}
        </p>
      )}

      {status === "error" && error && (
        <div className="notice verbinding-result">
          {error.error === "reauth_required" ? (
            <>
              <p className="msg">Je Spotify-login is verlopen. Log opnieuw in en start daarna de sync opnieuw.</p>
              <a className="btn btn--primary verbinding-result__action" href="/api/auth/login/spotify">
                Opnieuw inloggen bij Spotify
              </a>
            </>
          ) : (
            <p className="msg">De sync is mislukt: {error.message}</p>
          )}
        </div>
      )}
    </>
  );

  if (!card) {
    return (
      <div className="verbinding-result">
        {button}
        {outcome}
      </div>
    );
  }

  return (
    <section className="card">
      <div className="card__head verbinding-head">
        <div>
          <h3 className="card__title">Sync</h3>
          <p className="card__sub">Alle playlists en tracks, naar data/spotify/snapshot.json.</p>
        </div>
        {button}
      </div>

      {card.snapshot ? (
        <dl className="facts">
          <div>
            <dt>Playlists</dt>
            <dd>{card.snapshot.playlistCount}</dd>
          </div>
          <div>
            <dt>Tracks</dt>
            <dd>{card.snapshot.trackCount}</dd>
          </div>
          <div>
            <dt>Laatste sync</dt>
            <dd>{new Date(card.snapshot.syncedAt).toLocaleString("nl-NL")}</dd>
          </div>
        </dl>
      ) : (
        <p className="msg">Nog geen back-up. {card.connected ? "Start de eerste sync." : "Log eerst in bij Spotify."}</p>
      )}

      {outcome}
    </section>
  );
}
