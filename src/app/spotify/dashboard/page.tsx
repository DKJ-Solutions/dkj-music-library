// Fase 6: /spotify/dashboard -- het data-dashboard (dedup, top-artiesten, verdelingen). Leest,
// naast de al-verrijkte snapshot (fase 4, enrichedPlaylists.ts -- gebruikt voor de verdelingen),
// ook de RUWE snapshot rechtstreeks via snapshotStore.ts (nodig voor dedup/top-artiesten, die
// echte trackdata willen -- zie de docstring bovenaan dashboardStats.ts voor waarom
// EnrichedPlaylist die bewust weglaat). Dun schilletje, zelfde recept als de andere spotify-routes:
// alle berekening zit in dashboardStats.ts, alle weergave in DashboardOverview.tsx.
import Link from "next/link";
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { getEnrichedSnapshot } from "@/lib/spotify/enrichedPlaylists";
import {
  computeDedupSummary,
  computeTopArtists,
  countDistinctArtists,
  sumTracksByColor,
  sumTracksByMmcBpm,
  sumTracksByWorld,
  topDuplicateArtists,
} from "@/lib/spotify/dashboardStats";
import { DashboardOverview } from "@/components/spotify/DashboardOverview";

// Zelfde reden als /spotify/page.tsx en de wereld-sub-routes: leest een fs-snapshot die buiten de
// build kan wijzigen (een nieuwe sync via SyncButton), dus geen static prerender.
export const dynamic = "force-dynamic";

export default function SpotifyDashboardPage() {
  // Eén lees van de snapshot van schijf -- getEnrichedSnapshot() krijgt 'm hieronder aangereikt
  // (optionele parameter) i.p.v. zelf nogmaals readSnapshot() te doen, zelfde "lees 'm één
  // keer"-conventie als /spotify/page.tsx.
  const snapshot = readSnapshot();
  const enriched = getEnrichedSnapshot(snapshot);

  // Eén doorloop van elke aggregatie -- computeDedupSummary() itereert de hele snapshot, dus niet
  // twee keer aanroepen alleen om ook de duplicate-artist-samenvatting te voeden.
  const dedup = snapshot ? computeDedupSummary(snapshot) : null;

  return (
    <main className="wrap">
      <header className="masthead">
        <Link href="/spotify" className="world-back-link">
          ← Terug naar alle playlists
        </Link>
        <p className="kicker">dkj-music-library · Spotify</p>
        <h1>Data-dashboard</h1>
        <p className="lede">
          Dedup, top-artiesten en verdelingen over je hele bibliotheek -- afgeleid uit dezelfde
          read-only snapshot als de playlist manager. Er wordt niets naar Spotify teruggeschreven.
        </p>
      </header>

      {!snapshot || !enriched || !dedup ? (
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
        <DashboardOverview
          dedup={dedup}
          duplicateArtists={topDuplicateArtists(dedup.allDuplicates)}
          topArtists={computeTopArtists(snapshot)}
          distinctArtists={countDistinctArtists(snapshot)}
          worldTracks={sumTracksByWorld(enriched.playlists)}
          bpmTracks={sumTracksByMmcBpm(enriched.playlists)}
          colorDistribution={sumTracksByColor(enriched.playlists)}
          totalTracks={enriched.playlists.reduce((sum, p) => sum + p.trackCount, 0)}
        />
      )}
    </main>
  );
}
