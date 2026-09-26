// De brug-weergave: elke mix uit de DJ Cylow-JSON's naast de MMC-playlist die hem weerspiegelt.
// Server Component -- de fs-read + koppeling gebeurt in mixes/mixLinks.ts, hier alleen de
// presentatie. Idioom hergebruikt van de bestaande Spotify-pagina's (masthead/layer/band/stats +
// een gridtabel in de geest van _playlist-list.scss).
//
// Leesrichting: de mix-JSON is de bron, de playlist de spiegel (Dave's uitgangspunt). Daarom is de
// mix de rij en de playlist de kolom ernaast -- niet omgekeerd.
import Link from "next/link";
import { getMixLinks } from "@/lib/mixes/mixLinks";
import { getSpotifyIdPlan } from "@/lib/mixes/spotifyIdSync";
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import {
  summarizeLinks,
  type MixLink,
  type MixLinkStatus,
  type MixMatchCandidate,
} from "@/lib/mixes/matchMixes";
import { MixTagFixButton } from "./MixTagFixButton";
import { SpotifyIdSection } from "./SpotifyIdSection";

const STATUS_META: Record<MixLinkStatus, { label: string; hint: string }> = {
  "own-playlist": {
    label: "Eigen playlist",
    hint: "De mix heeft zijn eigen genummerde MMC-playlist met (vrijwel) dezelfde tracklijst -- klaar en live, de weerspiegeling klopt.",
  },
  "work-queue": {
    label: "Nog in de werkbak",
    hint: "De mix staat op Spotify nog in een Vol. X-lijst, terwijl hij volgens de mix-data al klaar en live is -- die playlist hoort een nummer te krijgen.",
  },
  "bucket-only": {
    label: "Alleen in een emmer",
    hint: "De tracks staan wél op Spotify, maar alleen in een grote verzamellijst -- er is geen eigen mix-playlist.",
  },
  unmatched: {
    label: "Niet gevonden",
    hint: "Geen playlist bevat deze tracklijst.",
  },
};

const STATUS_ORDER: MixLinkStatus[] = ["own-playlist", "work-queue", "bucket-only", "unmatched"];

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function MixBridge() {
  // De snapshot is tientallen MB's en readSnapshot() cachet niet, dus hij wordt hier één keer gelezen en
  // aan beide berekeningen doorgegeven -- de koppeling én de id_spotify-planning.
  const snapshot = readSnapshot();
  const { syncedAt, mixCount, links, unmirroredPlaylists, workBenchCount } = getMixLinks(snapshot);
  const summary = summarizeLinks(links);
  const spotifyIdPlan = getSpotifyIdPlan(snapshot);

  return (
    <main className="wrap">
      <header className="masthead">
        <Link href="/spotify/musicmoodcolours" className="world-back-link">
          ← Terug naar MMC
        </Link>
        <h1>
          <span aria-hidden="true">🎚️</span> Mixen ↔ playlists
        </h1>
        <p className="lede">
          De mix-metadata van de DJ Cylow-website ({mixCount} publieke mixen uit{" "}
          <code>djcylow-react</code>) naast de MMC-playlists die er een weerspiegeling van horen te
          zijn. Gekoppeld op <strong>tracklist-inhoud</strong>, niet op naam: de twee bronnen delen
          geen sleutel en de <code>Vol.</code>-nummering loopt uiteen.
        </p>
        <p className="lede">
          Het <code>Vol.</code>-token draagt de productiestatus: <strong>een cijfer</strong> betekent
          klaar en live op de website, <strong>
            <code>Vol. X</code>
          </strong>{" "}
          is een werkbak met verzamelde tracks voor een mix die nog niet gemaakt is. De controle loopt
          daarom twee kanten op -- elke mix hoort een genummerde playlist te hebben, én elke genummerde
          playlist hoort een mix te hebben.
        </p>
      </header>

      {mixCount === 0 ? (
        <section className="layer">
          <p className="empty-note">
            Geen mix-data gevonden. De bron woont in de zusterrepo{" "}
            <code>../djcylow-react/src/data/mixes/</code> -- staat die er niet naast deze kloon, dan valt
            er niets te koppelen. Met <code>MIXES_DATA_DIR</code> kun je een ander pad aanwijzen.
          </p>
        </section>
      ) : syncedAt === null ? (
        <section className="layer">
          <p className="empty-note">
            Er is nog geen Spotify-snapshot om tegen te koppelen -- start eerst een sync op{" "}
            <Link href="/spotify" className="accent-text">
              /spotify
            </Link>
            .
          </p>
        </section>
      ) : (
        <>
          <section className="layer">
            <div className="stats">
              <div className="stat">
                <b>{summary.ownPlaylist}</b>
                <span>eigen playlist</span>
              </div>
              <div className="stat">
                <b>{summary.workQueue}</b>
                <span>nog in de werkbak</span>
              </div>
              <div className="stat">
                <b>{summary.bucketOnly}</b>
                <span>alleen in een emmer</span>
              </div>
              <div className="stat">
                <b>{summary.unmatched}</b>
                <span>niet gevonden</span>
              </div>
              <div className="stat">
                <b>{summary.volumeMismatch}</b>
                <span>Vol. wijkt af</span>
              </div>
              <div className="stat">
                <b>{summary.trackCountMismatch}</b>
                <span>trackaantal wijkt af</span>
              </div>
              <div className="stat">
                <b>{summary.bpmMismatch}</b>
                <span>BPM-gok wijkt af</span>
              </div>
              {/* De harde sleutel: het mix-ID in de playlistbeschrijving (`mix:20260303`). Zolang Dave
                  die tags nog niet heeft gezet staat hier 0 en koppelt alles op de tracklist -- dat is
                  geen storing maar de beginstand. */}
              <div className="stat">
                <b>{summary.byDeclaredId}</b>
                <span>op ID gekoppeld</span>
              </div>
              {summary.declaredIdMismatch > 0 && (
                <div className="stat">
                  <b>{summary.declaredIdMismatch}</b>
                  <span>ID spreekt tegen</span>
                </div>
              )}
            </div>
            <p className="empty-note" style={{ marginTop: "12px" }}>
              Gekoppeld tegen de snapshot van {new Date(syncedAt).toLocaleString("nl-NL")}. Daarnaast
              staan er {workBenchCount} <code>Vol. X</code>-werkbakken in MMC -- dat zijn geen mixen
              maar de voorraad voor de volgende, dus die horen hier niet in de telling.
            </p>
            <p className="empty-note" style={{ marginTop: "8px" }}>
              <strong>{summary.byDeclaredId}</strong> van de {summary.total} mixen is gekoppeld op de
              harde sleutel: het mix-ID achteraan de playlistbeschrijving, die de velden uit deze bron
              spiegelt als{" "}
              <code>Subgenre · Color Power (Frequency) · Vol. N · ID</code>. De rest loopt via de
              tracklist-heuristiek — die werkt, maar weegt containment tegen grootte en kan er dus naast
              zitten. Staat het ID in een beschrijving, dan wint dat altijd.
            </p>

            {/* De tegenspraak-teller kreeg eerder geen vervolg: je zag dát er een botsing was, maar niet
                wat je eraan kon doen. Het onderscheid tussen de twee soorten is af te leiden uit de bron
                (bestaat de getagde mix?) en bepaalt precies dat -- vandaar hier de uitsplitsing. */}
            {summary.declaredIdMismatch > 0 && (
              <p className="empty-note" style={{ marginTop: "8px" }}>
                <strong>{summary.declaredIdMismatch}</strong>{" "}
                {summary.declaredIdMismatch === 1 ? "mix wordt" : "mixen worden"} tegengesproken door de
                beschrijving van de playlist erachter, en dat valt in twee soorten uiteen.
                {summary.tagPointsToUnknownMix > 0 && (
                  <>
                    {" "}
                    Bij <strong>{summary.tagPointsToUnknownMix}</strong> wijst de tag naar een mix-ID dat
                    in <code>djcylow-react</code> niet bestaat — een typefout of een verdwenen mix. Daar
                    hangt niets meer aan, dus die is ter plekke te corrigeren met de knop in de rij.
                  </>
                )}
                {summary.playlistClaimedByOtherMix > 0 && (
                  <>
                    {" "}
                    Bij <strong>{summary.playlistClaimedByOtherMix}</strong> hoort de tag bij een mix die
                    wél bestaat; die claimt de playlist zelf al op de harde sleutel. De tag is daar dus
                    goed en de conclusie is een andere: die mix heeft geen eigen playlist en de tracklist
                    wees alleen naar de dichtstbijzijnde. Corrigeren zou de eigenaar zijn playlist
                    afpakken, dus daar staat bewust geen knop.
                  </>
                )}
              </p>
            )}
          </section>

          {/* De actielijst staat vóór de statusgroepen: dit is werk dat klaarligt, de rest is de stand
              van zaken. Wie de pagina opent om iets te dóén, hoeft dan niet langs ~80 rijen te scrollen. */}
          <SpotifyIdSection plan={spotifyIdPlan} />

          {STATUS_ORDER.map((status) => {
            const group = links.filter((l) => l.status === status);
            if (group.length === 0) return null;
            return <MixStatusGroup key={status} status={status} links={group} />;
          })}

          <UnmirroredPlaylists playlists={unmirroredPlaylists} />
        </>
      )}
    </main>
  );
}

/** De omgekeerde blik: genummerde MMC-playlists ("klaar en live") waar geen mix in de JSON's tegenover
 *  staat. Bewust een eigen sectie onderaan -- dit is niet "een mix met een probleem" maar een playlist
 *  zonder mix, de andere richting van dezelfde controle. */
function UnmirroredPlaylists({ playlists }: { playlists: MixMatchCandidate[] }) {
  return (
    <section className="layer">
      <div className="band">
        <span className="eyebrow">Genummerd, maar geen mix in de data</span>
        <span className="mix-group-count">{playlists.length}</span>
        <span className="rule"></span>
      </div>
      <p className="section-lede">
        Deze MMC-playlists dragen een <code>Vol.</code>-nummer en zouden dus klaar en live moeten
        staan, maar geen enkele mix in <code>djcylow-react</code> heeft hun tracklijst. Ofwel mist
        daar een entry, ofwel is een werkbak te vroeg genummerd.
      </p>
      {playlists.length === 0 ? (
        <p className="empty-note">Niets -- elke genummerde MMC-playlist heeft zijn mix in de data.</p>
      ) : (
        <ul className="mix-orphan-list">
          {playlists.map((p) => (
            <li key={p.id}>
              <span className="name">{p.name}</span>
              <span className="meta">{p.trackCount} tracks</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MixStatusGroup({ status, links }: { status: MixLinkStatus; links: MixLink[] }) {
  const meta = STATUS_META[status];
  return (
    <section className="layer">
      <div className="band">
        <span className="eyebrow">{meta.label}</span>
        <span className="mix-group-count">{links.length}</span>
        <span className="rule"></span>
      </div>
      <p className="section-lede">{meta.hint}</p>

      <div className="mix-link-heads">
        <span>Mix (JSON)</span>
        <span>Kleur / dicht. / M-V</span>
        <span>Genre</span>
        <span>BPM</span>
        <span>Tr.</span>
        <span>Spotify-playlist</span>
        <span>Match</span>
      </div>

      {links.map((link) => (
        <MixLinkRow key={`${link.mix.file}-${link.mix.id}`} link={link} />
      ))}
    </section>
  );
}

function MixLinkRow({ link }: { link: MixLink }) {
  const { mix, playlist } = link;
  const dims = [mix.color ?? "—", mix.density ?? "—", mix.gender ? `(${mix.gender})` : "—"].join(" · ");

  return (
    <div className="mix-link-row" data-status={link.status}>
      <span className="mix-name" title={`${mix.title} — ${mix.file}${mix.date ? ` — ${mix.date}` : ""}`}>
        {mix.title || mix.id}
        <small>
          {mix.file}
          {mix.volume !== null && ` · Vol. ${mix.volume}`}
          {mix.date && ` · ${mix.date}`}
        </small>
      </span>

      <span className="mix-dims">
        {mix.color && (
          <span
            className="swatch"
            style={{ background: `var(--emotion-${mix.color.toLowerCase()})` }}
            aria-hidden="true"
          />
        )}
        {dims}
      </span>

      <span className="mix-genre">{mix.subgenre ?? mix.genre ?? "—"}</span>

      <span className="mix-bpm">
        {mix.bpm ?? "—"}
        {/* De JSON draagt de échte BPM (uit de audio-bestandsnaam); de app gokt er een op de
            playlistnaam. Wijken ze af, dan is de gok fout -- niet de mix. */}
        {link.bpmMismatch && (
          <em title={`De app gokt ${playlist?.guessedBpm} bpm op de playlistnaam`}>
            ≠ {playlist?.guessedBpm}
          </em>
        )}
      </span>

      <span className="mix-tracks">
        {mix.tracks.length}
        {link.trackCountDelta !== 0 && (
          <em title={`De playlist heeft ${playlist?.trackCount} tracks`}>
            {link.trackCountDelta > 0 ? `+${link.trackCountDelta}` : link.trackCountDelta}
          </em>
        )}
      </span>

      <span className="mix-playlist">
        {playlist ? (
          <>
            {playlist.name}
            {link.volumeMismatch && (
              <em title={`De JSON zegt Vol. ${mix.volume}, de playlist Vol. ${playlist.volume}`}>
                Vol. {String(playlist.volume)} ≠ {mix.volume}
              </em>
            )}
            {/* De beschrijving noemt een ándere mix dan waar de tracks naar wijzen. Wélke van de twee
                soorten dat is, bepaalt of er iets te corrigeren valt -- zie DeclaredIdConflict. */}
            {link.declaredIdConflict === "tag-points-to-unknown-mix" && playlist.declaredMixId && (
              <>
                <em
                  className="mix-id-conflict"
                  title={`De beschrijving zegt mix:${playlist.declaredMixId}, maar dat ID bestaat niet in de mix-bron -- een typefout, of een mix die uit djcylow-react verdwenen is`}
                >
                  beschrijving: {playlist.declaredMixId} (onbekend)
                </em>
                <MixTagFixButton
                  playlistId={playlist.id}
                  playlistName={playlist.name}
                  wrongMixId={playlist.declaredMixId}
                  correctMixId={mix.id}
                />
              </>
            )}
            {/* De andere soort: die tag hoort bij een mix die wél bestaat, en die claimt deze playlist
                zelf al op de harde sleutel. Corrigeren zou hem zijn playlist afpakken -- dus geen knop,
                maar de conclusie die er wél uit volgt: déze mix heeft geen eigen playlist. */}
            {link.declaredIdConflict === "playlist-claimed-by-other-mix" && (
              <em
                className="mix-id-conflict"
                title={`Deze playlist draagt de tag mix:${playlist.declaredMixId} en is dus van die mix. Mix ${mix.id} heeft daarmee geen eigen playlist -- de tracklist wees alleen naar de dichtstbijzijnde.`}
              >
                is van mix {playlist.declaredMixId} — deze mix mist een playlist
              </em>
            )}
          </>
        ) : (
          <span className="muted-cell">—</span>
        )}
      </span>

      {/* Op de harde sleutel gekoppeld: dan is de containment geen criterium meer maar een controle, en
          dat verschil hoort zichtbaar te zijn. Vandaar het ID-merkteken vóór het percentage. */}
      <span
        className="mix-score"
        data-matched-by={link.matchedBy ?? ""}
        title={
          link.matchedBy === "declared-id"
            ? `Gekoppeld op het ID uit de playlistbeschrijving (mix:${mix.id}). De tracklist bevestigt ${pct(link.containment)}; grootte-verhouding ${pct(link.sizeRatio)}`
            : `Gekoppeld op de tracklist: ${pct(link.containment)} van de mix-tracks; grootte-verhouding ${pct(link.sizeRatio)}`
        }
      >
        {link.matchedBy === "declared-id" && (
          <span className="mix-score-key" aria-label="op ID gekoppeld">
            #
          </span>
        )}
        {pct(link.containment)}
      </span>
    </div>
  );
}
