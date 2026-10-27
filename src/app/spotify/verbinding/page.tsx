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

  return (
    <main className="wrap">
      <header className="masthead">
        <h1>{pageTitle("/spotify/verbinding")}</h1>
        <p className="lede">
          De koppeling met je Spotify-account en de sync van de back-up. Er wordt niets naar Spotify
          teruggeschreven.
        </p>
      </header>

      <section className="layer">
        {/* Geen waarschuwing meer maar een aankondiging: de login-route zet de host zelf recht, dus de
            login werkt hier gewoon. Wat wél verandert is het adres in de balk -- en dat is precies het
            soort verrassing dat je één keer wil hebben uitgelegd in plaats van elke keer wil ontdekken. */}
        {hostMismatch && (
          <p className="host-mismatch-warning" data-tone="info">
            <strong>Je wordt bij het inloggen verplaatst naar {hostMismatch.redirectHost}.</strong> Je
            hebt de app geopend op <code>{hostMismatch.browserHost}</code>, terwijl de OAuth-callback
            binnenkomt op <code>{hostMismatch.redirectHost}</code> — Spotify staat{" "}
            <code>localhost</code> niet meer toe als redirect-URI, dus die host staat vast. Voor een
            browser zijn dat verschillende hosts, en een state-cookie op de ene gaat niet mee naar de
            andere. De login-route zet dat zelf recht met een extra hop, dus inloggen werkt hier;
            daarna staat de app op{" "}
            <a href={hostMismatch.correctUrl}>{hostMismatch.correctUrl}</a>. Wil je die sprong
            overslaan, open de app dan meteen op dat adres.
          </p>
        )}

        {errorMessage && <p className="empty-note" style={{ color: "var(--status-critical)" }}>{errorMessage}</p>}
        {params.connected && !params.error && (
          <p className="empty-note" style={{ color: "var(--status-done)" }}>Zojuist verbonden met Spotify.</p>
        )}

        {tokens ? (
          <>
            <p className="empty-note">
              Status: <strong style={{ color: "var(--fg-1)" }}>verbonden</strong>. Toegangstoken verloopt:{" "}
              {new Date(tokens.expiresAt).toLocaleString("nl-NL")}. Scope: {tokens.scope}
            </p>
            <form action="/api/auth/logout/spotify" method="POST">
              <button type="submit" className="pill-toggle" data-active="true">
                Loskoppelen
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="empty-note">
              Status: <strong style={{ color: "var(--fg-1)" }}>niet verbonden</strong>.
            </p>
            <a className="pill-toggle" href="/api/auth/login/spotify">
              Inloggen bij Spotify
            </a>
          </>
        )}

        <p className="empty-note" style={{ marginTop: "10px" }}>
          {enriched
            ? `Laatste snapshot: ${enriched.playlists.length} playlist(s), ${enriched.playlists.reduce((sum, p) => sum + p.trackCount, 0)} track(s), gesynchroniseerd op ${new Date(enriched.syncedAt).toLocaleString("nl-NL")}.`
            : "Nog geen snapshot -- start hieronder de eerste sync."}
        </p>

        <SyncButton />
      </section>

      {enriched && (
        <section className="layer">
          <div className="band">
            <span className="eyebrow">Werelden</span>
            <span className="rule"></span>
          </div>
          <p className="section-lede">
            Dave&apos;s top-niveau Spotify-folders, nagebootst uit de playlistnamen (de Web API geeft
            zijn eigen folder-indeling niet terug) -- elke playlist valt precies in één wereld en
            is in de playlist manager per rij corrigeerbaar.
          </p>
          <p className="empty-note" style={{ marginTop: "10px" }}>
            Samen {worldCounts.mmc + worldCounts.djcylow + worldCounts.prive} van de{" "}
            {enriched.playlists.length} playlists -- niets valt buiten een wereld.
          </p>
        </section>
      )}
    </main>
  );
}
