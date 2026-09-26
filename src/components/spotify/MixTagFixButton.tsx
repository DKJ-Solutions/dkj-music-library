"use client";

// De correctie-knop bij een verweesde `mix:`-tag op de brug (MixBridge.tsx).
//
// WAAROM ALLEEN HIER. Een playlist waarvan de beschrijving een ánder mix-ID noemt dan de tracks kan twee
// dingen betekenen (zie DeclaredIdConflict in lib/mixes/matchMixes.ts). Wijst die tag naar een mix die in
// de bron BESTAAT, dan is de tag vermoedelijk goed en zou corrigeren die andere mix zijn playlist
// afpakken -- daar hoort dus geen knop. Deze knop verschijnt uitsluitend bij een tag die naar een
// niet-bestaande mix wijst: een wees, waar niets meer aan hangt en waar het ID uit de tracklist de enige
// overgebleven kandidaat is.
//
// Schrijft via dezelfde route als de playlist-tabel (`POST /api/spotify/mix-tag`), die het beheerde blok
// ter plekke vervangt en de vrije tekst laat staan (withMixDescription in lib/mixes/mixDescription.ts).
// Er is dus geen tweede schrijfweg naar Spotify bijgekomen. Let op het gevolg: corrigeren schrijft niet
// alleen het juiste ID maar de hele spiegel van de juiste mix -- precies wat je wil.
import { useState } from "react";
import { readRouteErrorMessage } from "@/lib/http/routeError";

export function MixTagFixButton({
  playlistId,
  playlistName,
  wrongMixId,
  correctMixId,
}: {
  playlistId: string;
  playlistName: string;
  /** Het mix-ID dat nu in de beschrijving staat en naar niets verwijst. */
  wrongMixId: string;
  /** Het mix-ID waar de tracks van deze playlist naar wijzen -- de correctie. */
  correctMixId: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  // De reden van de mislukking, uit het antwoord van de route -- daar begint Spotify's eigen boodschap.
  // "mislukt" zonder meer laat je raden; in de tooltip past de hele uitleg.
  const [reden, setReden] = useState<string | null>(null);

  async function corrigeer() {
    if (state === "busy" || state === "done") return;
    setState("busy");
    setReden(null);
    try {
      const res = await fetch("/api/spotify/mix-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, mixId: correctMixId }),
      });
      if (!res.ok) {
        throw new Error((await readRouteErrorMessage(res)) ?? `status ${res.status}`);
      }
      setState("done");
    } catch (err) {
      setState("error");
      setReden(err instanceof Error ? err.message : null);
    }
  }

  // Géén optimistische weergave hier, anders dan in de playlist-tabel: dit is een correctie op een rij
  // die de brug op de server heeft berekend, en die herberekening komt pas bij de volgende sync. Doen
  // alsof de rij al klopt zou een koppeling suggereren die nog niet in de data zit -- dus melden we wat
  // er geschreven is en waar het zichtbaar wordt.
  if (state === "done") {
    return (
      <em className="mix-tag-fixed" title="De brug rekent hiermee vanaf de volgende sync">
        → mix:{correctMixId} gezet
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
          : `Vervang mix:${wrongMixId} door mix:${correctMixId} in de Spotify-beschrijving van "${playlistName}" (de rest van de tekst blijft staan)`
      }
      aria-label={`Corrigeer de mix-tag van ${playlistName} naar mix:${correctMixId}`}
      onClick={corrigeer}
    >
      {state === "busy" ? "…" : state === "error" ? "mislukt — opnieuw" : `corrigeer → ${correctMixId}`}
    </button>
  );
}
