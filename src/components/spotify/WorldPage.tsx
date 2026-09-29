// Gedeelde server-laag voor de drie wereld-sub-routes (musicmoodcolours/djcylow/prive, zie
// src/app/spotify/<wereld>/page.tsx). Elke route-page.tsx is een dun schilletje dat alleen zijn
// eigen `world` doorgeeft -- deze component doet de fs-read (getEnrichedSnapshot, fase 4 + de
// wereld-classificatie/-overrides) + het filteren, en rendert de bestaande PlaylistManager
// gescoped op die subset. Bewust GEEN aparte component per wereld (zie de opdracht: hergebruiken,
// niet dupliceren) -- alleen de meegegeven `world` verschilt.
//
// `renderExtra` (optioneel): MMC heeft, sinds de BPM-sub-routes (classifyBpm.ts, tweede
// classifyWorld-bijstelling 2026-07-23), een extra BPM-overzichtssectie nodig tussen de masthead en
// de playlist-lijst -- iets wat DJ Cylow/Privé niet hebben. In plaats van een aparte MMC-specifieke
// kopie van deze component (zie de opdracht: hergebruiken, niet dupliceren) krijgt WorldPage hier
// een optionele render-prop die de al wereld-gefilterde playlists doorkrijgt; alleen
// musicmoodcolours/page.tsx gebruikt 'm.
import Link from "next/link";
import type { ReactNode } from "react";
import { getEnrichedSnapshot, type EnrichedPlaylist } from "@/lib/spotify/enrichedPlaylists";
import { WORLD_META, type SpotifyWorld } from "@/lib/spotify/classifyWorld";
import { filterByWorld } from "@/lib/spotify/playlistFilters";
import { getPlaylistMixIndex } from "@/lib/mixes/playlistMixInfo";
import { PlaylistManager } from "./PlaylistManager";

export function WorldPage({
  world,
  renderExtra,
}: {
  world: SpotifyWorld;
  renderExtra?: (playlists: EnrichedPlaylist[]) => ReactNode;
}) {
  const meta = WORLD_META[world];
  const enriched = getEnrichedSnapshot();
  const playlists = enriched ? filterByWorld(enriched.playlists, world) : [];
  // Kolommen die op een wereld-route niets toevoegen (Dave, 2026-07-25 -- "de tabel zo compact
  // mogelijk"): de WERELD-kolom toont op elke rij dezelfde wereld, dus die is hier per definitie ruis.
  // Op MMC verdwijnt TYPE erbij: elke MMC-mix is House/Drum & Bass/Techno/Nu-Disco en dus EDM. Op DJ
  // Cylow en Privé blijft TYPE staan, want daar wisselt hij wel (POP, ALT, EDM, of leeg).
  // Let op: de wereld-correctie-select zit ín die kolom, dus corrigeren gaat vanaf hier niet meer --
  // dat kan op /spotify, waar alle playlists naast elkaar staan.
  const hiddenColumns = world === "mmc" ? (["world", "type"] as const) : (["world"] as const);
  // De mix-kant van de tabel (ID/genre/subgenre per rij): server-side opgehaald, want het leest de
  // mix-JSON's van schijf -- PlaylistManager is een Client Component en krijgt het als platte prop.
  const mixIndex = enriched
    ? getPlaylistMixIndex()
    : { byPlaylistId: {}, missingMixes: [], mixesWithId: null };
  // De brontelling + de sync-check horen alleen bij een weergave die álle kandidaten bevat. Dat is MMC:
  // daar wonen de mix-playlists. Op DJ Cylow/Privé zou je 0 gekoppelde playlists tegen 77 mixen afzetten
  // en altijd een kruis krijgen -- een verschil dat niets zegt.
  const mixesWithId = world === "mmc" ? mixIndex.mixesWithId : null;

  return (
    <main className="wrap">
      <header className="masthead">
        <Link href="/spotify" className="world-back-link">
          ← Terug naar alle playlists
        </Link>
        <h1>
          <span aria-hidden="true">{meta.emoji}</span> {meta.label}
        </h1>
        <p className="lede">{meta.description}</p>
        {/* Geen aparte teller hier: PlaylistManager's eigen stats-rij (het playlists-totaal) toont op deze
            al wereld-gefilterde subset exact hetzelfde aantal -- twee tellers voor dezelfde vraag
            zou redundant zijn. */}
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
      ) : (
        <>
          {renderExtra?.(playlists)}
          {playlists.length === 0 ? (
            <section className="layer">
              <p className="empty-note">
                Nog geen playlists in deze wereld -- ze staan er misschien ergens anders in
                (gecorrigeerd via het wereld-dropdownje op elke rij), of de auto-classificatie
                heeft hier nog niets in geraden.
              </p>
            </section>
          ) : (
            <PlaylistManager
              playlists={playlists}
              mixInfoById={mixIndex.byPlaylistId}
              mixesWithId={mixesWithId}
              missingMixes={world === "mmc" ? mixIndex.missingMixes : []}
              hiddenColumns={hiddenColumns}
            />
          )}
        </>
      )}
    </main>
  );
}
