// De richting van een knop die iets tussen de hub en Spotify verplaatst, zichtbaar in de knop zelf (Dave,
// 31 oktober 2026: "dat de ene knop van a naar b synct en de andere van b naar a"). In de kop van een werkbak
// staan er twee naast elkaar die tegengesteld werken: PendingOrderButton stuurt de lokale volgorde NAAR
// Spotify, PlaylistSyncButton haalt de playlist UIT Spotify. Ze heten Push en Fetch, zoals in git (Dave:
// "doe anders gewoon fetch and push"), en elk krijgt een icoon: pijl omhoog uit de bak = Push, pijl omlaag in
// de bak = Fetch. Een omlijnd routelabel "Hub → Spotify" is geprobeerd en afgekeurd.

export type SyncDirectionKind = "push" | "pull";

export function SyncDirectionIcon({ direction, spinning = false }: { direction: SyncDirectionKind; spinning?: boolean }) {
  if (spinning) {
    // Tijdens het werk het draaiende sync-icoon, zoals de volledige sync op /spotify (SyncButton.tsx).
    return (
      <svg className="playlist-sync__icon is-spinning" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3" />
        <path d="M18 3v3.7h-3.7M6 21v-3.7h3.7" />
      </svg>
    );
  }
  return (
    <svg className="playlist-sync__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
      {direction === "push" ? <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /> : <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />}
    </svg>
  );
}
