// Fase 6: de drie secties van /spotify/dashboard (dedup, top-artiesten, verdelingen). Server
// Component -- puur presentationeel, krijgt alle cijfers al-berekend binnen (dashboardStats.ts,
// server-side in page.tsx uitgevoerd) en doet zelf geen fs/berekening. Geen interactiviteit nodig
// (geen filters/correcties zoals PlaylistManager) -- dit is een read-only overzicht, zelfde geest
// als WorldPage/BpmOverviewSection.
import type { DedupSummary, ArtistRanking, ColorDistribution, TopDuplicateArtist } from "@/lib/spotify/dashboardStats";
import { WORLD_META, SPOTIFY_WORLDS, type SpotifyWorld } from "@/lib/spotify/classifyWorld";
import { MMC_BPM_TIERS, BPM_TIER_META, type MmcBpmTier } from "@/lib/spotify/classifyBpm";

const numberFormat = new Intl.NumberFormat("nl-NL");

function fmt(n: number): string {
  return numberFormat.format(n);
}

// Gedeelde ranked-bar-rij -- gebruikt door zowel "Artiesten met de meeste duplicaten",
// "Top-artiesten" als de kleurverdeling hieronder. Balkbreedte relatief aan het hoogste getal in
// de MEEGEGEVEN lijst (niet een globaal maximum), zodat elke sectie zijn eigen schaal krijgt.
function BarList({
  items,
  unit,
}: {
  items: { key: string; label: string; value: number; sublabel?: string; color?: string }[];
  unit: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="dashboard-bars">
      {items.map((item, i) => (
        <div className="dashboard-bar-row" key={item.key}>
          <span className="rank" aria-hidden="true">
            {i + 1}
          </span>
          <span className="label" title={item.label}>
            {item.label}
            {item.sublabel && <span className="sublabel"> — {item.sublabel}</span>}
          </span>
          <span className="dashboard-bar-track">
            <span
              className="dashboard-bar-fill"
              style={{ width: `${(item.value / max) * 100}%`, ...(item.color ? { background: item.color } : {}) }}
            />
          </span>
          <span className="value">
            {fmt(item.value)} {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function DedupSection({
  dedup,
  duplicateArtists,
}: {
  dedup: DedupSummary;
  duplicateArtists: TopDuplicateArtist[];
}) {
  return (
    <section className="layer">
      <div className="band">
        <span className="eyebrow">Dedup</span>
        <span className="rule"></span>
      </div>
      <p className="section-lede">
        Tracks die in meerdere playlists tegelijk staan -- handig om te zien waar je bibliotheek
        overlapt, vóórdat je gaat opschonen. Alleen dubbele tracks OVER playlists heen (dezelfde
        track twee keer in één en dezelfde playlist telt hier niet mee).
      </p>

      {dedup.totalDuplicateTracks === 0 ? (
        <p className="empty-note">Geen enkele track staat in meer dan één playlist.</p>
      ) : (
        <>
          <p className="empty-note" style={{ marginBottom: "10px" }}>
            {fmt(dedup.totalDuplicateTracks)} van de {fmt(dedup.totalDistinctTracks)} distincte tracks
            staan in 2+ playlists
            {dedup.duplicates.length < dedup.totalDuplicateTracks
              ? ` -- top ${dedup.duplicates.length} hieronder, gesorteerd op aantal playlists`
              : ""}
            .
          </p>

          <div className="dedup-col-heads">
            <span>Track</span>
            <span>Artiest(en)</span>
            <span>Playlists</span>
            <span>In welke playlists</span>
          </div>
          <div className="dedup-table">
            {dedup.duplicates.map((dup) => (
              <div className="dedup-row" key={dup.trackId}>
                <span className="name" title={dup.name}>
                  {dup.name}
                </span>
                <span className="artists" title={dup.artists.map((a) => a.name).join(", ")}>
                  {dup.artists.map((a) => a.name).join(", ")}
                </span>
                <span className="count-badge">{dup.playlistCount}</span>
                <span className="in-playlists" title={dup.playlistNames.join(", ")}>
                  {dup.playlistNames.join(", ")}
                </span>
              </div>
            ))}
          </div>

          {duplicateArtists.length > 0 && (
            <>
              <p className="section-sublede">Artiesten met de meeste overtollige kopieën</p>
              <BarList
                unit="extra"
                items={duplicateArtists.map((a) => ({ key: a.id, label: a.name, value: a.extraCopies }))}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}

function TopArtistsSection({ topArtists }: { topArtists: ArtistRanking[] }) {
  return (
    <section className="layer">
      <div className="band">
        <span className="eyebrow">Top-artiesten</span>
        <span className="rule"></span>
      </div>
      <p className="section-lede">
        Meest voorkomende artiesten over je hele bibliotheek -- geteld per track-entry, dus
        inclusief dezelfde track die in meerdere playlists staat (dat telt hier bewust mee: een
        artiest die overal terugkomt is precies wat &quot;meest voorkomend&quot; betekent).
      </p>

      {topArtists.length === 0 ? (
        <p className="empty-note">Nog geen tracks om te tellen.</p>
      ) : (
        <BarList
          unit="tracks"
          items={topArtists.map((a) => ({
            key: a.name,
            label: a.name,
            value: a.trackCount,
            sublabel: `${fmt(a.playlistCount)} playlist${a.playlistCount === 1 ? "" : "s"}`,
          }))}
        />
      )}
    </section>
  );
}

function WorldTracksTile({ world, trackCount }: { world: SpotifyWorld; trackCount: number }) {
  const meta = WORLD_META[world];
  return (
    <div className="world-tile world-tile--static">
      <span className="emoji" aria-hidden="true">
        {meta.emoji}
      </span>
      <span className="label">{meta.label}</span>
      <span className="count">{fmt(trackCount)} tracks</span>
    </div>
  );
}

function BpmTracksTile({ bpm, trackCount }: { bpm: MmcBpmTier; trackCount: number }) {
  const meta = BPM_TIER_META[bpm];
  return (
    <div className="world-tile world-tile--static">
      <span className="emoji" aria-hidden="true">
        🥁
      </span>
      <span className="label">{meta.label}</span>
      <span className="count">{fmt(trackCount)} tracks</span>
    </div>
  );
}

function DistributionsSection({
  worldTracks,
  bpmTracks,
  colorDistribution,
  totalTracks,
}: {
  worldTracks: Record<SpotifyWorld, number>;
  bpmTracks: Record<MmcBpmTier | "overig", number>;
  colorDistribution: ColorDistribution;
  totalTracks: number;
}) {
  const bpmOverig = bpmTracks.overig;

  return (
    <section className="layer">
      <div className="band">
        <span className="eyebrow">Verdelingen</span>
        <span className="rule"></span>
      </div>
      <p className="section-lede">
        Hoe je {fmt(totalTracks)} tracks verdeeld zijn over de dimensies die de bestaande
        indeling al biedt -- geteld in tracks, niet in playlists (het aantal tracks per playlist
        opgeteld per groep). Spotify geeft sinds kort geen BPM per nummer meer terug, dus dit is
        de bestaande wereld-/BPM-indeling per PLAYLIST toegepast op het aantal tracks daarin --
        geen gok per los nummer.
      </p>

      <p className="section-sublede">Werelden</p>
      <div className="world-grid">
        {SPOTIFY_WORLDS.map((world) => (
          <WorldTracksTile key={world} world={world} trackCount={worldTracks[world]} />
        ))}
      </div>

      <p className="section-sublede" style={{ marginTop: "26px" }}>
        Kleur (Plutchik)
      </p>
      <BarList
        unit="tracks"
        items={[
          ...colorDistribution.byColor.map((c) => ({
            key: c.color,
            label: c.color,
            value: c.trackCount,
            color: `var(--emotion-${c.color.toLowerCase()})`,
          })),
          ...(colorDistribution.withoutColor > 0
            ? [{ key: "zonder-kleur", label: "Zonder kleur", value: colorDistribution.withoutColor }]
            : []),
        ]}
      />

      <p className="section-sublede" style={{ marginTop: "26px" }}>
        MMC-BPM
      </p>
      <div className="world-grid">
        {MMC_BPM_TIERS.map((bpm) => (
          <BpmTracksTile key={bpm} bpm={bpm} trackCount={bpmTracks[bpm]} />
        ))}
        {bpmOverig > 0 && (
          <div className="world-tile world-tile--static">
            <span className="emoji" aria-hidden="true">
              ❔
            </span>
            <span className="label">Overig</span>
            <span className="count">{fmt(bpmOverig)} tracks</span>
          </div>
        )}
      </div>
    </section>
  );
}

export function DashboardOverview({
  dedup,
  duplicateArtists,
  topArtists,
  worldTracks,
  bpmTracks,
  colorDistribution,
  totalTracks,
}: {
  dedup: DedupSummary;
  duplicateArtists: TopDuplicateArtist[];
  topArtists: ArtistRanking[];
  worldTracks: Record<SpotifyWorld, number>;
  bpmTracks: Record<MmcBpmTier | "overig", number>;
  colorDistribution: ColorDistribution;
  totalTracks: number;
}) {
  return (
    <>
      <DedupSection dedup={dedup} duplicateArtists={duplicateArtists} />
      <TopArtistsSection topArtists={topArtists} />
      <DistributionsSection
        worldTracks={worldTracks}
        bpmTracks={bpmTracks}
        colorDistribution={colorDistribution}
        totalTracks={totalTracks}
      />
    </>
  );
}
