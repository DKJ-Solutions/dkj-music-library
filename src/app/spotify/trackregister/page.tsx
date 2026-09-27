// /spotify/trackregister -- het Trackregister: elke track met zijn eigen velden (fields.ts), te
// doorzoeken en te filteren op dkj_bpm en dkj_album. Leest de bibliotheek, niet de Spotify-snapshot:
// die bouwt zich op een verse kloon zelf op uit de export in git (libraryFile.ts), dus deze pagina
// werkt op elke machine met de repo, ook zonder Spotify-login of sync. Dun schilletje, zelfde recept
// als de andere spotify-routes: de rijen komen uit register.ts, de weergave uit TrackRegister.tsx.
import Link from "next/link";
import { openLibrary } from "@/lib/library/libraryFile";
import { readArtistNames } from "@/lib/library/artistIds";
import { listTracks } from "@/lib/library/trackStore";
import { toRegisterRow, type RegisterRow } from "@/lib/library/register";
import { TrackRegister } from "@/components/spotify/TrackRegister";

// De bibliotheek kan buiten de build wijzigen (een sync, een import), dus geen static prerender.
export const dynamic = "force-dynamic";

function readRegister(): { rows: RegisterRow[]; artistCount: number } | { error: string } {
  try {
    const { db } = openLibrary();
    try {
      const artistNames = readArtistNames(db);
      const rows = listTracks(db).map((track) => toRegisterRow(track, artistNames));
      return { rows, artistCount: Object.keys(artistNames).length };
    } finally {
      db.close();
    }
  } catch (err) {
    console.error("[spotify/trackregister] bibliotheek lezen mislukt:", err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export default function TrackRegisterPage() {
  const register = readRegister();

  return (
    <main className="wrap wrap--full">
      <header className="masthead">
        <Link href="/spotify" className="world-back-link">
          ← Terug naar alle playlists
        </Link>
        <p className="kicker">dkj-music-library · Bibliotheek</p>
        <h1>DKJ Trackregister</h1>
        <p className="lede">
          Elk nummer uit je playlists met je eigen velden: <code>dkj_track_id</code>, <code>dkj_artist</code> (de
          eerste artiest), <code>dkj_albumartiest</code> (alle artiesten in Spotify-volgorde),{" "}
          <code>dkj_artist_ids</code>, <code>dkj_bpm</code>, <code>dkj_album</code>, <code>dkj_file</code> (de
          bestandsnaam zoals op de desktop) en <code>spotify_playlist</code> (klik op een playlist om hem op Spotify te
          openen). De data komt uit{" "}
          <code>data/library/export/</code>, dus elke kloon van de repo toont hetzelfde register.
        </p>
      </header>

      {"error" in register ? (
        <section className="layer">
          <p className="empty-note">
            De bibliotheek kon niet worden gelezen: {register.error}. Draai <code>npm run library:sync</code> en
            kijk in de serverconsole.
          </p>
        </section>
      ) : register.rows.length === 0 ? (
        <section className="layer">
          <p className="empty-note">
            Nog geen tracks in de bibliotheek -- start een sync op{" "}
            <Link href="/spotify" className="accent-text">
              /spotify
            </Link>
            .
          </p>
        </section>
      ) : (
        <TrackRegister rows={register.rows} artistCount={register.artistCount} />
      )}
    </main>
  );
}
