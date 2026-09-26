"use client";

// De bulk-actie boven de playlist-tabel: hernoem alle playlists waarvan de naam nog afwijkt van
// `title_spotify` in de mix-bron. De grote versie van PlaylistNameSyncButton, en de tweede knop in deze
// interface die méérdere wijzigingen in Dave's Spotify-account maakt -- vandaar het aantal in het label,
// zelfde afspraak als bij de mix-tag-bulk.
//
// SEQUENTIEEL, NIET PARALLEL, en doorgaand bij een fout: dezelfde twee lessen als de mix-tag-bulk.
// Tientallen schrijfacties parallel lopen tegen de rate limit, waarna elke aanroep zijn eigen
// 429-wachttijd moet uitzitten -- langzamer én onnetter. En één playlist die weigert hoort de andere 41
// niet te blokkeren.
//
// DE REDEN VAN DE EERSTE MISLUKKING WORDT BEWAARD (Dave, 2026-07-25, geleerd bij de mix-tags): bij "0
// bijgewerkt, 42 mislukt" is er één gemeenschappelijke oorzaak en die staat in elk antwoord. Alleen een
// getal tonen gooit precies de informatie weg waarmee je verder komt.
import { useState } from "react";
import { readRouteErrorMessage } from "@/lib/http/routeError";

export interface NameToWrite {
  playlistId: string;
  /** De naam die deze playlist gaat krijgen -- alleen voor de optimistische bijwerking van de rij. */
  target: string;
}

export function PlaylistNameBulkButton({
  teDoen,
  blockedCount,
  onDone,
}: {
  /** De rijen waarvan de naam afwijkt. Geteld over álle geladen playlists, niet over de gefilterde lijst,
   *  zodat de knop niet stilletjes minder doet dan hij zegt. */
  teDoen: readonly NameToWrite[];
  /** Hoeveel rijen een naam hebben die (nog) niet geschreven mag worden -- nu de zes Cyan-playlists. Die
   *  worden hier niet meegenomen, en dat hoort de knop te zeggen in plaats van ze stil te laten vallen. */
  blockedCount: number;
  onDone?: (playlistId: string, name: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [voortgang, setVoortgang] = useState<{ done: number; total: number } | null>(null);
  const [uitslag, setUitslag] = useState<{ gelukt: number; gefaald: number; reden: string | null } | null>(
    null
  );

  async function hernoemAlles() {
    if (busy) return;
    setBusy(true);
    setUitslag(null);

    let gelukt = 0;
    let gefaald = 0;
    let eersteReden: string | null = null;

    for (const [index, rij] of teDoen.entries()) {
      setVoortgang({ done: index, total: teDoen.length });
      try {
        const res = await fetch("/api/spotify/playlist-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlistId: rij.playlistId }),
        });
        if (!res.ok) throw new Error((await readRouteErrorMessage(res)) ?? `status ${res.status}`);
        gelukt++;
        onDone?.(rij.playlistId, rij.target);
      } catch (err) {
        gefaald++;
        // De eerste reden, niet de laatste: bij een gemeenschappelijke oorzaak zijn ze gelijk, en bij losse
        // weigeringen is de eerste de minst vertroebelde (geen rate-limit-ruis van de rest erna).
        if (eersteReden === null && err instanceof Error) eersteReden = err.message;
      }
    }

    setVoortgang({ done: teDoen.length, total: teDoen.length });
    setUitslag({ gelukt, gefaald, reden: eersteReden });
    setBusy(false);
  }

  // Niets te doen én niets geblokkeerd: dan is de hele naam-kwestie in orde en hoort er geen knop te
  // staan. De uitslag blijft wél staan zolang die er is -- anders verdwijnt de melding op het moment dat
  // de laatste rij lukt, precies wanneer je hem wil lezen.
  if (teDoen.length === 0 && blockedCount === 0 && uitslag === null) return null;

  return (
    <>
      {teDoen.length > 0 && (
        <p className="playlist-bulk-tag">
          <button type="button" className="pill-toggle" disabled={busy} onClick={hernoemAlles}>
            {busy
              ? `Bezig… ${voortgang?.done ?? 0}/${voortgang?.total ?? teDoen.length}`
              : `Hernoem de ${teDoen.length} afwijkende playlistnaam${teDoen.length === 1 ? "" : "en"} op Spotify`}
          </button>
          <span className="playlist-bulk-hint">
            Neemt <code>title_spotify</code> uit de mix-bron letterlijk over. Eén voor één, en gaat door bij
            een fout.
          </span>
        </p>
      )}

      {blockedCount > 0 && (
        <p className="playlist-bulk-hint">
          {blockedCount} playlist{blockedCount === 1 ? "" : "s"} blijft hierbuiten omdat de naam in de bron
          niet klopt — hover over de ⚠ in de naam-kolom voor de reden.
        </p>
      )}

      {uitslag && (
        <p
          className="playlist-bulk-result"
          style={{ color: uitslag.gefaald > 0 ? "var(--status-critical)" : "var(--status-done)" }}
        >
          {uitslag.gelukt} playlist{uitslag.gelukt === 1 ? "" : "s"} hernoemd op Spotify
          {uitslag.gefaald > 0
            ? `; ${uitslag.gefaald} mislukt -- die staan nog met hun eigen knopje in de tabel.`
            : "."}
          {uitslag.reden && (
            <>
              {" "}
              <span className="playlist-bulk-reason">Reden van de eerste: {uitslag.reden}</span>
            </>
          )}
        </p>
      )}
    </>
  );
}
