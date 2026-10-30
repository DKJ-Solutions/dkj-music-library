// De verbinding met Spotify als eigen pagina (stond eerder onder de cards op /spotify, dat nu alleen
// het grid met de card per pagina is). Server Component: leest de tokens (OAuth-status) en de
// verrijkte playlists (fase 4) -- fs-werk dat hier moet blijven (Node's `fs`, niet beschikbaar in
// 'use client'). Twee kaarten (Dave, #122): de eerste regelt het inloggen, de tweede de sync
// (SyncButton.tsx). De OAuth-callback en het loskoppelen komen hier terug (api/auth/callback/spotify,
// api/auth/logout/spotify).
import { headers } from "next/headers";
import { readTokens } from "@/lib/spotify/tokenStore";
import { getEnrichedSnapshot } from "@/lib/spotify/enrichedPlaylists";
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

  // Twee kaarten en verder niets (Dave, #122): alles over inloggen -- de status, de knop, de host-melding en
  // een login-fout -- staat in de eerste, alles over de sync in de tweede.
  return (
    <main className="wrap">
      <h1>{pageTitle("/spotify/verbinding")}</h1>

      <div className="grid-2 verbinding-grid">
        <section className="card">
          <div className="card__head verbinding-head">
            <div>
              <h3 className="card__title">Login</h3>
              <p className="badge-row">
                <span className={`badge badge--sm ${tokens ? "badge--good" : "badge--bad"}`} aria-hidden="true">
                  {tokens ? "✓" : "!"}
                </span>
                {tokens
                  ? `Verbonden. Toegangstoken verloopt ${new Date(tokens.expiresAt).toLocaleString("nl-NL")}.`
                  : "Niet verbonden. Log in om je playlists op te halen."}
              </p>
            </div>
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
          </div>

          {errorMessage && <p className="msg msg--warn verbinding-result">{errorMessage}</p>}
          {params.connected && !params.error && (
            <p className="msg pos verbinding-result">Zojuist verbonden met Spotify.</p>
          )}
          {/* De login-route zet de host zelf recht, dus inloggen werkt hier gewoon; alleen het adres in de balk
              verandert onderweg, en dat wil je één keer uitgelegd krijgen. */}
          {hostMismatch && !tokens && (
            <p className="msg muted verbinding-result">
              Spotify werkt niet via {hostMismatch.browserHost}. Bij het inloggen ga je daarom vanzelf naar{" "}
              {hostMismatch.redirectHost}. <a href={hostMismatch.correctUrl}>Nu al overstappen</a>
            </p>
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
      </div>
    </main>
  );
}
