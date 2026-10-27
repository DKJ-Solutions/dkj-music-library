// De playlist manager als eigen pagina (stond eerder onderaan /spotify, dat nu de hub is met de
// verbinding, de sync en de card per pagina). Server Component: leest de verrijkte playlists (fase 4)
// en de mix-index van schijf en geeft ze als props door aan PlaylistManager ('use client'), die
// client-side filtert/groepeert/zoekt over de al-geladen data.
//
// Bewust ÉÉN lees van de (grote) snapshot: readSnapshot() hieronder, die getEnrichedSnapshot()
// aangereikt krijgt (zelfde recept als /spotify/dashboard). Het aantal artiesten komt uit de ruwe
// snapshot, want EnrichedPlaylist draagt geen tracks (zie enrichedPlaylists.ts).
import Link from "next/link";
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { getEnrichedSnapshot } from "@/lib/spotify/enrichedPlaylists";
import { countDistinctArtists } from "@/lib/spotify/dashboardStats";
import { getPlaylistMixIndex } from "@/lib/mixes/playlistMixInfo";
import { PlaylistManager } from "@/components/spotify/PlaylistManager";

export const dynamic = "force-dynamic";

export default function PlaylistManagerPage() {
  const snapshot = readSnapshot();
  const enriched = getEnrichedSnapshot(snapshot);
  const artistCount = snapshot ? countDistinctArtists(snapshot) : null;
  // Zie WorldPage.tsx: de mix-kant van de tabel is een server-side fs-read, doorgegeven als prop.
  const mixIndex = enriched
    ? getPlaylistMixIndex()
    : { byPlaylistId: {}, missingMixes: [], mixesWithId: null };

  return (
    <main className="wrap">
      <header className="masthead">
        <Link href="/spotify" className="world-back-link">
          ← Terug naar Spotify
        </Link>
        <h1>Playlist manager</h1>
        <p className="lede">
          Alle playlists uit de back-up, met filteren, groeperen en cross-playlist zoeken. Er wordt
          niets naar Spotify teruggeschreven.
        </p>
      </header>

      {enriched ? (
        <PlaylistManager
          playlists={enriched.playlists}
          artistCount={artistCount}
          mixInfoById={mixIndex.byPlaylistId}
          mixesWithId={mixIndex.mixesWithId}
          missingMixes={mixIndex.missingMixes}
        />
      ) : (
        <section className="layer">
          <p className="empty-note">
            Nog geen playlists om te tonen -- start eerst een sync op{" "}
            <Link href="/spotify" className="accent-text">
              /spotify
            </Link>
            .
          </p>
        </section>
      )}
    </main>
  );
}
