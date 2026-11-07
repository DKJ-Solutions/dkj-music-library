// PC <-> Spotify (#144): de tracks in de Spotify-playlists naast de bestanden in de lokale muziekmap.
//
// Koppelen gaat in drie stappen (#151):
//   1. Een eigen koppeling (`dkj_local_file`, het pad vanaf de muziekmap) wint altijd, zolang dat bestand er staat.
//   2. Anders op `dkj_file` (de bestandsnaam zonder extensie, fileName.ts). Hoofdletters, witruimte en
//      Unicode-vorm tellen niet mee.
//   3. Wat dan nog over is, krijgt een VOORSTEL: het lokale bestand waarvan de woorden (artiest + titel) het
//      meest overeenkomen, één op één, vanaf FUZZY_THRESHOLD. Een voorstel koppelt nog niet: het staat apart
//      tot je het bevestigt of verbetert, en dat schrijft stap 1.
// rekordbox' collection.xml doet (nog) niet mee als bron (besluit #151, 7 november 2026).
//
// Pure module: geen fs, geen sqlite.
import type { LocalFile } from "./scanMusicFolder";

export interface CompareTrack {
  id: string;
  /** `dkj_file`, of null als de track er (nog) geen heeft. */
  file: string | null;
  /** `dkj_local_file`: het zelf gekoppelde bestand, pad vanaf de muziekmap. */
  localFile?: string | null;
  playlists: readonly { id: string; name: string }[];
}

export interface PlaylistDownloads {
  id: string;
  name: string;
  /** De `dkj_file`-namen die in deze playlist staan en geen bestand hebben, op naam gesorteerd. */
  files: string[];
}

export interface LinkSuggestion {
  trackId: string;
  /** `dkj_file` van de track. */
  file: string;
  /** Het voorgestelde lokale bestand. */
  suggestion: LocalFile;
  /** Hoe sterk de woorden overeenkomen, 0 tot 1. */
  score: number;
}

export interface OwnLink {
  trackId: string;
  file: string | null;
  relativePath: string;
}

export interface Unlinked {
  trackId: string;
  file: string;
}

export interface LocalComparison {
  /** Per playlist wat nog gedownload moet worden, alleen playlists met iets te downloaden, in de volgorde
   *  waarin ze voor het eerst langskomen. Zonder de tracks met een voorstel. */
  toDownload: PlaylistDownloads[];
  /** Het aantal tracks zonder bestand en zonder voorstel (een track in twee playlists telt één keer). */
  toDownloadCount: number;
  /** De tracks zonder bestand en zonder voorstel, op naam: wat je zelf kunt koppelen. */
  unlinked: Unlinked[];
  /** Bestanden waar geen track en geen voorstel bij hoort. */
  localOnly: LocalFile[];
  /** Het aantal tracks met een bestand, de eigen koppelingen meegeteld. */
  matchedCount: number;
  /** De eigen koppelingen die een bestand vonden. */
  ownLinks: OwnLink[];
  /** Voorstellen voor een track zonder bestand, op naam van de track. */
  suggestions: LinkSuggestion[];
  /** Tracks in een playlist zonder `dkj_file`: die zijn niet te koppelen. */
  withoutFileName: number;
}

/** Vanaf deze overeenkomst (Dice op de woorden) wordt een bestand voorgesteld. */
export const FUZZY_THRESHOLD = 0.7;

/** De sleutel waarop gekoppeld wordt. */
export function matchKey(name: string): string {
  return name.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** De sleutel van een pad: zelfde regels als matchKey, met "\" als "/". */
export function pathKey(relativePath: string): string {
  return matchKey(relativePath.replace(/\\/g, "/"));
}

/** De woorden van een naam voor het vergelijken: zonder accenten, leestekens en hoofdletters; "ft." en
 *  "featuring" worden "feat", en "&", "and", "x" en "vs" vallen weg (ze verbinden alleen artiesten). */
export function fuzzyWords(name: string): Set<string> {
  const plain = name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ");
  const words = plain
    .split(" ")
    .map((word) => (word === "ft" || word === "featuring" ? "feat" : word))
    .filter((word) => word !== "" && !["and", "x", "vs"].includes(word));
  return new Set(words);
}

/** Dice-coëfficiënt van twee woordsets. */
export function similarity(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return (2 * shared) / (a.size + b.size);
}

/** Eén op één de beste paren vanaf de drempel: het sterkste paar eerst, elke track en elk bestand één keer. */
function suggest(tracks: readonly Unlinked[], files: readonly LocalFile[]): LinkSuggestion[] {
  const fileWords = files.map((file) => fuzzyWords(file.name));
  const filesByWord = new Map<string, number[]>();
  fileWords.forEach((words, index) => {
    for (const word of words) filesByWord.set(word, [...(filesByWord.get(word) ?? []), index]);
  });

  const pairs: { track: Unlinked; fileIndex: number; score: number }[] = [];
  for (const track of tracks) {
    const words = fuzzyWords(track.file);
    const candidates = new Set<number>();
    for (const word of words) for (const index of filesByWord.get(word) ?? []) candidates.add(index);
    for (const index of candidates) {
      const score = similarity(words, fileWords[index]);
      if (score >= FUZZY_THRESHOLD) pairs.push({ track, fileIndex: index, score });
    }
  }
  pairs.sort((a, b) => b.score - a.score || a.track.file.localeCompare(b.track.file));

  const usedTracks = new Set<string>();
  const usedFiles = new Set<number>();
  const result: LinkSuggestion[] = [];
  for (const pair of pairs) {
    if (usedTracks.has(pair.track.trackId) || usedFiles.has(pair.fileIndex)) continue;
    usedTracks.add(pair.track.trackId);
    usedFiles.add(pair.fileIndex);
    result.push({ trackId: pair.track.trackId, file: pair.track.file, suggestion: files[pair.fileIndex], score: pair.score });
  }
  return result.sort((a, b) => a.file.localeCompare(b.file));
}

export function compareLocal(tracks: readonly CompareTrack[], files: readonly LocalFile[]): LocalComparison {
  const filesByKey = new Map<string, LocalFile[]>();
  const filesByPath = new Map<string, LocalFile>();
  for (const file of files) {
    const key = matchKey(file.name);
    filesByKey.set(key, [...(filesByKey.get(key) ?? []), file]);
    filesByPath.set(pathKey(file.relativePath), file);
  }

  const claimedKeys = new Set<string>();
  const claimedPaths = new Set<string>();
  const ownLinks: OwnLink[] = [];
  const open: { track: CompareTrack; file: string }[] = [];
  let matchedCount = 0;
  let withoutFileName = 0;

  for (const track of tracks) {
    if (track.playlists.length === 0) continue;
    const linked = track.localFile ? filesByPath.get(pathKey(track.localFile)) : undefined;
    if (linked) {
      claimedPaths.add(pathKey(linked.relativePath));
      ownLinks.push({ trackId: track.id, file: track.file, relativePath: linked.relativePath });
      matchedCount++;
      continue;
    }
    if (!track.file || track.file.trim() === "") {
      withoutFileName++;
      continue;
    }
    const key = matchKey(track.file);
    if (filesByKey.has(key)) {
      claimedKeys.add(key);
      matchedCount++;
      continue;
    }
    open.push({ track, file: track.file });
  }

  const isClaimed = (file: LocalFile) => claimedKeys.has(matchKey(file.name)) || claimedPaths.has(pathKey(file.relativePath));
  const unclaimed = files.filter((file) => !isClaimed(file));
  const suggestions = suggest(
    open.map(({ track, file }) => ({ trackId: track.id, file })),
    unclaimed
  );
  const suggestedTracks = new Set(suggestions.map((s) => s.trackId));
  const suggestedFiles = new Set(suggestions.map((s) => pathKey(s.suggestion.relativePath)));

  const perPlaylist = new Map<string, PlaylistDownloads>();
  const unlinked: Unlinked[] = [];
  for (const { track, file } of open) {
    if (suggestedTracks.has(track.id)) continue;
    unlinked.push({ trackId: track.id, file });
    for (const playlist of track.playlists) {
      const entry = perPlaylist.get(playlist.id) ?? { id: playlist.id, name: playlist.name, files: [] };
      entry.files.push(file);
      perPlaylist.set(playlist.id, entry);
    }
  }

  const toDownload = [...perPlaylist.values()].map((entry) => ({
    ...entry,
    files: entry.files.sort((a, b) => a.localeCompare(b)),
  }));
  const localOnly = unclaimed.filter((file) => !suggestedFiles.has(pathKey(file.relativePath)));
  return {
    toDownload,
    toDownloadCount: unlinked.length,
    unlinked: unlinked.sort((a, b) => a.file.localeCompare(b.file)),
    localOnly,
    matchedCount,
    ownLinks: ownLinks.sort((a, b) => (a.file ?? a.relativePath).localeCompare(b.file ?? b.relativePath)),
    suggestions,
    withoutFileName,
  };
}
