// De BPM-sectie op /spotify/musicmoodcolours: vier tegels (96/112/128/176 BPM) + een eventuele
// "overig"-tegel, elk met een teller en een klik-door naar de bijbehorende BPM-sub-route
// (src/app/spotify/musicmoodcolours/<tier>bpm/page.tsx) -- zelfde idioom als de drie
// werelden-tegels op /spotify (zie WORLD_META/world-grid in classifyWorld.ts/_world-nav.scss),
// hier hergebruikt voor de BPM-tiers binnen MMC.
import Link from "next/link";
import type { EnrichedPlaylist } from "@/lib/spotify/enrichedPlaylists";
import { countByMmcBpm } from "@/lib/spotify/playlistFilters";
import { MMC_BPM_TIERS, BPM_TIER_META } from "@/lib/spotify/classifyBpm";

export function BpmOverviewSection({ playlists }: { playlists: EnrichedPlaylist[] }) {
  const counts = countByMmcBpm(playlists);
  const total = MMC_BPM_TIERS.reduce((sum, tier) => sum + counts[tier], 0) + counts.overig;

  return (
    <section className="layer">
      <div className="band">
        <span className="eyebrow">MMC-BPM</span>
        <span className="rule"></span>
      </div>
      <p className="section-lede">
        Dave&apos;s vaste BPM-indeling van zijn genummerde mixen -- House Mix is altijd 128, Drum
        &amp; Bass (Mix) altijd 176, met twee vaste uitzonderingen op 96/112. Elke MMC-playlist valt
        in precies één tier en is per rij corrigeerbaar.
      </p>
      <div className="world-grid">
        {MMC_BPM_TIERS.map((tier) => {
          const meta = BPM_TIER_META[tier];
          return (
            <Link key={tier} href={meta.href} className="world-tile">
              <span className="emoji" aria-hidden="true">
                🥁
              </span>
              <span className="label">{meta.label}</span>
              <span className="count">{counts[tier]}</span>
            </Link>
          );
        })}
        {/* "Overig" heeft bewust géén eigen sub-route (nog geen aanleiding voor een vijfde route
            zolang deze groep vrijwel leeg blijft, zie de opdracht) -- alleen zichtbaar zodra er
            écht een MMC-playlist zonder toewijsbare BPM is, corrigeerbaar via de BPM-select in de
            volle playlist-lijst hieronder/op de sub-routes. */}
        {counts.overig > 0 && (
          <div className="world-tile world-tile--static">
            <span className="emoji" aria-hidden="true">
              ❔
            </span>
            <span className="label">Overig</span>
            <span className="count">{counts.overig}</span>
          </div>
        )}
      </div>
      <p className="empty-note" style={{ marginTop: "10px" }}>
        Samen {total} van de {playlists.length} MMC-playlists -- niets valt buiten een BPM-tier.
      </p>
    </section>
  );
}
