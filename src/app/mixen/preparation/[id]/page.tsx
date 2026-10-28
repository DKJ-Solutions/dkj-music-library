// De pagina van één werkbak op /mixen/preparation/<playlist-id>: wat de naam van de playlist zegt op één rij,
// de link naar de playlist op Spotify ernaast, en daaronder de tracks die er al in staan. De card ernaartoe
// staat op /mixen/preparation.
import { notFound } from "next/navigation";
import { playlistUrl } from "@/lib/library/playlistLink";
import { isPreparationPlaylist } from "@/lib/mixes/preparation";
import { parsePlaylistName } from "@/lib/spotify/parsePlaylistName";
import { readSnapshot } from "@/lib/spotify/snapshotStore";

// Leest de Spotify-snapshot van schijf -- zelfde reden als /mixen/preparation.
export const dynamic = "force-dynamic";

export default async function PreparationPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const playlist = readSnapshot()?.playlists.find((p) => p.id === id && isPreparationPlaylist(p.name));
  if (!playlist) notFound();

  const parsed = parsePlaylistName(playlist.name);
  const tracks = playlist.tracks.flatMap((item) => (item.track ? [item.track] : []));
  const facts: [string, string | null][] = [
    ["Type", parsed.typeLabel],
    ["Kleur", parsed.color],
    ["Power", parsed.density],
    ["Frequency", parsed.gender],
    ["Tracks", String(playlist.trackCount)],
  ];

  return (
    <main className="wrap">
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

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">Tracks</h2>
          <p className="card__sub">{tracks.length} tracks</p>
        </div>
        {tracks.length > 0 ? (
          <ol>
            {tracks.map((track, i) => (
              <li key={i}>
                {track.artists.map((artist) => artist.name).join(", ")} -- {track.name}
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-note">Deze werkbak is nog leeg.</p>
        )}
      </section>
    </main>
  );
}
