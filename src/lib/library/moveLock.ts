// Het één-verplaatsing-tegelijk-slot per playlist (in dit proces: de app draait als één lokale server),
// gedeeld door api/spotify/playlist-order en api/spotify/playlist-order/sync: een route-bestand mag geen
// eigen exports hebben, en beide schrijven in dezelfde playlist.
const busy = new Set<string>();

/** Pakt het slot; false als er al iemand mee bezig is. */
export function tryLockPlaylist(playlistId: string): boolean {
  if (busy.has(playlistId)) return false;
  busy.add(playlistId);
  return true;
}

export function unlockPlaylist(playlistId: string): void {
  busy.delete(playlistId);
}
