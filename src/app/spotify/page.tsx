// Fase 5: de flexibele filter/groepeer/zoek-interface op /spotify. Server Component: leest de
// tokens (OAuth-status) en de verrijkte playlists (fase 4) -- stuk fs-werk dat hier moet blijven
// (Node's `fs`, niet beschikbaar in 'use client'). De verbindingsstatus + login/logout + de
// sync-trigger (fase 2/3, SyncButton.tsx) blijven bovenaan staan: die horen nog steeds bij deze
// pagina. Daaronder de nieuwe interactieve laag (PlaylistManager, 'use client') die client-side
// filtert/groepeert/zoekt over de al-geladen data.
//
// Bewust ÉÉN lees van de (grote) snapshot: readSnapshot() hieronder, die getEnrichedSnapshot()
// aangereikt krijgt (zelfde recept als /spotify/dashboard). De sync-samenvatting komt uit de
// verrijkte data (playlist-/trackcount); het aantal artiesten uit de ruwe, want EnrichedPlaylist
// draagt geen tracks (zie enrichedPlaylists.ts).
import Link from "next/link";
import { headers } from "next/headers";
import { readTokens } from "@/lib/spotify/tokenStore";
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { getEnrichedSnapshot } from "@/lib/spotify/enrichedPlaylists";
import { countDistinctArtists } from "@/lib/spotify/dashboardStats";
import { countByWorld } from "@/lib/spotify/playlistFilters";
import { SPOTIFY_WORLDS, WORLD_META } from "@/lib/spotify/classifyWorld";
import { getSpotifyRedirectUri } from "@/lib/spotify/config";
import { findRedirectHostMismatch } from "@/lib/spotify/redirectHost";
import { getPlaylistMixIndex } from "@/lib/mixes/playlistMixInfo";
import { PlaylistManager } from "@/components/spotify/PlaylistManager";
import SyncButton from "./SyncButton";

export const dynamic = "force-dynamic";

interface SpotifyStatusPageProps {
  searchParams: Promise<{ connected?: string; error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "De login-poging kon niet worden geverifieerd (state komt niet overeen). Probeer opnieuw.",
  token_exchange_failed: "Het inwisselen van de code voor tokens is mislukt. Zie de serverconsole (het venster waarin `npm run dev` draait) voor details.",
};

export default async function SpotifyStatusPage({ searchParams }: SpotifyStatusPageProps) {
  const params = await searchParams;
  // De host-val: geopend op `localhost` terwijl de callback op `127.0.0.1` binnenkomt, waardoor de
  // state-cookie niet meegaat en de login faalt op "state komt niet overeen" (zie redirectHost.ts).
  // Server-side te bepalen -- de `Host`-header van dít request ís de host waarop de browser staat.
  const hostMismatch = findRedirectHostMismatch(
    (await headers()).get("host"),
    getSpotifyRedirectUri(),
    "/spotify"
  );
  const tokens = readTokens();
  const snapshot = readSnapshot();
  const enriched = getEnrichedSnapshot(snapshot);
  const artistCount = snapshot ? countDistinctArtists(snapshot) : null;
  const worldCounts = enriched ? countByWorld(enriched.playlists) : { mmc: 0, djcylow: 0, prive: 0 };
  // Zie WorldPage.tsx: de mix-kant van de tabel is een server-side fs-read, doorgegeven als prop.
  const mixIndex = enriched
    ? getPlaylistMixIndex()
    : { byPlaylistId: {}, missingMixes: [], mixesWithId: null };
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
        <p className="kicker">dkj-music-library · Spotify</p>
        <h1>Playlist manager</h1>
        <p className="lede">
          Read-only back-up van je Spotify-playlists, met filteren, groeperen en cross-playlist
          zoeken. Er wordt niets naar Spotify teruggeschreven.
        </p>
        {/* Buiten de snapshot-secties: het register leest de bibliotheek uit git, dus deze link hoort ook
            zichtbaar te zijn op een machine die nog nooit gesynct heeft. */}
        <p className="dashboard-link-row">
          <Link href="/spotify/trackregister" className="accent-text">
            🗂️ Bekijk het DKJ Trackregister (elke track met zijn eigen velden) →
          </Link>
        </p>
        <p className="dashboard-link-row">
          <Link href="/spotify/maple-classic" className="accent-text">
            🍁 Bekijk de playlist Maple Classic 2026 LAN als tabel →
          </Link>
        </p>
        <p className="dashboard-link-row">
          <Link href="/spotify/classic-pop" className="accent-text">
            🎙️ Bekijk alle nummers uit de Classic Pop-playlists in één tabel →
          </Link>
        </p>
      </header>

      <section className="layer">
        <div className="band">
          <span className="eyebrow">Verbinding</span>
          <span className="rule"></span>
        </div>

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
              Status: <strong style={{ color: "var(--ink)" }}>verbonden</strong>. Toegangstoken verloopt:{" "}
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
              Status: <strong style={{ color: "var(--ink)" }}>niet verbonden</strong>.
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
            is per rij corrigeerbaar.
          </p>
          <div className="world-grid">
            {SPOTIFY_WORLDS.map((world) => {
              const meta = WORLD_META[world];
              return (
                <Link key={world} href={meta.href} className="world-tile">
                  <span className="emoji" aria-hidden="true">
                    {meta.emoji}
                  </span>
                  <span className="label">{meta.label}</span>
                  <span className="count">{worldCounts[world]}</span>
                </Link>
              );
            })}
          </div>
          <p className="empty-note" style={{ marginTop: "10px" }}>
            Samen {worldCounts.mmc + worldCounts.djcylow + worldCounts.prive} van de{" "}
            {enriched.playlists.length} playlists -- niets valt buiten een wereld.
          </p>
          <p className="dashboard-link-row">
            <Link href="/spotify/dashboard" className="accent-text">
              📊 Bekijk het data-dashboard (dedup, top-artiesten, verdelingen) →
            </Link>
          </p>
        </section>
      )}

      {enriched ? (
        <PlaylistManager
          playlists={enriched.playlists}
          artistCount={artistCount}
          mixInfoById={mixIndex.byPlaylistId}
          mixesWithId={mixIndex.mixesWithId}
          missingMixes={mixIndex.missingMixes}
        />
      ) : (
        <section className="layer">
          <div className="band">
            <span className="eyebrow">Playlists</span>
            <span className="rule"></span>
          </div>
          <p className="empty-note">
            Nog geen playlists om te tonen -- start hierboven de eerste sync.
          </p>
        </section>
      )}
    </main>
  );
}
