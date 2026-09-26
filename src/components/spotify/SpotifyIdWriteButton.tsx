"use client";

// De twee knoppen van het id_spotify-overzicht: één per rij en één voor alles tegelijk. Ze schrijven
// via `POST /api/spotify/mix-tag` -- dezelfde en enige route die de beschrijving zet, dus er is geen
// derde schrijfweg naar Spotify bijgekomen. Wat de route schrijft komt server-side uit de mix-bron; de
// client stuurt alleen een playlist-id en een mix-ID mee.
//
// SEQUENTIEEL, NIET PARALLEL, en doorgaand bij een fout -- de twee lessen van de eerdere bulk-acties.
// Tientallen schrijfacties parallel lopen tegen de rate limit, waarna elke aanroep zijn eigen
// 429-wachttijd moet uitzitten; en één playlist die weigert hoort de andere 41 niet te blokkeren.
// De reden van de EERSTE mislukking wordt bewaard: bij "0 gelukt, 42 mislukt" is er één
// gemeenschappelijke oorzaak, en alleen een getal tonen gooit precies die informatie weg.
//
// DE GELIJKENIS MET PlaylistNameBulkButton IS ECHT EN BEWUST NIET WEGGEHAALD. Die knop draait dezelfde
// lus over een andere route. Ze samenvoegen zou een gedeelde abstractie vragen die vier dingen moet
// kunnen variëren (route, body, label, uitslagtekst) en daarmee meer weegt dan wat ze bespaart -- bij
// een derde bulk-actie is dat oordeel anders, en dan hoort het ook echt gedaan te worden.
import { useState } from "react";
import { readRouteErrorMessage } from "@/lib/http/routeError";

export interface KeyWrite {
  playlistId: string;
  mixId: string;
}

/** Eén schrijfactie. Levert `null` bij succes en de reden bij een mislukking, zodat de aanroeper geen
 *  try/catch hoeft te herhalen. */
async function schrijf({ playlistId, mixId }: KeyWrite): Promise<string | null> {
  try {
    const res = await fetch("/api/spotify/mix-tag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId, mixId }),
    });
    if (!res.ok) return (await readRouteErrorMessage(res)) ?? `status ${res.status}`;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "onbekende fout";
  }
}

/** Het knopje in de rij: zet de sleutel van deze ene playlist. */
export function SpotifyIdWriteButton({
  playlistId,
  playlistName,
  mixId,
  targetKey,
}: KeyWrite & { playlistName: string; targetKey: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [reden, setReden] = useState<string | null>(null);

  async function schrijfDeze() {
    if (state === "busy" || state === "done") return;
    setState("busy");
    setReden(null);
    const fout = await schrijf({ playlistId, mixId });
    setState(fout === null ? "done" : "error");
    setReden(fout);
  }

  // Geen optimistische herweergave van de rij: die is op de server berekend uit de snapshot, en de
  // snapshot krijgt deze wijziging pas bij de volgende sync te zien. Doen alsof de rij al klopt zou een
  // stand tonen die nog niet in de data zit -- dus melden we wat er geschreven is.
  if (state === "done") {
    return (
      <em className="mix-tag-fixed" title="Zichtbaar in dit overzicht vanaf de volgende sync">
        geschreven
      </em>
    );
  }

  return (
    <button
      type="button"
      className="mix-tag-fix"
      disabled={state === "busy"}
      title={
        state === "error" && reden
          ? `Mislukt: ${reden}`
          : `Zet ${targetKey} in de Spotify-beschrijving van "${playlistName}" (de vrije tekst erachter blijft staan)`
      }
      aria-label={`Zet ${targetKey} in de beschrijving van ${playlistName}`}
      onClick={schrijfDeze}
    >
      {state === "busy" ? "…" : state === "error" ? "mislukt — opnieuw" : "schrijf"}
    </button>
  );
}

/** De bulk-knop boven het overzicht: alle rijen die nog te schrijven zijn, één voor één. */
export function SpotifyIdBulkButton({
  teDoen,
  blockedCount,
}: {
  teDoen: readonly KeyWrite[];
  /** Rijen waar de bron geen bruikbare `id_spotify` levert. Die blijven hierbuiten, en dat hoort de
   *  knop te zeggen in plaats van ze stil te laten vallen. */
  blockedCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [voortgang, setVoortgang] = useState<{ done: number; total: number } | null>(null);
  const [uitslag, setUitslag] = useState<{ gelukt: number; gefaald: number; reden: string | null } | null>(
    null
  );

  async function schrijfAlles() {
    if (busy) return;
    setBusy(true);
    setUitslag(null);

    let gelukt = 0;
    let gefaald = 0;
    let eersteReden: string | null = null;

    for (const [index, rij] of teDoen.entries()) {
      setVoortgang({ done: index, total: teDoen.length });
      const fout = await schrijf(rij);
      if (fout === null) {
        gelukt++;
      } else {
        gefaald++;
        // De eerste reden, niet de laatste: bij een gemeenschappelijke oorzaak zijn ze gelijk, en bij
        // losse weigeringen is de eerste de minst vertroebelde (geen rate-limit-ruis van de rest erna).
        if (eersteReden === null) eersteReden = fout;
      }
    }

    setVoortgang({ done: teDoen.length, total: teDoen.length });
    setUitslag({ gelukt, gefaald, reden: eersteReden });
    setBusy(false);
  }

  // Niets te doen én niets geblokkeerd: dan is de hele sleutel-kwestie in orde en hoort er geen knop te
  // staan. De uitslag blijft wél staan zolang die er is -- anders verdwijnt de melding op het moment dat
  // de laatste rij lukt, precies wanneer je hem wil lezen.
  if (teDoen.length === 0 && blockedCount === 0 && uitslag === null) return null;

  return (
    <>
      {teDoen.length > 0 && (
        <p className="playlist-bulk-tag">
          <button type="button" className="pill-toggle" disabled={busy} onClick={schrijfAlles}>
            {busy
              ? `Bezig… ${voortgang?.done ?? 0}/${voortgang?.total ?? teDoen.length}`
              : `Schrijf id_spotify in ${teDoen.length} playlistbeschrijving${teDoen.length === 1 ? "" : "en"}`}
          </button>
          <span className="playlist-bulk-hint">
            Neemt <code>id_spotify</code> uit de mix-bron over als laatste segment. Eén voor één, en gaat
            door bij een fout. De vrije tekst achter het blok blijft staan.
          </span>
        </p>
      )}

      {blockedCount > 0 && (
        <p className="playlist-bulk-hint">
          {blockedCount} playlist{blockedCount === 1 ? "" : "s"} blijft hierbuiten omdat de bron daar geen
          bruikbare <code>id_spotify</code> levert — de reden staat in de rij.
        </p>
      )}

      {uitslag && (
        <p
          className="playlist-bulk-result"
          style={{ color: uitslag.gefaald > 0 ? "var(--status-critical)" : "var(--status-done)" }}
        >
          {uitslag.gelukt} beschrijving{uitslag.gelukt === 1 ? "" : "en"} bijgewerkt op Spotify
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
