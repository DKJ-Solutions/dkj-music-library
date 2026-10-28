// De pagina van één werkbak op /mixen/preparation/<playlist-id>: wat de naam van de playlist zegt op één rij,
// de link naar de playlist op Spotify ernaast, en daaronder de tabel van /spotify/trackregister met alleen de
// tracks die in de playlist staan. De card ernaartoe staat op /mixen/preparation.
import { notFound } from "next/navigation";
import { TrackRegister } from "@/components/spotify/TrackRegister";
import { playlistUrl } from "@/lib/library/playlistLink";
import { readRegister } from "@/lib/library/readRegister";
import { isPreparationPlaylist } from "@/lib/mixes/preparation";
import { parsePlaylistName } from "@/lib/spotify/parsePlaylistName";
import { readSnapshot } from "@/lib/spotify/snapshotStore";

// Leest de Spotify-snapshot en de bibliotheek van schijf -- zelfde reden als /mixen/preparation.
export const dynamic = "force-dynamic";

export default async function PreparationPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const playlist = readSnapshot()?.playlists.find((p) => p.id === id && isPreparationPlaylist(p.name));
  if (!playlist) notFound();

  const parsed = parsePlaylistName(playlist.name);
  // Het register kent per track de playlists waarin hij staat (spotify_playlist), dus dit zijn precies de
  // tracks van deze werkbak zoals de bibliotheek ze kent.
  const register = readRegister((row) => row.playlists.some((p) => p.id === playlist.id));
  const facts: [string, string | null][] = [
    ["Type", parsed.typeLabel],
    ["Kleur", parsed.color],
    ["Power", parsed.density],
    ["Frequency", parsed.gender],
    ["Tracks", String(playlist.trackCount)],
  ];

  return (
    <main className="wrap wrap--full">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Mixen · Preparation</p>
        <h1>{playlist.name}</h1>
      </header>

      <section className="card">
        <dl className="facts facts--row">
          {facts
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        <p className="page-cta">
          <a className="btn btn--primary" href={playlistUrl(playlist.id)} target="_blank" rel="noreferrer">
            Open op Spotify
          </a>
        </p>
      </section>

      {"error" in register ? (
        <section className="layer">
          <p className="empty-note">
            De bibliotheek kon niet worden gelezen: {register.error}. Draai <code>npm run library:sync</code> en
            kijk in de serverconsole.
          </p>
        </section>
      ) : register.rows.length === 0 ? (
        <section className="layer">
          <p className="empty-note">Deze werkbak is nog leeg.</p>
        </section>
      ) : (
        <TrackRegister rows={register.rows} artistCount={register.artistCount} rememberPrefs={false} />
      )}
    </main>
  );
}
