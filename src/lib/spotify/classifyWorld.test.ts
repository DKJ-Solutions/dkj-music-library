// classifyWorld.ts: de wereld-classificatie-heuristiek. De voorbeelden hieronder komen uit Dave's
// snapshot (data/spotify/snapshot.json, git-ignored) -- zie het regelnummer-commentaar bij elk geval,
// zodat een toekomstige bijstelling van de heuristiek tegen de echte aanleiding kan worden getoetst.
// Uitzondering: de privé-namen van regel 3 zijn vervangen door neutrale namen. De echte staan alleen
// in het lokale data/spotify/private-rules.json (zie privateRules.ts); TEST_RULES speelt die rol hier.
import { describe, expect, it } from "vitest";
import {
  classifyWorld,
  NO_WORLD_RULES,
  SPOTIFY_WORLDS,
  WORLD_META,
  type ClassifiableWorldPlaylist,
  type WorldRules,
} from "./classifyWorld";
import { parsePlaylistName } from "./parsePlaylistName";

// Bouwt de classifier-input op dezelfde manier als enrichedPlaylists.ts dat doet: de naam door de
// echte tokenizer (parsePlaylistName.ts) halen i.p.v. een los, met de hand ingevuld `parsed`-object
// -- zo toetsen deze tests ook meteen de samenwerking tussen de twee bestanden.
const TEST_RULES: WorldRules = {
  priveNamePatterns: [/zondag\s+favorite/i, /feestje/i, /all\s+pop/i, /christmas/i, /verjaardag/i],
};

function classify(
  name: string,
  ownerBucket: "dave" | "other" = "dave",
  rules: WorldRules = TEST_RULES
): ReturnType<typeof classifyWorld> {
  const playlist: ClassifiableWorldPlaylist = { name, ownerBucket, parsed: parsePlaylistName(name) };
  return classifyWorld(playlist, rules);
}

describe("classifyWorld -- regel 1: DJ Cylow/Feestzaal-marker (wint altijd)", () => {
  it("herkent een expliciete 'DJ Cylow'-naam, ook als eigenaar 'other' is (playlist 10)", () => {
    expect(classify("DJ CYLOW PLAYLIST", "other")).toBe("djcylow");
  });

  it("herkent 'Feestzaal' in Phase-namen (playlist 91)", () => {
    expect(classify("Phase 1, Feestzaal (2026)")).toBe("djcylow");
  });

  it("wint van de MMC-kleurstructuur als beide in de naam zitten (playlist 111)", () => {
    expect(classify("Classic Pop | DJ Cylow")).toBe("djcylow");
  });

  it("herkent 'ALLES | Feestzaal (2026) | DJ Cylow' (playlist 90)", () => {
    expect(classify("ALLES | Feestzaal (2026) | DJ Cylow")).toBe("djcylow");
  });
});

describe("classifyWorld -- regel 2 (nieuw, tweede bijstelling 2026-07-23): de twee expliciete MMC-uitzonderingen", () => {
  it("forceert 'Happy Lofi Beats | Cyan Music Mood' naar MMC, ondanks 'Music Mood' in de naam én "
    + "ownerBucket 'other' (echte snapshot-naam: een gevolgde playlist, owner 'Cyan Music Mood')", () => {
    expect(classify("Happy Lofi Beats | Cyan Music Mood (f) Vol. 1", "other")).toBe("mmc");
  });

  it("forceert 'NEW Deep House Mix' naar MMC (echte snapshot-naam)", () => {
    expect(classify("NEW Deep House Mix | 112BPM | Green Music Mood (f) Vol. 1")).toBe("mmc");
  });
});

describe("classifyWorld -- regel 3: expliciete privé-namen (wint van kleurstructuur)", () => {
  it("zet 'Zondag Favorite' zelf naar Privé (playlist 374)", () => {
    expect(classify("Zondag Favorite")).toBe("prive");
  });

  it("zet een kleur-gecodeerde 'Zondag Favorite'-variant ook naar Privé, niet MMC (playlist 378)", () => {
    expect(classify("Green Music Mood Full (f) | Zondag Favorite")).toBe("prive");
  });

  it("zet 'Feestje'-namen naar Privé, ook met een kleur in de naam (playlist 317)", () => {
    expect(classify("Green Light (f) |  DNB | Feestje | God")).toBe("prive");
  });

  it("zet 'All Pop' naar Privé (playlist 109)", () => {
    expect(classify("All Pop")).toBe("prive");
  });

  it("de regels komen uit het argument: een privé-naam wint zelfs van een genummerde mix", () => {
    const name = "Green House Mix Full (f) Vol. 1";
    expect(classify(name, "dave", NO_WORLD_RULES)).toBe("mmc");
    expect(classify(name, "dave", { priveNamePatterns: [/house\s+mix/i] })).toBe("prive");
  });

  it("zonder regels-argument vangt regel 3 niets", () => {
    const playlist: ClassifiableWorldPlaylist = {
      name: "Green House Mix Full (f) Vol. 1",
      ownerBucket: "dave",
      parsed: parsePlaylistName("Green House Mix Full (f) Vol. 1"),
    };
    expect(classifyWorld(playlist)).toBe("mmc");
  });
});

describe("classifyWorld -- regel 4: PRIVE_TYPE_LABELS -> Privé, ook met kleur", () => {
  it("zet 'Top 100' naar Privé ondanks een kleur (playlist 112)", () => {
    expect(classify("Cyan Full (f) 🧊 Top 100")).toBe("prive");
  });

  it("zet 'Classic Pop' naar Privé ondanks een kleur", () => {
    expect(classify("Cyan Full (f) 🧊 Classic Pop")).toBe("prive");
  });

  it("zet 'ALT' naar Privé ondanks een kleur", () => {
    expect(classify("Cyan Full (f) 🧊 ALT")).toBe("prive");
  });

  it("zet 'OST' naar Privé ondanks een kleur (bv. de OST-reeks, playlist 306)", () => {
    expect(classify("Blue Full | OST")).toBe("prive");
  });
});

describe("classifyWorld -- regel 3 (voorheen 5): privé-gelegenheden -> Privé, ongeacht kleur/typeLabel", () => {
  it("zet 'Christmas' naar Privé, ook met kleur én typeLabel (Music Mood)", () => {
    expect(classify("Cyan Music Mood Light (f) | Christmas")).toBe("prive");
  });

  it("zet 'Verjaardag' naar Privé, ook met kleur", () => {
    expect(classify("Cyan Light | Verjaardag  (slow)")).toBe("prive");
  });
});

describe("classifyWorld -- regel 6 (ONZEKER): artiest-in-de-titel-heuristiek", () => {
  it("zet een kleur-gecodeerde artiestennaam naar Privé i.p.v. MMC (playlist 353)", () => {
    expect(classify("Red Full (m) | Delta Heavy")).toBe("prive");
  });

  it("zet nog een kleur-gecodeerde artiestennaam naar Privé (EDM-emmer-familie)", () => {
    expect(classify("Rameses B | Green Light (f) | 176BPM EDM")).toBe("prive");
  });

  it("laat een NIET-artiest contextTag-restje MMC houden ('Music Mood' als restjestekst na een "
    + "gewonnen 'House Mix'-typeLabel, geen artiest -- heeft toevallig ook al een Vol.-nummer)", () => {
    expect(classify("NEW Deep House Mix | 112BPM | Green Music Mood (f) Vol. 1")).toBe("mmc");
  });

  it("een gevolgde, niet-eigen playlist triggert de artiest-heuristiek niet (ownerBucket 'other')", () => {
    expect(classify("Green Full (m) | Some Random Artist", "other")).toBe("prive");
  });
});

describe("classifyWorld -- regel 7 (nieuw/strikt, tweede bijstelling): alleen genummerde mixen -> MMC", () => {
  it("een House Mix MET Vol.-nummer is MMC", () => {
    expect(classify("House Mix 🟠 Orange Full (f) 🟠 Vol. X")).toBe("mmc");
  });

  it("een Drum & Bass MET Vol.-nummer is MMC (playlist-familie 'Drum & Bass Light Green Vol. 3')", () => {
    expect(classify("Drum & Bass 🟢 Green Light (f) 🟢 Vol. 3")).toBe("mmc");
  });

  it("een Drum & Bass Mix MET Vol.-nummer is MMC", () => {
    expect(classify("Drum & Bass Mix 🧊 Cyan Full (f) 🧊 Vol. 1")).toBe("mmc");
  });

  it("'Vol. X' (de werkbak van een nog niet gemaakte mix) telt ook als Vol.-nummer -> MMC", () => {
    expect(classify("Drum & Bass Mix 🟡 Yellow Full (m) 🟡 Vol. x")).toBe("mmc");
  });

  it("een Drum & Bass Mix ZONDER Vol.-nummer is nu Privé (geen genummerde mix)", () => {
    expect(classify("Drum & Bass Mix | 176BPM")).toBe("prive");
  });

  it("D&D is nu Privé (geen muziekgenre, geen genummerde mix -- was MMC vóór de tweede bijstelling)", () => {
    expect(classify("D&D (Fast) | L.GRIEF-Loud (1A)")).toBe("prive");
  });

  it("een kale EDM-emmer (kleur/BPM, geen mix-type, geen Vol.) is Privé (playlist-voorbeeld uit de opdracht)", () => {
    expect(classify("Green Full (m) 🟢 176BPM EDM")).toBe("prive");
  });

  it("een Music Mood-playlist (geen mix-type, geen Vol.) is Privé (playlist-voorbeeld uit de opdracht)", () => {
    expect(classify("Cyan Music Mood Full (f) | EDM 112BPM")).toBe("prive");
  });

  it("een kleur-gecodeerde playlist zonder mix-type-typeLabel is Privé, ook zonder contextTag", () => {
    expect(classify("Green Music Mood Full (f) Vol. 1")).toBe("prive");
  });
});

// DE NAAMVORM UIT DE MIX-BRON (2026-08-11). Dave neemt de playlistnamen letterlijk over uit
// `title_spotify` in djcylow-react, en die vorm noemt het genre niet meer bij naam: "House Mix 🟡 Yellow
// Full (m) 🟡 Vol. 1" wordt "EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1". Daarmee verschuift het typeLabel van
// "House Mix" naar "EDM-emmer", en zonder deze uitbreiding zakt élke gekoppelde MMC-playlist naar Privé --
// gemeten tegen de snapshot van die dag: 47 van de 48. Deze groep tests is die meting, vastgezet.
describe("classifyWorld -- regel 7: de naamvorm uit de mix-bron (EDM-emmer MET kleur én Vol.)", () => {
  it("houdt de hernoemde vorm in MMC waar de oude naam ook MMC was", () => {
    // Dezelfde playlist, voor en na het hernoemen -- beide MMC. Dit is het hele punt van de uitbreiding.
    expect(classify("House Mix 🟡 Yellow Full (m) 🟡 Vol. 1")).toBe("mmc");
    expect(classify("EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1")).toBe("mmc");
  });

  it("herkent de Drum & Bass-vorm, die na het hernoemen alleen nog '176BPM' zegt", () => {
    expect(classify("EDM 176BPM 🟣 Purple Light (f) 🟣 Vol. 9")).toBe("mmc");
  });

  // Deze playlist stond op 2026-08-11 al met de hand hernoemd in de snapshot, en was daardoor al ten
  // onrechte naar Privé gezakt. Hij is dus geen bedacht geval maar de aanleiding die het probleem
  // zichtbaar maakte.
  it("haalt de al-met-de-hand-hernoemde playlist terug uit Privé (echte snapshot-naam)", () => {
    expect(classify("EDM 128BPM 🟡 Yellow Light (m) 🟡 Vol. 7")).toBe("mmc");
  });

  // De hub schrijft deze vorm niet (normalizeSpotifyTitle haalt het staartje eraf), maar Dave hernoemt
  // ook met de hand -- en dan hoort een datum in de naam de playlist niet uit MMC te duwen. Vóór
  // `draagtWoorden` deed hij dat wél: de rest "20260303" werd door de artiest-heuristiek (regel 6) als
  // artiestnaam gelezen.
  it("laat een naam MET datumstaartje ook in MMC -- een datum is geen artiestnaam", () => {
    expect(classify("EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1 🟡 20260303")).toBe("mmc");
  });

  // Zelfde mechanisme, andere oorzaak: de 💠 uit de mix-bron kent de parser niet als kleur-emoji, dus
  // blijft hij als restjes-tekst achter. Ook dat is geen artiest. Deze test dekt het geval dat Dave een
  // Cyan-playlist met de hand hernoemt vóórdat de bron is rechtgezet.
  it("laat een naam met een onbekende emoji als restjes-tekst in MMC", () => {
    expect(classify("EDM 128BPM 💠 Cyan Light (f) 💠 Vol. 5")).toBe("mmc");
  });

  // De keerzijde, en de reden dat `draagtWoorden` op LETTERS toetst en niet op "is het leeg": een echte
  // artiestnaam in de pipe-staart moet nog steeds naar Privé leiden. Zonder deze test zou een te ruime
  // horde regel 6 stilletjes uitschakelen.
  it("stuurt een échte artiestnaam in de staart nog steeds naar Privé", () => {
    expect(classify("Red Full (m) | Delta Heavy")).toBe("prive");
  });

  // DE TWEE EISEN ZIJN WAT DE EMMERS BUITEN HOUDT. Een kale EDM-emmer draagt geen Vol.-nummer (dat is wat
  // hem een emmer maakt) en een BPM-tier-emmer geen kleur. Beide eisen hebben dus hun eigen test, want een
  // uitbreiding die er één van laat vallen zou Privé-playlists naar MMC trekken.
  it("laat een EDM-emmer ZONDER Vol.-nummer in Privé, ook mét kleur", () => {
    expect(classify("Green Full (m) 🟢 176BPM EDM")).toBe("prive");
  });

  it("laat een EDM-emmer ZONDER kleur in Privé, ook mét Vol.-nummer", () => {
    expect(classify("EDM 128BPM Vol. 3")).toBe("prive");
  });

  it("blijft de twee genre-families zonder kleur-eis toelaten -- die zijn uit zichzelf al specifiek", () => {
    expect(classify("House Mix Vol. 2")).toBe("mmc");
  });
});

describe("classifyWorld -- regel 8: alles overig -> Privé (de catch-all)", () => {
  it("een gevolgde, niet-eigen playlist zonder marker gaat naar Privé (playlist 9)", () => {
    expect(classify("Disco Balls ", "other")).toBe("prive");
  });

  it("een eigen playlist zonder herkend patroon gaat naar Privé", () => {
    expect(classify("Willekeurige naam zonder structuur")).toBe("prive");
  });

  it("een gevolgde playlist met toevallig een herkende kleur gaat tóch naar Privé, niet MMC "
    + "(niet Dave's eigen collectie -- ander voorbeeld dan de 'Happy Lofi Beats'-uitzondering, playlist 11)", () => {
    expect(classify("Some Random Playlist | Cyan Music Mood (f) Vol. 1", "other")).toBe("prive");
  });
});

describe("classifyWorld -- elke playlist krijgt precies één wereld", () => {
  it("geeft altijd een geldige SpotifyWorld terug, nooit null/undefined", () => {
    const cases = ["", "Iets zonder enige herkenbare structuur", "🔥🔥🔥"];
    for (const name of cases) {
      const world = classify(name);
      expect(SPOTIFY_WORLDS).toContain(world);
    }
  });
});

describe("WORLD_META", () => {
  it("heeft voor elke wereld een label, emoji, omschrijving en route", () => {
    for (const world of SPOTIFY_WORLDS) {
      const meta = WORLD_META[world];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.emoji.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.href.startsWith("/spotify")).toBe(true);
    }
  });
});
