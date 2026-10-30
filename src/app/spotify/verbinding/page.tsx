// De verbinding met Spotify als eigen pagina (stond eerder onder de cards op /spotify, dat nu alleen
// het grid met de card per pagina is). Server Component: leest de tokens (OAuth-status) en de
// verrijkte playlists (fase 4) -- fs-werk dat hier moet blijven (Node's `fs`, niet beschikbaar in
// 'use client'). De verbindingsstatus + login/logout + de sync-trigger (fase 2/3, SyncButton.tsx), en
// daaronder de dekking van de werelden over de laatste snapshot. De OAuth-callback en het loskoppelen
// komen hier terug (api/auth/callback/spotify, api/auth/logout/spotify).
import { headers } from "next/headers";
import { readTokens } from "@/lib/spotify/tokenStore";
import { getEnrichedSnapshot } from "@/lib/spotify/enrichedPlaylists";
import { countByWorld } from "@/lib/spotify/playlistFilters";
import { getSpotifyRedirectUri } from "@/lib/spotify/config";
import { findRedirectHostMismatch } from "@/lib/spotify/redirectHost";
import { pageTitle } from "@/lib/pages";
import SyncButton from "./SyncButton";

export const dynamic = "force-dynamic";

interface ConnectionPageProps {
  searchParams: Promise<{ connected?: string; error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "De login-poging kon niet worden geverifieerd (state komt niet overeen). Probeer opnieuw.",
  token_exchange_failed: "Het inwisselen van de code voor tokens is mislukt. Zie de serverconsole (het venster waarin `npm run dev` draait) voor details.",
};

export default async function ConnectionPage({ searchParams }: ConnectionPageProps) {
  const params = await searchParams;
  // De host-val: geopend op `localhost` terwijl de callback op `127.0.0.1` binnenkomt, waardoor de
  // state-cookie niet meegaat en de login faalt op "state komt niet overeen" (zie redirectHost.ts).
  // Server-side te bepalen -- de `Host`-header van dít request ís de host waarop de browser staat.
  const hostMismatch = findRedirectHostMismatch(
    (await headers()).get("host"),
    getSpotifyRedirectUri(),
    "/spotify/verbinding"
  );
  const tokens = readTokens();
  const enriched = getEnrichedSnapshot();
  const worldCounts = enriched ? countByWorld(enriched.playlists) : { mmc: 0, djcylow: 0, prive: 0 };
  // Sinds de login-route zichzelf op de juiste host zet (api/auth/login/spotify) hóórt een
  // state_mismatch hier niet meer door het adres te komen. Komt hij tóch voor terwijl de hosts
  // uiteenlopen, dan is dat waardevolle informatie -- dan heeft de hop niet gedaan wat hij moest doen --
  // dus blijft de melding die oorzaak noemen, nu als "onverwacht" in plaats van als instructie.
  const errorMessage = params.error
    ? params.error === "state_mismatch" && hostMismatch
      ? `De login-poging kon niet worden geverifieerd (state komt niet overeen), terwijl je de app op ${hostMismatch.browserHost} hebt geopend en de callback op ${hostMismatch.redirectHost} binnenkomt. Dat zou de login-route zelf moeten hebben rechtgezet, dus dit is onverwacht. Open de app op ${hostMismatch.correctUrl} en probeer het daar.`
      : (ERROR_MESSAGES[params.error] ?? `Onbekende fout: ${params.error}`)
    : null;

  const totalTracks = enriched ? enriched.playlists.reduce((sum, p) => sum + p.trackCount, 0) : 0;
  const worlds: [string, number][] = [
    ["MMC", worldCounts.mmc],
    ["DJ Cylow", worldCounts.djcylow],
    ["Privé", worldCounts.prive],
  ];

  // In de huisstijl (#122): de h1 met de ene actie die er nu toe doet ernaast -- inloggen zolang er geen
  // verbinding is, anders loskoppelen als stille secundaire knop -- en daaronder de verbinding en de
  // back-up naast elkaar, zodat de pagina in één scherm past.
  return (
    <main className="wrap">
      <header className="masthead masthead--action">
        <h1>{pageTitle("/spotify/verbinding")}</h1>
        {tokens ? (
          <form action="/api/auth/logout/spotify" method="POST">
            <button type="submit" className="btn">
              Loskoppelen
            </button>
          </form>
        ) : (
          <a className="btn btn--primary" href="/api/auth/login/spotify">
            Inloggen bij Spotify
          </a>
        )}
      </header>

      {/* Geen waarschuwing maar een aankondiging: de login-route zet de host zelf recht, dus inloggen werkt
          hier gewoon. Wat wél verandert is het adres in de balk, en dat wil je één keer uitgelegd krijgen. */}
      {hostMismatch && (
        <p className="notice">
          Spotify werkt niet via {hostMismatch.browserHost}. Bij het inloggen ga je daarom vanzelf naar{" "}
          {hostMismatch.redirectHost}. <a href={hostMismatch.correctUrl}>Nu al overstappen</a>
        </p>
      )}
      {errorMessage && <p className="msg msg--warn">{errorMessage}</p>}
      {params.connected && !params.error && <p className="msg pos">Zojuist verbonden met Spotify.</p>}

      <div className="grid-2 verbinding-grid">
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">
              <span className={`badge ${tokens ? "badge--good" : "badge--bad"}`} aria-hidden="true">
                {tokens ? "✓" : "!"}
              </span>
              {tokens ? "Verbonden" : "Niet verbonden"}
            </h2>
            <p className="card__sub">
              {tokens
                ? "Leest je playlists; schrijft alleen de naam en beschrijving van een playlist terug."
                : "Log in om de playlists op te halen."}
            </p>
          </div>
          {tokens && (
            <dl className="facts">
              <div>
                <dt>Toegangstoken verloopt</dt>
                <dd>{new Date(tokens.expiresAt).toLocaleString("nl-NL")}</dd>
              </div>
            </dl>
          )}
        </section>

        <SyncButton
          card={{
            connected: !!tokens,
            snapshot: enriched
              ? { playlistCount: enriched.playlists.length, trackCount: totalTracks, syncedAt: enriched.syncedAt }
              : null,
          }}
        />

        {enriched && (
          <section className="card grid__full">
            <div className="card__head">
              <h2 className="card__title">Werelden</h2>
              <p className="card__sub">
                Je top-niveau Spotify-folders, afgeleid uit de playlistnamen. Per playlist te corrigeren in de
                playlist manager.
              </p>
            </div>
            <dl className="facts facts--row">
              {worlds.map(([label, count]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{count} playlists</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}
