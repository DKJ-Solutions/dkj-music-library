// Het id_spotify-overzicht op de brug: elke playlist die exact zo heet als een mix in de bron, met de
// sleutel die zijn beschrijving krijgt (Dave, 2026-08-11). Server Component -- de berekening zit puur
// in mixes/spotifyIdSync.ts, hier alleen de presentatie, en de twee knoppen zijn de client-eilandjes.
//
// WAAROM DIT EEN EIGEN SECTIE IS EN GEEN KOLOM IN DE BRUG-TABEL: de brug koppelt op tracklist-inhoud en
// toont de mix als rij. Deze actie kiest strenger -- alleen de exacte naam-match -- en toont de PLAYLIST
// als rij, want dat is wat er gewijzigd wordt. Ze in elkaar schuiven zou twee verschillende selecties
// in één tabel zetten, en dan is per rij niet meer te zien welke van de twee je leest.
import {
  summarizeSpotifyIdPlan,
  type SpotifyIdPlan,
  type SpotifyIdRow,
} from "@/lib/mixes/spotifyIdSync";
import { SpotifyIdBulkButton, SpotifyIdWriteButton } from "./SpotifyIdWriteButton";

export function SpotifyIdSection({ plan }: { plan: SpotifyIdPlan }) {
  const summary = summarizeSpotifyIdPlan(plan);
  const teDoen = plan.rows
    .filter((r) => r.state === "to-write")
    .map((r) => ({ playlistId: r.playlistId, mixId: r.mixId }));

  return (
    <section className="layer">
      <div className="band">
        <span className="eyebrow">id_spotify in de beschrijving</span>
        <span className="mix-group-count">{summary.matched}</span>
        <span className="rule"></span>
      </div>
      <p className="section-lede">
        De mix-bron levert naast <code>id</code> ook <code>id_spotify</code> —{" "}
        <code>mmc_edm_128bpm_light_f_cyan_20251108</code>, dezelfde mix met de dimensies in de sleutel
        zelf. Die hoort achteraan de playlistbeschrijving te staan, op de plek waar tot nu toe het kale
        mix-ID stond. De acht cijfers zitten aan de staart, dus de koppeling verandert er niet door —
        alleen de vorm waarin ze op Spotify staat.
      </p>
      <p className="section-lede">
        Gekozen wordt op de <strong>exacte naam</strong>: alleen playlists die nu al precies zo heten als{" "}
        <code>title_spotify</code> in de bron. Geen tracklist-heuristiek en geen bestaande tag — een
        playlist die zo heet, ís die mix.
      </p>

      {summary.matched === 0 ? (
        <p className="empty-note">
          Geen enkele playlist heet precies zoals een <code>title_spotify</code> in de bron. Trek eerst
          de namen gelijk op de playlist-pagina; daarna staat hier vanzelf werk.
        </p>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <b>{summary.toWrite}</b>
              <span>te schrijven</span>
            </div>
            <div className="stat">
              <b>{summary.inSync}</b>
              <span>al goed</span>
            </div>
            {summary.blocked > 0 && (
              <div className="stat">
                <b>{summary.blocked}</b>
                <span>geblokkeerd</span>
              </div>
            )}
            {summary.ambiguous > 0 && (
              <div className="stat">
                <b>{summary.ambiguous}</b>
                <span>dubbelzinnig</span>
              </div>
            )}
            <div className="stat">
              <b>{summary.unmatched}</b>
              <span>zonder playlist</span>
            </div>
          </div>

          <SpotifyIdBulkButton teDoen={teDoen} blockedCount={summary.blocked} />

          <div className="mix-key-heads">
            <span>Playlist (= title_spotify)</span>
            <span>Mix</span>
            <span>Staat er nu</span>
            <span>Komt er te staan</span>
            <span></span>
          </div>

          {plan.rows.map((row) => (
            <SpotifyIdRowView key={row.playlistId} row={row} />
          ))}

          {plan.ambiguous.length > 0 && (
            <p className="empty-note" style={{ marginTop: "12px" }}>
              <strong>{plan.ambiguous.length}</strong> naam is dubbelzinnig en blijft hierbuiten: er
              hangen meerdere mixen of meerdere playlists aan. Welke bedoeld is, valt niet uit de data af
              te leiden, en een gok zou de beschrijving van de verkeerde overschrijven.{" "}
              {plan.ambiguous.map((a) => a.title).join(" · ")}
            </p>
          )}

          <p className="empty-note" style={{ marginTop: "8px" }}>
            <strong>{summary.unmatched}</strong> mixen met een <code>title_spotify</code> hebben geen
            playlist die zo heet. Dat is geen afwijking: niet elke mix heeft een eigen playlist. De
            tabellen hierboven laten zien welke dat zijn en waarom.
          </p>
        </>
      )}
    </section>
  );
}

function SpotifyIdRowView({ row }: { row: SpotifyIdRow }) {
  // Buiten de sleutel om afwijkende velden: die schrijft dezelfde actie mee (de route herschrijft het
  // hele blok), dus ze horen zichtbaar te zijn vóór er gedrukt wordt -- anders verandert er meer dan de
  // knop belooft.
  const overigeDiffs = row.diffs.filter((d) => d.field !== "id_spotify");

  return (
    <div className="mix-key-row" data-state={row.state}>
      <span className="mix-name" title={row.currentDescription || "(nog geen beschrijving)"}>
        {row.playlistName}
        <small>{row.mixFile}</small>
      </span>

      <span className="mix-key-id">{row.mixId}</span>

      <span className="mix-key-now">
        {row.currentKey ?? <span className="muted-cell">— geen blok</span>}
        {overigeDiffs.length > 0 && (
          <em
            title={overigeDiffs
              .map((d) => `${d.field}: "${d.inDescription ?? "—"}" wordt "${d.inMix ?? "—"}"`)
              .join("; ")}
          >
            + {overigeDiffs.map((d) => d.field).join(", ")}
          </em>
        )}
      </span>

      <span className="mix-key-next">
        {row.state === "blocked" ? (
          <em className="mix-id-conflict" title={row.blocker ?? ""}>
            geblokkeerd — bron
          </em>
        ) : (
          row.targetKey
        )}
      </span>

      <span className="mix-key-action">
        {row.state === "to-write" && (
          <SpotifyIdWriteButton
            playlistId={row.playlistId}
            playlistName={row.playlistName}
            mixId={row.mixId}
            targetKey={row.targetKey}
          />
        )}
        {row.state === "in-sync" && (
          <span className="mix-key-ok" title="De beschrijving klopt al veld voor veld">
            ✓
          </span>
        )}
      </span>
    </div>
  );
}
