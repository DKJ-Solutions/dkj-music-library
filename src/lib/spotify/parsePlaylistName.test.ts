// parsePlaylistName.ts: tokenizer-parser die een Spotify-playlistnaam ontleedt in zijn losse
// dimensies. Deze tests dekken de tien herkende naamgevingsfamilies + de valkuilen die de
// fase-4-analyse tegen de echte 386 playlist-namen blootlegde (386 = alle playlists incl.
// gevolgde, niet-eigen; 375 is Dave's eigen subset daarvan, zie DAVE_SPOTIFY_USER_ID in
// enrichedPlaylists.ts): wisselende tokenvolgorde,
// dubbele/ontbrekende spaties, het kleur-emoji 1x of 2x, Vol.-varianten (met/zonder punt, X/x),
// ontbrekende dimensies (geen dichtheid/geslacht/emoji), en namen die in geen enkel patroon
// vallen. Alle voorbeeldnamen hieronder zijn 1-op-1 overgenomen uit de echte snapshot
// (data/spotify/snapshot.json, git-ignored) zodat de suite tegen echte, niet-verzonnen namen
// toetst.
import { describe, expect, it } from "vitest";
import { KNOWN_TYPE_LABELS, parsePlaylistName } from "./parsePlaylistName";

describe("House Mix-familie", () => {
  it("herkent kleur (emoji 2x), dichtheid, geslacht en 'Vol. X'", () => {
    const parsed = parsePlaylistName("House Mix 🟠 Orange Full (f) 🟠 Vol. X");
    expect(parsed).toMatchObject({
      typeLabel: "House Mix",
      color: "Orange",
      density: "Full",
      gender: "f",
      volume: "X",
      matched: true,
      contextTag: null,
    });
  });

  it("herkent een genummerd volume ('Vol. 5')", () => {
    const parsed = parsePlaylistName("House Mix 🧊 Cyan Light (f) 🧊 Vol. 5");
    expect(parsed.volume).toBe(5);
    expect(parsed.color).toBe("Cyan"); // let op: Cyan = 🧊, niet een cirkel-emoji
    expect(parsed.density).toBe("Light");
  });

  it("is robuust tegen een dubbel-gebruikte naam (House Mix ÉN Music Mood in dezelfde titel) --" +
    " House Mix wint (prioriteit), de rest belandt in contextTag, geen data gaat verloren", () => {
    const parsed = parsePlaylistName("NEW Deep House Mix | 112BPM | Green Music Mood (f) Vol. 1");
    expect(parsed.typeLabel).toBe("House Mix");
    expect(parsed.color).toBe("Green");
    expect(parsed.gender).toBe("f");
    expect(parsed.bpm).toBe(112);
    expect(parsed.volume).toBe(1);
    expect(parsed.density).toBeNull(); // geen Full/Light-woord in deze titel
    expect(parsed.matched).toBe(true);
    expect(parsed.contextTag).toContain("Music Mood");
  });
});

describe("Drum & Bass (Mix)-familie", () => {
  it("herkent zowel 'Drum & Bass Mix' als 'Drum & Bass' (zonder 'Mix') als dezelfde familie", () => {
    const withMix = parsePlaylistName("Drum & Bass Mix 🧊 Cyan Full (f) 🧊 Vol. X");
    const withoutMix = parsePlaylistName("Drum & Bass 🟢 Green Full (f) 🟢 Vol. X");

    expect(withMix.typeLabel).toBe("Drum & Bass (Mix)");
    expect(withoutMix.typeLabel).toBe("Drum & Bass (Mix)");
    expect(withMix.color).toBe("Cyan");
    expect(withoutMix.color).toBe("Green");
  });

  it("herkent 'Vol X' zonder punt en 'Vol. x' in kleine letters (beide -> 'X')", () => {
    expect(parsePlaylistName("Drum & Bass Mix 🟠 Orange Full (f) 🟠 Vol X").volume).toBe("X");
    expect(parsePlaylistName("Drum & Bass Mix 🟡 Yellow Full (m) 🟡 Vol. x").volume).toBe("X");
  });

  it("herkent Magenta via het ♦️-emoji (afwijkend van de cirkel-emoji's)", () => {
    const parsed = parsePlaylistName("Drum & Bass ♦️ Magenta Full (m) ♦️ Vol. X");
    expect(parsed.color).toBe("Magenta");
  });
});

describe("Phase/Feestzaal-familie", () => {
  it("herkent de phase-code en het jaartal, met een komma die verdwijnt (geen leeg restje)", () => {
    const parsed = parsePlaylistName("Phase 1, Feestzaal (2026)");
    expect(parsed).toMatchObject({
      typeLabel: "Phase/Feestzaal",
      phaseCode: "1",
      feestzaalYear: "2026",
      contextTag: null,
    });
  });

  it("herkent een phase-code met letter-suffix ('1A', '3D', ...)", () => {
    expect(parsePlaylistName("Phase 1A, Feestzaal (2026)").phaseCode).toBe("1A");
    expect(parsePlaylistName("Phase 3D, Feestzaal (2026)").phaseCode).toBe("3D");
  });

  it("laat de artiest/omschrijving in contextTag staan als er geen los 'Phase X' in de naam zit", () => {
    const parsed = parsePlaylistName("ALLES | Feestzaal (2026) | DJ Cylow");
    expect(parsed.typeLabel).toBe("Phase/Feestzaal");
    expect(parsed.phaseCode).toBeNull();
    expect(parsed.feestzaalYear).toBe("2026");
    expect(parsed.contextTag).toBe("ALLES | DJ Cylow");
  });
});

describe("Top 100 / Classic Pop / ALT / OST-families", () => {
  it("Top 100: kleur, dichtheid en geslacht, ook zonder spatie vóór het emoji", () => {
    const parsed = parsePlaylistName("Purple Light (f) 🟣Top 100");
    expect(parsed).toMatchObject({ typeLabel: "Top 100", color: "Purple", density: "Light", gender: "f" });
  });

  it("Classic Pop: herkent ook met het ♦️-emoji direct tegen het volgende woord aan", () => {
    const parsed = parsePlaylistName("Magenta Full (f) ♦️Classic Pop");
    expect(parsed).toMatchObject({ typeLabel: "Classic Pop", color: "Magenta", density: "Full" });
  });

  it("ALT: kleur + dichtheid + geslacht", () => {
    const parsed = parsePlaylistName("Blue Light (m) 🔵 ALT");
    expect(parsed).toMatchObject({ typeLabel: "ALT", color: "Blue", density: "Light", gender: "m" });
  });

  it("OST: geen geslacht in deze familie (moet gewoon null zijn, geen crash)", () => {
    const parsed = parsePlaylistName("Cyan Full | OST");
    expect(parsed).toMatchObject({ typeLabel: "OST", color: "Cyan", density: "Full", gender: null });
  });
});

describe("EDM-emmer- vs. Music Mood-familie (BPM + 'EDM', volgorde wisselt)", () => {
  it("Music Mood: 'Kleur Music Mood Dichtheid (gender) | EDM 112BPM' -- bpm eruit, geen EDM-emmer", () => {
    const parsed = parsePlaylistName("Cyan Music Mood Full (f) | EDM 112BPM");
    expect(parsed.typeLabel).toBe("Music Mood");
    expect(parsed.bpm).toBe(112);
    expect(parsed.contextTag).toBeNull(); // "EDM" is decoratie bij de bpm, geen vrije context
  });

  it("Music Mood: tokenvolgorde omgedraaid ('EDM 112BPM | Kleur Music Mood ...') geeft hetzelfde resultaat", () => {
    const parsed = parsePlaylistName("EDM 112BPM | Purple Music Mood Full (f)");
    expect(parsed.typeLabel).toBe("Music Mood");
    expect(parsed.color).toBe("Purple");
    expect(parsed.bpm).toBe(112);
  });

  it("Music Mood: een echte vrije context (geen EDM/bpm) blijft wél in contextTag staan", () => {
    expect(parsePlaylistName("Cyan Music Mood Light (f) | Christmas").contextTag).toBe("Christmas");
    expect(parsePlaylistName("Purple Music Mood Full (f) | Zondag Favorite").contextTag).toBe(
      "Zondag Favorite"
    );
  });

  it("EDM-emmer: bpm direct tegen 'EDM' aan (128BPM EDM, 176BPM EDM), zonder 'Music Mood'-frase", () => {
    const p128 = parsePlaylistName("Cyan Full (f) 🧊 128BPM EDM");
    const p176 = parsePlaylistName("Cyan Full (m) 🧊 176BPM EDM");
    expect(p128).toMatchObject({ typeLabel: "EDM-emmer", bpm: 128, color: "Cyan", density: "Full" });
    expect(p176).toMatchObject({ typeLabel: "EDM-emmer", bpm: 176, color: "Cyan", density: "Full" });
  });

  it("EDM-emmer: 112-tier met pipe-notatie ('Kleur Dichtheid (gender) | EDM 112BPM')", () => {
    const parsed = parsePlaylistName("Cyan Light (f) | EDM 112BPM");
    expect(parsed).toMatchObject({ typeLabel: "EDM-emmer", bpm: 112, color: "Cyan", density: "Light" });
  });

  it("is bestand tegen dubbele spaties tussen kleurwoord en dichtheid ('Yellow  Full')", () => {
    const parsed = parsePlaylistName("Yellow  Full (f) 🟡 128BPM EDM");
    expect(parsed).toMatchObject({ color: "Yellow", density: "Full" });
  });
});

describe("D&D-familie -- codeletter verbatim overnemen, niet herberekenen", () => {
  it("parseert speed/woord/hardheid/code uit 'D&D (Fast) | L.GRIEF-Loud (1A)'", () => {
    const parsed = parsePlaylistName("D&D (Fast) | L.GRIEF-Loud (1A)");
    expect(parsed).toMatchObject({
      typeLabel: "D&D",
      ddSpeed: "Fast",
      ddWord: "GRIEF",
      ddLoudness: "Loud",
      ddCode: "1A",
      color: null, // GRIEF/PEACE/... zijn Dave's eigen D&D-vocabulaire, geen Plutchik-kleur
    });
  });

  it("neemt een dubbelcijferige/lettercombinatie-code letterlijk over (bv. '8C', '5D')", () => {
    expect(parsePlaylistName("D&D (Fast) | L.MAGENTA-Loud (8C)").ddCode).toBe("8C");
    expect(parsePlaylistName("D&D (Slow) | L.AWE-Quiet (5D)").ddCode).toBe("5D");
  });

  it("het 8ste D&D-woord heet 'MAGENTA' maar wordt NIET gekoppeld aan de Plutchik-kleur Magenta", () => {
    const parsed = parsePlaylistName("D&D (Fast) | L.MAGENTA-Loud (8C)");
    expect(parsed.ddWord).toBe("MAGENTA");
    expect(parsed.color).toBeNull();
  });

  it("herkent zowel Fast als Slow", () => {
    expect(parsePlaylistName("D&D (Slow) | L.JOY-Quiet (3D)").ddSpeed).toBe("Slow");
    expect(parsePlaylistName("D&D (Fast) | L.JOY-Loud (3A)").ddSpeed).toBe("Fast");
  });
});

describe("Structureel maar zonder typeLabel-keyword (kleur-gecodeerde artiestenlijsten)", () => {
  it("'Red Full (m) | <Artiest>' heeft geen typeLabel-woord, maar telt wél als matched via de kleur", () => {
    const parsed = parsePlaylistName("Red Full (m) | Delta Heavy");
    expect(parsed.typeLabel).toBeNull();
    expect(parsed.color).toBe("Red");
    expect(parsed.matched).toBe(true);
    expect(parsed.contextTag).toBe("Delta Heavy");
  });

  it("een vrije pipe-staart met meerdere onherkende segmenten blijft intact als contextTag", () => {
    const parsed = parsePlaylistName("Green Light (f) |  DNB | Feestje | Love");
    expect(parsed.color).toBe("Green");
    expect(parsed.density).toBe("Light");
    expect(parsed.matched).toBe(true); // kleur herkend, geen familie-keyword
    expect(parsed.typeLabel).toBeNull();
    expect(parsed.contextTag).toBe("DNB | Feestje | Love");
  });
});

describe("Volledig onherkende namen (Dave's ~5 losse namen, owner-onafhankelijk)", () => {
  it("geeft matched=false en alle dimensies null voor een naam zonder kleur/typeLabel", () => {
    const parsed = parsePlaylistName("Feestje Buren");
    expect(parsed.matched).toBe(false);
    expect(parsed.typeLabel).toBeNull();
    expect(parsed.color).toBeNull();
    expect(parsed.contextTag).toBe("Feestje Buren");
  });

  it("bewaart de volledige naam in contextTag ipv. 'm te laten verdwijnen", () => {
    expect(parsePlaylistName("All Pop").contextTag).toBe("All Pop");
    expect(parsePlaylistName("Zondag Favorite").contextTag).toBe("Zondag Favorite");
    expect(parsePlaylistName("Dutch Pop | DJ Cylow").matched).toBe(false);
  });
});

describe("KNOWN_TYPE_LABELS", () => {
  it("bevat de tien families uit de opdracht, in prioriteitsvolgorde", () => {
    expect(KNOWN_TYPE_LABELS).toEqual([
      "House Mix",
      "Drum & Bass (Mix)",
      "Top 100",
      "Classic Pop",
      "ALT",
      "OST",
      "EDM-emmer",
      "Music Mood",
      "D&D",
      "Phase/Feestzaal",
    ]);
  });
});
