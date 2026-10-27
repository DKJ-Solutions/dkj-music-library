// De detailpagina van één mix op /mixen/published/<slug>: de gegevens uit de mix-JSON op één rij, de link naar de
// mixpagina op djcylow.com ernaast, en daaronder de top-artiesten en de tracklist naast elkaar.
import { notFound } from "next/navigation";
import { mixUrl } from "@/lib/library/djcylowMix";
import { findMixBySlug } from "@/lib/mixes/mixPages";

// Leest de mix-JSON's van schijf, en die wijzigen buiten de build -- zelfde reden als /mixen/published.
export const dynamic = "force-dynamic";

export default async function MixDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mix = findMixBySlug(slug);
  if (!mix) notFound();

  const facts: [string, string | null][] = [
    ["Genre", mix.genre],
    ["Subgenre", mix.subgenre],
    ["BPM", mix.bpm ? String(mix.bpm) : null],
    ["Kleur", mix.color],
    ["Power", mix.density],
    ["Frequency", mix.gender],
    ["Volume", mix.volume !== null ? `Vol. ${mix.volume}` : null],
    ["Datum", mix.date],
  ];

  return (
    <main className="wrap">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Mixen</p>
        <h1>{mix.title}</h1>
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
          <a className="btn btn--primary" href={mixUrl(slug)} target="_blank" rel="noreferrer">
            Beluister op djcylow.com
          </a>
        </p>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Top-artiesten</h2>
          </div>
          {mix.topArtists.length > 0 ? (
            <ul>
              {mix.topArtists.map((artist) => (
                <li key={artist}>{artist}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-note">Geen top-artiesten in de mix-data.</p>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Tracklist</h2>
            <p className="card__sub">{mix.tracks.length} tracks</p>
          </div>
          {mix.tracks.length > 0 ? (
            <ol>
              {mix.tracks.map((track, i) => (
                <li key={i}>{track}</li>
              ))}
            </ol>
          ) : (
            <p className="empty-note">Geen tracklist in de mix-data.</p>
          )}
        </section>
      </div>
    </main>
  );
}
