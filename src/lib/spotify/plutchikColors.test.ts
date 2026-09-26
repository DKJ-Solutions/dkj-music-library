// plutchikColors.ts: de canonieke kleur -> emotie-mapping, 1-op-1 overgenomen uit de Plutchik-brain.
import { describe, expect, it } from "vitest";
import {
  PLUTCHIK_COLORS,
  PLUTCHIK_COLOR_EMOTIONS,
  colorToEmotion,
  isPlutchikColor,
} from "./plutchikColors";

describe("PLUTCHIK_COLOR_EMOTIONS", () => {
  it("bevat de acht kleuren met exact de emotie die de opdracht voorschrijft", () => {
    expect(PLUTCHIK_COLOR_EMOTIONS).toEqual({
      Cyan: "Vermaak",
      Green: "Dankbaar",
      Yellow: "Ambitieus",
      Orange: "Hoopvol",
      Red: "Bang",
      Magenta: "Geïrriteerd",
      Purple: "Verdrietig",
      Blue: "Onverschillig",
    });
  });

  it("heeft voor elke kleur in PLUTCHIK_COLORS een mapping", () => {
    for (const color of PLUTCHIK_COLORS) {
      expect(PLUTCHIK_COLOR_EMOTIONS[color]).toBeTypeOf("string");
    }
  });
});

describe("colorToEmotion", () => {
  it("geeft de juiste emotie per kleur", () => {
    expect(colorToEmotion("Cyan")).toBe("Vermaak");
    expect(colorToEmotion("Magenta")).toBe("Geïrriteerd");
  });

  it("geeft null terug zonder kleur", () => {
    expect(colorToEmotion(null)).toBeNull();
  });
});

describe("isPlutchikColor", () => {
  it("herkent een geldige kleur", () => {
    expect(isPlutchikColor("Green")).toBe(true);
  });

  it("verwerpt een onbekende waarde, waaronder Dave's eigen D&D-woord 'MAGENTA' (hoofdletters, geen koppeling met de kleur 'Magenta')", () => {
    expect(isPlutchikColor("GRIEF")).toBe(false);
    expect(isPlutchikColor("MAGENTA")).toBe(false);
    expect(isPlutchikColor("")).toBe(false);
  });
});
