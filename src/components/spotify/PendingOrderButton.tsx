"use client";

// De knop naast PlaylistSyncButton in de kop van een werkbak, alleen zichtbaar als er een uitgestelde volgorde
// is (pendingOrderStore.ts): verplaatsingen die je deed terwijl Spotify niet schrijven liet. Hij toont de
// afwijking ("N verplaatsingen nog niet in Spotify") en weet of versturen al kan:
//   - geblokkeerd: de rate limit loopt nog; de knop is uit en noemt het tijdstip, en gaat vanzelf aan zodra dat
//     voorbij is (een timer in de browser, geen herlaad nodig);
//   - klaar: "Volgorde naar Spotify sturen" (POST /api/spotify/playlist-order/sync);
//   - conflict: Spotify wijkt af van de stand waarop de lokale volgorde is gebouwd; alleen weggooien
//     (DELETE /api/spotify/playlist-order) is dan nog zinvol.
//
// `rateLimitedUntil` komt van de server en is dan al een tijdstip in de toekomst (of null). De eerste render
// leest geen klok, zodat server en browser dezelfde HTML geven; pas de timer hieronder zet de knop aan.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readRouteErrorMessage } from "@/lib/http/routeError";
import { formatClock as clock } from "@/lib/library/pendingOrder";
import { SyncDirectionIcon, SyncRoute } from "./SyncDirection";

type Status = "idle" | "syncing" | "done" | "error";

// setTimeout kapt af bij 2^31-1 ms (~24,8 dagen) en vuurt dan meteen; een rate limit is nooit zo lang.
const MAX_TIMER_MS = 2 ** 31 - 1;

export function PendingOrderButton({
  playlistId,
  moveCount,
  conflict: serverConflict,
  rateLimitedUntil: serverUntil,
}: {
  playlistId: string;
  moveCount: number;
  conflict: boolean;
  rateLimitedUntil: number | null;
}) {
  const router = useRouter();
  // Wat een antwoord van de sync-route de browser leerde, over wat de server bij het renderen wist heen.
  const [learnedUntil, setUntil] = useState<number | null>(null);
  const [learnedConflict, setConflict] = useState(false);
  const until = learnedUntil ?? serverUntil;
  const conflict = serverConflict || learnedConflict;
  // Het einde waarvoor de timer is afgegaan; geblokkeerd is alles daarvoor.
  const [elapsedUntil, setElapsedUntil] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [melding, setMelding] = useState<string | null>(null);

  // Loopt de rate limit af, dan gaat de knop aan: één timer tot het einde (ook als dat al voorbij is: 0 ms).
  useEffect(() => {
    if (until === null) return;
    const timer = window.setTimeout(() => setElapsedUntil(until), Math.min(Math.max(until - Date.now(), 0), MAX_TIMER_MS));
    return () => window.clearTimeout(timer);
  }, [until]);

  const blocked = until !== null && elapsedUntil !== until;

  async function send() {
    if (status === "syncing" || blocked || conflict) return;
    setStatus("syncing");
    setMelding(null);
    try {
      const res = await fetch("/api/spotify/playlist-order/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });
      if (!res.ok) {
        const data = (await res.clone().json().catch(() => null)) as { error?: string; rateLimitedUntil?: number } | null;
        if (data?.error === "rate_limited" && typeof data.rateLimitedUntil === "number") {
          setUntil(data.rateLimitedUntil);
          setStatus("idle");
          return;
        }
        if (data?.error === "pending_conflict") setConflict(true);
        throw new Error((await readRouteErrorMessage(res)) ?? `status ${res.status}`);
      }
      const data = (await res.json()) as { moves: number; refreshed: boolean };
      setStatus("done");
      setMelding(
        data.refreshed
          ? `Naar Spotify gestuurd (${data.moves} verplaatsingen).`
          : "Naar Spotify gestuurd, maar de lijst bijwerken mislukte: klik nog eens."
      );
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMelding(`Versturen mislukt: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function discard() {
    if (status === "syncing") return;
    setStatus("syncing");
    setMelding(null);
    try {
      const res = await fetch("/api/spotify/playlist-order", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });
      if (!res.ok) throw new Error((await readRouteErrorMessage(res)) ?? `status ${res.status}`);
      setStatus("done");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMelding(`Weggooien mislukt: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const drift = `${moveCount} ${moveCount === 1 ? "verplaatsing" : "verplaatsingen"} nog niet in Spotify`;

  if (conflict) {
    return (
      <div className="playlist-sync pending-order">
        <span className="playlist-sync__note playlist-sync__note--error" role="status">
          {melding ?? "De playlist in Spotify is gewijzigd: de lokale volgorde past er niet meer op."}
        </span>
        <button type="button" className="btn" disabled={status === "syncing"} onClick={discard}>
          Lokale volgorde weggooien
        </button>
      </div>
    );
  }

  return (
    <div className="playlist-sync pending-order">
      <span
        className={status === "error" ? "playlist-sync__note playlist-sync__note--error" : "playlist-sync__note"}
        role="status"
      >
        {melding ?? (blocked && until !== null ? `${drift} · Sync kan vanaf ${clock(until)}` : drift)}
      </span>
      <button
        type="button"
        className="btn btn--primary"
        disabled={blocked || status === "syncing"}
        title={blocked && until !== null ? `Spotify laat de hub schrijven vanaf ${clock(until)}` : undefined}
        onClick={send}
        aria-label={status === "syncing" ? "Bezig met versturen…" : "Volgorde naar Spotify sturen"}
      >
        <SyncDirectionIcon direction="push" spinning={status === "syncing"} />
        {status === "syncing" ? "Bezig met versturen…" : "Volgorde versturen"}
        <SyncRoute direction="push" />
      </button>
    </div>
  );
}
