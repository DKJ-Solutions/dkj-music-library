// De tweede tabel onder de playlist-manager (Dave, 2026-07-25): welke mix-ID's uit de DJ Cylow-bron
// ontbreken in de tabel erboven? Dat is het verschil dat de sync-check bij de tellers meldt -- hier
// uitgesplitst per mix, zodat "48 tegen 77" niet alleen een getal is maar een werklijst.
//
// Woont binnen dezelfde `.layer`-sectie als de hoofdtabel, met een `.band`-kop erboven -- hetzelfde
// idioom als de "genummerd, maar geen mix in de data"-sectie op de brug (MixBridge.tsx), die daar ook
// als tweede lijst onder de eerste hangt.
//
// De koppen zijn sorteerknoppen, net als in de hoofdtabel (Dave, 2026-07-25). Ze delen daarvoor de
// machinerie in lib/sortRows.ts, zodat de twee tabellen zich identiek gedragen: dezelfde
// klik-cyclus (oplopend → aflopend → geen sortering) en lege cellen die in beide naar de bodem zakken.
// Zonder sortering geldt hier de bronordening: nieuwste mix eerst.
//
// Heeft eigen state en hoort dus in de client-boom; dat is het geval, want PlaylistManager rendert hem en
// die is zelf een Client Component. Het volledige koppelbeeld -- inclusief de mixen die wél een playlist
// hebben en de afwijkingen daarin -- staat op /spotify/musicmoodcolours/mixen.
import Link from "next/link";
import { useMemo, useState } from "react";
import { nextSort } from "@/lib/sortRows";
import {
  MISSING_MIX_COLUMNS,
  sortMissingMixes,
  type MissingMixSort,
} from "@/lib/mixes/missingMixSort";
import type { MissingMix } from "@/lib/mixes/playlistMixInfo";

const REASON_LABEL: Record<MissingMix["reason"], string> = {
  "bucket-only": "alleen in een emmer",
  unmatched: "niet teruggevonden",
  "claimed-by-other-mix": "playlist is van een andere mix",
};

/** Het merkteken in de laatste kolom, plus de uitleg erbij. `·` is de normale, verwachte reden (de
 *  tracks staan in een emmer); de twee andere vragen aandacht en krijgen daarom een eigen teken. */
function reasonFlag(mix: MissingMix): { symbol: string; title: string } {
  switch (mix.reason) {
    case "unmatched":
      return { symbol: "✗", title: "Niet teruggevonden: geen enkele playlist bevat deze tracklijst" };
    case "claimed-by-other-mix":
      return {
        symbol: "⇄",
        title: mix.claimedBy
          ? `De best passende playlist ("${mix.claimedBy.playlistName}") draagt de tag mix:${mix.claimedBy.mixId} en is dus van die mix -- deze mix heeft geen eigen playlist`
          : "De best passende playlist draagt de tag van een andere mix",
      };
    default:
      return { symbol: "·", title: `Alleen in een emmer: ${mix.bucketName ?? "een verzamellijst"}` };
  }
}

export function MissingMixes({ mixes }: { mixes: readonly MissingMix[] }) {
  // null = geen sortering: dan geldt de bronordening waarin de lijst binnenkomt (nieuwste mix eerst).
  const [sort, setSort] = useState<MissingMixSort | null>(null);
  const rijen = useMemo(() => (sort === null ? mixes : sortMissingMixes(mixes, sort)), [mixes, sort]);

  if (mixes.length === 0) return null;

  return (
    <div className="missing-mixes">
      <div className="band">
        <span className="eyebrow">Ontbreekt op Spotify</span>
        <span className="missing-count">{mixes.length}</span>
        <span className="rule"></span>
      </div>
      <p className="section-lede">
        Mixen die op de DJ Cylow-website staan maar geen eigen playlist hebben, en waarvan het ID dus in
        geen enkele rij hierboven voorkomt. Hun tracks staan wél op Spotify, maar samen met tientallen
        andere in een grote kleur-emmer — op twee uitzonderingen na:{" "}
        <span className="missing-flag-inline">✗</span> is helemaal niet teruggevonden, en{" "}
        <span className="missing-flag-inline">⇄</span> hoort bij een playlist die via haar{" "}
        <code>mix:</code>-tag al van een andere mix is.{" "}
        <Link href="/spotify/musicmoodcolours/mixen" className="accent-text">
          Het volledige koppelbeeld staat op de brug →
        </Link>
      </p>

      {/* Zelfde kolomvolgorde én -breedtes als de hoofdtabel (Dave, 2026-07-25), met alleen de kolommen
          die voor een mix bestaan. WERELD heeft hier geen tegenhanger en TYPE is voor elke mix in de bron
          EDM -- precies de reden dat de hoofdtabel die kolom op MMC ook verbergt. Op
          /spotify/musicmoodcolours lijnen beide tabellen daardoor kolom voor kolom uit.

          De laatste kolom staat op de plek én de breedte van de done-vink en draagt de uitzondering: een
          ✗ bij een mix die helemaal niet is teruggevonden. Bewust géén brede "waarom"-kolom met tekst --
          die zou 28 van de 29 keer hetzelfde zeggen ("alleen in een emmer", wat de lede al uitlegt) en
          bovendien de flexibele naam-kolom ~100px insnoeren, waarmee alles ná de naam alsnog scheef zou
          lopen ten opzichte van de tabel erboven. */}
      <div className="missing-heads">
        {MISSING_MIX_COLUMNS.map(({ column, label, srLabel }) => {
          const actief = sort?.column === column;
          const naam = srLabel ?? label;
          return (
            <button
              key={column}
              type="button"
              className="col-head-sort"
              data-active={actief}
              aria-label={
                actief
                  ? `${naam} — nu gesorteerd ${sort.direction === "asc" ? "oplopend" : "aflopend"}; klik om ${sort.direction === "asc" ? "aflopend te sorteren" : "de sortering te wissen"}`
                  : `Sorteer op ${naam}`
              }
              onClick={() => setSort((prev) => nextSort(prev, column))}
            >
              <span className="col-head-label">{label}</span>
              {actief && (
                <span className="col-head-arrow" aria-hidden="true">
                  {sort.direction === "asc" ? "▲" : "▼"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {rijen.map((mix) => {
        const flag = reasonFlag(mix);
        return (
          <div className="missing-row" key={`${mix.mixId}-${mix.title}`} data-reason={mix.reason}>
            {/* De échte BPM uit de mix-data -- een feit, waar de playlist-kant een gok toont. */}
            <span className="missing-bpm">{mix.bpm ?? "—"}</span>
            <span className="missing-title" title={mix.title}>
              {mix.title || "(zonder titel)"}
            </span>
            <span
              className={mix.color ? "swatch" : "swatch swatch--neutral"}
              style={mix.color ? { background: `var(--emotion-${mix.color.toLowerCase()})` } : undefined}
              role="img"
              title={mix.color ?? "Geen kleur herkend"}
              aria-label={mix.color ? `Kleur: ${mix.color}` : "Geen kleur herkend"}
            />
            <span className="missing-id">{mix.mixId || "—"}</span>
            <span className="missing-genre">{mix.genre ?? "—"}</span>
            <span className="missing-subgenre">{mix.subgenre ?? "—"}</span>
            <span className="missing-density" data-density={mix.density ?? ""}>
              {mix.density ?? "—"}
            </span>
            <span className="missing-gender">{mix.gender ?? "—"}</span>
            <span className="missing-vol">{mix.volume ?? "—"}</span>
            <span className="missing-tracks">{mix.trackCount}</span>
            <span className="missing-flag" title={flag.title} aria-label={REASON_LABEL[mix.reason]}>
              {flag.symbol}
            </span>
          </div>
        );
      })}
    </div>
  );
}
