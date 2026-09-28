// /spotify/classic-pop -- één tabel met elk nummer uit de playlists met "Classic Pop" in de naam (de
// hoofdplaylist en de kleur-playlists van Music Mood Colours), elk nummer één keer, met de playlists waarin
// het staat. Leest de Spotify-snapshot, zoals /spotify/maple-classic; de rijen komen uit
// playlistTableRows.ts, de weergave uit ClassicPopTable.tsx.
import Link from "next/link";
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { foundReleaseYears, readReleaseYearCache } from "@/lib/musicbrainz/cacheStore";
import { readLibraryYears, toClassicPopRows } from "@/lib/spotify/playlistTableRows";
import { isClassicPopPlaylist } from "@/lib/spotify/classicPopTable";
import { ClassicPopTable } from "@/components/spotify/ClassicPopTable";
import SyncButton from "../SyncButton";

// Zelfde reden als /spotify/page.tsx: leest een fs-snapshot die buiten de build kan wijzigen.
export const dynamic = "force-dynamic";

export default function ClassicPopPage() {
  const snapshot = readSnapshot();
  const playlistCount = snapshot ? snapshot.playlists.filter((p) => isClassicPopPlaylist(p.name)).length : 0;
  // readReleaseYearCache() valt bij een lees- of parseerfout al terug op een lege cache (zie cacheStore.ts).
  const rows =
    snapshot && playlistCount > 0
      ? toClassicPopRows(snapshot.playlists, readLibraryYears("spotify/classic-pop"), foundReleaseYears(readReleaseYearCache()))
      : null;

  return (
    <main className="wrap wrap--full">
      <header className="masthead">
        <Link href="/spotify" className="world-back-link">
          ← Terug naar alle playlists
        </Link>
        <p className="kicker">dkj-music-library · Overzicht</p>
        <h1>Classic Pop</h1>
        <p className="lede">
          Elk nummer uit een playlist met &ldquo;Classic Pop&rdquo; in de naam, één keer, met de playlists waarin
          het staat. Zoek op een playlistnaam (bijv. &ldquo;cyan&rdquo;) om één kleur te zien.
        </p>
        <p className="empty-note" style={{ marginTop: "10px" }}>
          {snapshot
            ? `Laatste snapshot: gesynchroniseerd op ${new Date(snapshot.syncedAt).toLocaleString("nl-NL")}.`
            : "Nog geen snapshot."}
        </p>
        <SyncButton />
      </header>

      {rows ? (
        <ClassicPopTable rows={rows} playlistCount={playlistCount} />
      ) : (
        <section className="layer">
          <p className="empty-note">
            {snapshot ? "Er staat geen Classic Pop-playlist in de snapshot" : "Nog geen snapshot"} -- start een sync op{" "}
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
