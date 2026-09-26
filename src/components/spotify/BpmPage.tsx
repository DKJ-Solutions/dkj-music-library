// BPM-sub-route binnen MMC (musicmoodcolours/<tier>bpm, zie classifyBpm.ts, tweede
// classifyWorld-bijstelling 2026-07-23). Zelfde opzet als WorldPage.tsx (component ernaast, niet
// eronder -- twee losse, kleine gescopede weergaves die toevallig hetzelfde skelet delen): elke
// route-page.tsx is een dun schilletje dat alleen zijn eigen `bpm`-tier doorgeeft -- deze
// component doet de fs-read (getEnrichedSnapshot) + het filteren (eerst tot de MMC-wereld, dan tot
// de gevraagde BPM-tier) en rendert de bestaande PlaylistManager gescoped op die subset.
import Link from "next/link";
import { getEnrichedSnapshot } from "@/lib/spotify/enrichedPlaylists";
import { filterByWorld, filterByMmcBpm } from "@/lib/spotify/playlistFilters";
import { BPM_TIER_META, type MmcBpmTier } from "@/lib/spotify/classifyBpm";
import { getPlaylistMixIndex } from "@/lib/mixes/playlistMixInfo";
import { PlaylistManager } from "./PlaylistManager";

export function BpmPage({ bpm }: { bpm: MmcBpmTier }) {
  const meta = BPM_TIER_META[bpm];
  const enriched = getEnrichedSnapshot();
  const mmcPlaylists = enriched ? filterByWorld(enriched.playlists, "mmc") : [];
  const playlists = filterByMmcBpm(mmcPlaylists, bpm);
  // Zie WorldPage.tsx: de mix-kant van de tabel is een server-side fs-read, doorgegeven als prop.
  // Geen brontelling/sync-check hier: deze route toont een BPM-subset, en die tegen álle mixen afzetten
  // zou altijd een kruis geven -- appels met peren. Dat overzicht staat een niveau hoger, op MMC.
  const mixInfoById = enriched ? getPlaylistMixIndex().byPlaylistId : {};

  return (
    <main className="wrap">
      <header className="masthead">
        <Link href="/spotify/musicmoodcolours" className="world-back-link">
          ← Terug naar MMC
        </Link>
        <h1>{meta.label}</h1>
        <p className="lede">
          De MMC-mixen ({"House Mix / Drum & Bass (Mix), altijd met een Vol.-nummer"}) op {meta.label}.
        </p>
      </header>

      {!enriched ? (
        <section className="layer">
          <p className="empty-note">
            Nog geen snapshot -- start eerst een sync op{" "}
            <Link href="/spotify" className="accent-text">
              /spotify
            </Link>
            .
          </p>
        </section>
      ) : playlists.length === 0 ? (
        <section className="layer">
          <p className="empty-note">
            Nog geen MMC-playlists op {meta.label} -- ze staan er misschien op een andere BPM-tier
            (gecorrigeerd via het BPM-dropdownje op elke rij), of de auto-classificatie heeft hier
            nog niets in geraden.
          </p>
        </section>
      ) : (
        // Een laag dieper dan de MMC-wereld (Dave, 2026-07-25): naast WERELD en TYPE -- die op elke
        // MMC-rij hetzelfde zijn -- draagt hier ook de BPM-kolom op iedere rij dezelfde tier, want dát
        // is waarop deze route filtert. De BPM-correctie-select zit in die kolom, dus bijstellen gaat
        // vanaf hier niet meer; dat kan een niveau hoger, op /spotify/musicmoodcolours.
        <PlaylistManager
          playlists={playlists}
          mixInfoById={mixInfoById}
          hiddenColumns={["world", "type", "bpm"]}
        />
      )}
    </main>
  );
}
