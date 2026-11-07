// PC <-> Spotify op /compare/pc-spotify (#144): wat in de Spotify-playlists staat maar nog niet in de lokale
// muziekmap, de downloadlijst. De map komt uit data/local/local-music.json (localMusicConfig.ts), de
// koppeling loopt via een eigen koppeling of `dkj_file`, met voorstellen voor de rest (compareLocal.ts, #151). Zonder map blijft de lege melding staan. De card
// ernaartoe staat op de hub /compare, naast Playlists <-> Mixes.
import { pageTitle } from "@/lib/pages";
import { readLocalMusicConfig } from "@/lib/local/localMusicConfig";
import { scanMusicFolder } from "@/lib/local/scanMusicFolder";
import { compareLocal } from "@/lib/local/compareLocal";
import { readRegister } from "@/lib/library/readRegister";
import { PcSpotifyLinks } from "@/components/local/PcSpotifyLinks";

// Leest de schijf en de bibliotheek, die buiten de build veranderen.
export const dynamic = "force-dynamic";

function Masthead() {
  return (
    <header className="masthead">
      <p className="kicker">dkj-music-library · Compare</p>
      <h1>{pageTitle("/compare/pc-spotify")}</h1>
    </header>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <main className="page-column">
      <Masthead />
      <section className="layer">
        <p className="empty-note">{children}</p>
      </section>
    </main>
  );
}

export default function ComparePcSpotifyPage() {
  const { musicFolder } = readLocalMusicConfig();
  if (!musicFolder) return <Note>Nog geen pc-map gekoppeld.</Note>;

  const scan = scanMusicFolder(musicFolder);
  if ("error" in scan) return <Note>{scan.error}</Note>;

  const register = readRegister();
  if ("error" in register) return <Note>De bibliotheek is niet te lezen: {register.error}</Note>;

  const result = compareLocal(register.rows, scan.files);

  return (
    <main className="page-column">
      <Masthead />

      <div className="tiles">
        <div className="tile">
          <div className="label">Te downloaden</div>
          <div className="v">{result.toDownloadCount}</div>
        </div>
        <div className="tile">
          <div className="label">Gekoppeld</div>
          <div className="v">{result.matchedCount}</div>
        </div>
        <div className="tile">
          <div className="label">Voorstellen</div>
          <div className="v">{result.suggestions.length}</div>
        </div>
        <div className="tile">
          <div className="label">Alleen lokaal</div>
          <div className="v">{result.localOnly.length}</div>
        </div>
        <div className="tile">
          <div className="label">Zonder bestandsnaam</div>
          <div className="v">{result.withoutFileName}</div>
        </div>
      </div>

      <div className="grid-3">
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Te downloaden</h2>
          </div>
          {result.toDownload.length === 0 ? (
            <p className="empty-note">Alles uit de playlists staat in de map.</p>
          ) : (
            <div className="pc-list">
              {result.toDownload.map((playlist) => (
                <details key={playlist.id} className="pc-playlist">
                  <summary>
                    {playlist.name} <span className="pc-count">{playlist.files.length}</span>
                  </summary>
                  <ul>
                    {playlist.files.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Voorstellen</h2>
          </div>
          <PcSpotifyLinks
            suggestions={result.suggestions}
            ownLinks={result.ownLinks}
            unlinked={result.unlinked}
            filePaths={[...result.localOnly, ...result.suggestions.map((s) => s.suggestion)].map((f) => f.relativePath).sort((a, b) => a.localeCompare(b))}
          />
        </section>

        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Alleen lokaal</h2>
          </div>
          {result.localOnly.length === 0 ? (
            <p className="empty-note">Elk bestand hoort bij een track.</p>
          ) : (
            <ul className="pc-list">
              {result.localOnly.map((file) => (
                <li key={file.relativePath} title={file.relativePath}>
                  {file.relativePath}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
