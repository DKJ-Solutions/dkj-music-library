"use client";

// Het knopje in de naam-cel van de playlist-tabel: trekt de naam op Spotify gelijk met `title_spotify`
// uit de mix-bron (Dave, 2026-08-11 -- "ik wil dat alle titels in Spotify dezelfde titel krijgen als in
// djcylow").
//
// EIGEN COMPONENT en niet nog een handler in PlaylistManager: die telt al 965 regels en draagt de
// mix-tag-schrijfactie plus drie lokale correcties. Deze knop heeft niets van die state nodig -- hij kent
// zijn eigen playlist, zijn eigen doelnaam en zijn eigen uitkomst -- dus houdt hij die bij zichzelf,
// precies zoals MixTagFixButton dat op de brug doet.
//
// DRIE STANDEN, en de knop verschijnt alleen in de middelste:
//   - `in-sync`   -- de playlist heet al zo: niets te doen, geen knop.
//   - `outdated`  -- de knop, met de doelnaam in de tooltip.
//   - `blocked`   -- géén knop maar een merkteken met de reden in de tooltip. Nu zijn dat de zes
//                    Cyan-playlists: de bron schrijft 💠 waar Dave's playlists 🧊 gebruiken, en die fout
//                    wordt in de bron rechtgezet, niet hier (zie lib/mixes/spotifyTitle.ts).
import { useState } from "react";
import { readRouteErrorMessage } from "@/lib/http/routeError";
import type { TitleState } from "@/lib/mixes/spotifyTitle";

export function PlaylistNameSyncButton({
  playlistId,
  playlistName,
  state,
  target,
  blocker,
  onDone,
}: {
  playlistId: string;
  /** De huidige naam -- voor de tooltip en het aria-label, zodat duidelijk is wát er verandert. */
  playlistName: string;
  state: TitleState;
  /** De naam die de bron dicteert. Null wanneer de bron er geen levert (dan is `state` "blocked"). */
  target: string | null;
  /** Bij `blocked`: de reden, in Dave's eigen taal. */
  blocker: string | null;
  /** Meldt de geslaagde wijziging aan de tabel, zodat de rij de nieuwe naam kan tonen zonder te wachten
   *  op de volgende sync. Optioneel: zonder deze prop werkt de knop, alleen zonder optimistische rij. */
  onDone?: (playlistId: string, name: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [reden, setReden] = useState<string | null>(null);

  if (state === "blocked") {
    return (
      <span className="name-blocked" role="img" title={blocker ?? "De naam kan nog niet gezet worden"}>
        ⚠
      </span>
    );
  }

  if (state === "in-sync" || status === "done") {
    return null;
  }

  async function zetNaam() {
    if (status === "busy") return;
    setStatus("busy");
    setReden(null);
    try {
      // Alleen het playlist-id gaat mee: de route haalt de naam zelf uit de mix-bron. Zie de toelichting
      // in app/api/spotify/playlist-name/route.ts -- de client kan hier geen naam kiezen.
      const res = await fetch("/api/spotify/playlist-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });
      if (!res.ok) throw new Error((await readRouteErrorMessage(res)) ?? `status ${res.status}`);
      setStatus("done");
      if (target !== null) onDone?.(playlistId, target);
    } catch (err) {
      setStatus("error");
      setReden(err instanceof Error ? err.message : null);
    }
  }

  return (
    <button
      type="button"
      className="name-write"
      disabled={status === "busy"}
      title={
        status === "error" && reden
          ? `Mislukt: ${reden}`
          : `Hernoem deze playlist op Spotify naar de naam uit de mix-bron:\n"${playlistName}"\n  wordt\n"${target ?? ""}"`
      }
      aria-label={`Hernoem ${playlistName} op Spotify naar ${target ?? "de naam uit de mix-bron"}`}
      onClick={zetNaam}
    >
      {status === "busy" ? "…" : status === "error" ? "✕" : "✎"}
    </button>
  );
}
