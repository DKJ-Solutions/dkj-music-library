// De detailpagina van één mix op /mixen/published/<slug>: de gegevens uit de mix-JSON (top-artiesten inbegrepen)
// op één rij, de link naar de mixpagina op djcylow.com rechts naast de h1, en daaronder de tracks van de mix in de tabel van
// /spotify/trackregister (TrackRegister `compact`, zoals de werkbak-pagina's op /mixen/preparation/<id>).
import { notFound } from "next/navigation";
import { TrackRegister } from "@/components/spotify/TrackRegister";
import { mixUrl } from "@/lib/library/djcylowMix";
import { readRegister } from "@/lib/library/readRegister";
import { findMixBySlug } from "@/lib/mixes/mixPages";

// Leest de mix-JSON's en de bibliotheek van schijf, en die wijzigen buiten de build -- zelfde reden als
// /mixen/published.
export const dynamic = "force-dynamic";

export default async function MixDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mix = findMixBySlug(slug);
  if (!mix) notFound();

  // Het register kent per track de mixen waarin hij zit (djcylow_mix), dus dit zijn precies de tracks van
  // deze mix zoals de bibliotheek ze kent.
  const register = readRegister((row) => row.mixes.some((m) => m.slug === slug));

  const facts: [string, string | null][] = [
    ["Genre", mix.genre],
    ["Subgenre", mix.subgenre],
    ["BPM", mix.bpm ? String(mix.bpm) : null],
    ["Kleur", mix.color],
    ["Power", mix.density],
    ["Frequency", mix.gender],
    ["Volume", mix.volume !== null ? `Vol. ${mix.volume}` : null],
    ["Datum", mix.date],
    ["Top-artiesten", mix.topArtists.length > 0 ? mix.topArtists.join(", ") : null],
  ];

  return (
    <main className="wrap wrap--full">
      <header className="masthead masthead--action">
        <p className="kicker">dkj-music-library · Mixen</p>
        <h1>{mix.title}</h1>
        <a className="btn btn--primary" href={mixUrl(slug)} target="_blank" rel="noreferrer">
          Beluister op djcylow.com
        </a>
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
          <p className="empty-note">Geen tracks van deze mix in de bibliotheek.</p>
        </section>
      ) : (
        <TrackRegister rows={register.rows} artistCount={register.artistCount} compact />
      )}
    </main>
  );
}
