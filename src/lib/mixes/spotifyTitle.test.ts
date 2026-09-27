// De playlistnaam als spiegel van de mix-JSON (spotifyTitle.ts). Drie dingen worden hier vastgelegd, en
// alle drie zijn ze een beslissing van Dave op 2026-08-11 -- geen implementatiedetail:
//   1. het datumstaartje gaat eraf (de vorm die hij koos);
//   2. een verkeerde kleur-emoji BLOKKEERT en wordt niet stil gecorrigeerd;
//   3. de vergelijking is letterlijk, niet veld-voor-veld zoals bij de beschrijving.
import { describe, expect, it } from "vitest";
import { compareTitle, normalizeSpotifyTitle, titleBlocker } from "./spotifyTitle";
import type { Mix } from "./types";

function makeMix(over: Partial<Mix> = {}): Mix {
  return {
    id: "20260303",
    file: "full-yellow.json",
    spotifyId: null,
    title: "Yellow Tech House Mix · Vol. 1",
    spotifyTitle: "EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1",
    genre: "House",
    subgenre: "Tech House",
    color: "Yellow",
    density: "Full",
    gender: "m",
    volume: 1,
    date: "2026-03-03",
    bpm: 128,
    slug: null,
    topArtists: [],
    tracks: [],
    ...over,
  };
}

describe("normalizeSpotifyTitle -- het datumstaartje", () => {
  it("haalt het staartje 'emoji + 8 cijfers' van het eind", () => {
    expect(normalizeSpotifyTitle("EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1 🟡 20260303")).toBe(
      "EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1"
    );
  });

  it("laat een titel die al zonder staartje komt ongemoeid -- de branch-vorm is een no-op", () => {
    const alGoed = "EDM 176BPM 🟣 Purple Light (f) 🟣 Vol. 9";
    expect(normalizeSpotifyTitle(alGoed)).toBe(alGoed);
  });

  it("haalt ook een staartje zonder emoji weg", () => {
    expect(normalizeSpotifyTitle("EDM 128BPM 🟡 Yellow Full (m) Vol. 1 20260303")).toBe(
      "EDM 128BPM 🟡 Yellow Full (m) Vol. 1"
    );
  });

  // Het anker `$` is wat dit veilig maakt: acht cijfers MIDDEN in een titel zijn geen staartje. Zonder
  // die eis zou een titel met een jaartal of een getal erin stilletjes verminkt worden.
  it("raakt acht cijfers midden in de titel niet aan", () => {
    expect(normalizeSpotifyTitle("EDM 20260303 Yellow Vol. 1")).toBe("EDM 20260303 Yellow Vol. 1");
  });

  it("vouwt dubbele witruimte samen, zodat een spatie in de bron geen 'afwijkende naam' oplevert", () => {
    expect(normalizeSpotifyTitle("EDM  128BPM   🟡 Yellow Full (m)")).toBe("EDM 128BPM 🟡 Yellow Full (m)");
  });

  it("levert null bij een leeg, ontbrekend of alleen-witruimte veld", () => {
    expect(normalizeSpotifyTitle(undefined)).toBeNull();
    expect(normalizeSpotifyTitle(null)).toBeNull();
    expect(normalizeSpotifyTitle("")).toBeNull();
    expect(normalizeSpotifyTitle("   ")).toBeNull();
  });

  // Een titel die ALLEEN uit een staartje bestaat is na de bewerking leeg -- en dan is er geen naam, geen
  // lege string die als naam naar Spotify zou kunnen gaan.
  it("levert null als er na het strippen niets overblijft", () => {
    expect(normalizeSpotifyTitle("🟡 20260303")).toBeNull();
  });
});

describe("titleBlocker -- wanneer de naam NIET geschreven mag worden", () => {
  it("laat een kloppende naam door", () => {
    expect(titleBlocker(makeMix())).toBeNull();
  });

  it("blokkeert een mix zonder title_spotify", () => {
    expect(titleBlocker(makeMix({ spotifyTitle: null }))).toMatch(/geen title_spotify/i);
  });

  // DE CONCRETE AANLEIDING (Dave, 2026-08-11): alle Cyan-entries in de bron dragen 💠 (U+1F4A0) terwijl
  // Dave's playlists en deze app 🧊 (U+1F9CA) gebruiken. Dave heeft besloten dat de BRON daar wordt
  // rechtgezet -- dus blokkeert de hub, en corrigeert hij niet stil. Stil corrigeren zou de fout in de
  // bron onzichtbaar maken en de twee bronnen permanent laten verschillen.
  it("blokkeert de 💠 waar 🧊 hoort te staan, en noemt beide emoji's in de uitleg", () => {
    const cyan = makeMix({
      color: "Cyan",
      spotifyTitle: "EDM 128BPM 💠 Cyan Light (f) 💠 Vol. 5",
    });
    const reden = titleBlocker(cyan);
    expect(reden).toContain("💠");
    expect(reden).toContain("🧊");
    expect(reden).toMatch(/fout in de mix-bron/i);
  });

  it("laat de Cyan-naam door zodra de bron 🧊 schrijft", () => {
    const cyan = makeMix({
      color: "Cyan",
      spotifyTitle: "EDM 128BPM 🧊 Cyan Light (f) 🧊 Vol. 5",
    });
    expect(titleBlocker(cyan)).toBeNull();
  });

  // Niet alleen de 💠: elke kleur-emoji die niet bij de kleur van de mix hoort is een blokkade. Zo valt
  // ook een toekomstige verhaspeling (een groene mix met een rode emoji) op in plaats van doorgeschreven
  // te worden.
  it("blokkeert de emoji van een ANDERE kleur", () => {
    const fout = makeMix({ color: "Green", spotifyTitle: "EDM 128BPM 🔴 Green Light (f) Vol. 1" });
    expect(titleBlocker(fout)).toContain("🔴");
  });

  it("laat een naam zonder kleur-emoji door -- de bron mag er een leveren zonder", () => {
    expect(titleBlocker(makeMix({ spotifyTitle: "EDM 128BPM Yellow Full (m) Vol. 1" }))).toBeNull();
  });

  it("weegt de emoji niet bij een mix zonder kleur", () => {
    expect(titleBlocker(makeMix({ color: null, spotifyTitle: "EDM 128BPM 💠 Vol. 1" }))).toBeNull();
  });
});

describe("compareTitle -- de vergelijking is letterlijk", () => {
  it("noemt een gelijke naam in-sync", () => {
    const mix = makeMix();
    expect(compareTitle("EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1", mix)).toEqual({
      state: "in-sync",
      target: mix.spotifyTitle,
      blocker: null,
    });
  });

  it("noemt de oude naam outdated en levert de doelnaam mee", () => {
    const uitkomst = compareTitle("House Mix 🟡 Yellow Full (m) 🟡 Vol. 1", makeMix());
    expect(uitkomst.state).toBe("outdated");
    expect(uitkomst.target).toBe("EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1");
  });

  // Anders dan compareDescription, die per veld vergelijkt: hier dicteert de bron de naam exact, dus is
  // ook een enkele spatie een verschil. Dat is bewust -- de naam is één string, niet een set velden.
  it("ziet een verschil in één teken als outdated", () => {
    expect(compareTitle("EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 2", makeMix()).state).toBe("outdated");
  });

  it("geeft blocked (en geen outdated) zodra er een blokkade is, ook als de naam afwijkt", () => {
    const cyan = makeMix({ color: "Cyan", spotifyTitle: "EDM 128BPM 💠 Cyan Light (f) 💠 Vol. 5" });
    const uitkomst = compareTitle("House Mix 🧊 Cyan Light (f) 🧊 Vol. 5", cyan);
    expect(uitkomst.state).toBe("blocked");
    expect(uitkomst.blocker).not.toBeNull();
  });
});
