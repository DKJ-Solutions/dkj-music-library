// @vitest-environment jsdom
// MissingMixes.tsx: de tweede tabel onder de playlist-manager -- mixen uit de DJ Cylow-bron zonder
// eigen Spotify-playlist. Presentatie-only, dus hier alleen wat de component zelf beslist: wanneer hij
// niets rendert, en de deduplicatie van het dichtheid/geslacht-staartje.
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MissingMixes } from "./MissingMixes";
import type { MissingMix } from "@/lib/mixes/playlistMixInfo";

function makeMissing(over: Partial<MissingMix> = {}): MissingMix {
  return {
    mixId: "20240408",
    title: "Blue Full (f)",
    color: "Blue",
    density: "Full",
    gender: "f",
    volume: 2,
    genre: "Drum & Bass",
    subgenre: "Liquid Drum & Bass",
    bpm: 176,
    trackCount: 42,
    reason: "bucket-only",
    bucketName: "Blue Full (f) 🔵 176BPM EDM",
    claimedBy: null,
    ...over,
  };
}

const rijen = () => Array.from(document.querySelectorAll(".missing-row"));

describe("MissingMixes", () => {
  it("rendert niets als er geen mixen ontbreken -- dan is er niets te melden", () => {
    const { container } = render(<MissingMixes mixes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("toont het aantal in de kop en een rij per mix", () => {
    render(<MissingMixes mixes={[makeMissing({ mixId: "1" }), makeMissing({ mixId: "2" })]} />);
    expect(screen.getByText("Ontbreekt op Spotify")).toBeInTheDocument();
    expect(document.querySelector(".missing-count")?.textContent).toBe("2");
    expect(rijen()).toHaveLength(2);
  });

  // De kolomvolgorde is die van de hoofdtabel, met alleen de kolommen die voor een mix bestaan. Op
  // /spotify/musicmoodcolours (waar de hoofdtabel WERELD en TYPE verbergt) lijnen de twee daardoor uit --
  // deze test legt die orde vast, zodat ze niet stil uit elkaar lopen.
  it("houdt dezelfde kolomvolgorde als de hoofdtabel", () => {
    render(<MissingMixes mixes={[makeMissing()]} />);
    // Op `.col-head-label` en niet op elke span: sinds de koppen sorteerknoppen zijn staat er bij de
    // actieve kolom ook een pijl-span in de knop.
    expect(
      Array.from(document.querySelectorAll(".missing-heads .col-head-label")).map((el) => el.textContent)
    ).toEqual([
      "BPM",
      "Mix",
      "Kleur",
      "ID",
      "Genre",
      "Subgenre",
      "Dicht.",
      "M/V",
      "Vol",
      "Tr.",
      "!",
    ]);
  });

  it("toont dichtheid, geslacht en de échte BPM als eigen kolommen", () => {
    render(<MissingMixes mixes={[makeMissing({ density: "Light", gender: "m", bpm: 176 })]} />);
    expect(document.querySelector(".missing-bpm")?.textContent).toBe("176");
    expect(document.querySelector(".missing-density")?.textContent).toBe("Light");
    expect(document.querySelector(".missing-gender")?.textContent).toBe("m");
  });

  it("markeert alleen de niet-teruggevonden mix, met de reden in tooltip en aria-label", () => {
    render(
      <MissingMixes
        mixes={[
          makeMissing({ mixId: "1", reason: "bucket-only", bucketName: "Blue Full (f) 🔵 176BPM EDM" }),
          makeMissing({ mixId: "2", reason: "unmatched", bucketName: null }),
        ]}
      />
    );
    const vlaggen = Array.from(document.querySelectorAll(".missing-flag"));
    // "Alleen in een emmer" is de normale werkvoorraad -- alleen een puntje; de uitzondering krijgt ✗.
    expect(vlaggen.map((el) => el.textContent)).toEqual(["·", "✗"]);
    expect(vlaggen[0].getAttribute("title")).toContain("Blue Full (f) 🔵 176BPM EDM");
    expect(vlaggen[1].getAttribute("title")).toContain("Niet teruggevonden");
    // De reden blijft leesbaar voor een schermlezer, ook al is de cel maar één teken.
    expect(vlaggen.map((el) => el.getAttribute("aria-label"))).toEqual([
      "alleen in een emmer",
      "niet teruggevonden",
    ]);
    // En staat als data-attribuut op de rij, zodat de CSS de uitzondering kan laten opvallen.
    expect(rijen().map((el) => el.getAttribute("data-reason"))).toEqual(["bucket-only", "unmatched"]);
  });

  // De derde reden (2026-07-25): de best passende playlist draagt de `mix:`-tag van een ándere bestaande
  // mix, dus die playlist is niet van deze mix. Zonder deze rij zou zo'n mix uit béide tabellen
  // verdwijnen -- zie missingReasonOf in playlistMixInfo.ts.
  it("markeert een mix wiens playlist door een andere mix geclaimd is", () => {
    render(
      <MissingMixes
        mixes={[
          makeMissing({
            mixId: "20260615",
            reason: "claimed-by-other-mix",
            bucketName: null,
            claimedBy: { mixId: "20240408", playlistName: "House Mix 🔴 Red Light (m) 🔴 Vol. 6" },
          }),
        ]}
      />
    );
    const vlag = document.querySelector(".missing-flag")!;
    expect(vlag.textContent).toBe("⇄");
    // De tooltip noemt wélke playlist en wélke mix hem claimt -- anders is de melding niet na te trekken.
    expect(vlag.getAttribute("title")).toContain("mix:20240408");
    expect(vlag.getAttribute("title")).toContain("House Mix 🔴 Red Light (m) 🔴 Vol. 6");
    expect(vlag.getAttribute("aria-label")).toBe("playlist is van een andere mix");
    expect(rijen()[0].getAttribute("data-reason")).toBe("claimed-by-other-mix");
  });

  it("valt terug op een algemene uitleg als de claimende mix onbekend is", () => {
    render(<MissingMixes mixes={[makeMissing({ reason: "claimed-by-other-mix", bucketName: null })]} />);
    expect(document.querySelector(".missing-flag")?.getAttribute("title")).toContain(
      "draagt de tag van een andere mix"
    );
  });

  // Dezelfde klik-cyclus als de hoofdtabel, want beide leunen op lib/sortRows.ts.
  describe("sorteren", () => {
    const drie = [
      makeMissing({ mixId: "3", title: "Gamma", bpm: 128, trackCount: 10 }),
      makeMissing({ mixId: "1", title: "Alfa", bpm: 176, trackCount: 30 }),
      makeMissing({ mixId: "2", title: "Beta", bpm: 112, trackCount: 20 }),
    ];
    const titels = () =>
      Array.from(document.querySelectorAll(".missing-title")).map((el) => el.textContent);

    it("houdt zonder sortering de bronordening aan (nieuwste mix eerst)", () => {
      render(<MissingMixes mixes={drie} />);
      expect(titels()).toEqual(["Gamma", "Alfa", "Beta"]);
    });

    it("sorteert alfabetisch, dan aflopend, dan terug naar de bronordening", () => {
      render(<MissingMixes mixes={drie} />);

      fireEvent.click(screen.getByRole("button", { name: "Sorteer op Mix" }));
      expect(titels()).toEqual(["Alfa", "Beta", "Gamma"]);

      fireEvent.click(screen.getByRole("button", { name: /Mix — nu gesorteerd oplopend/ }));
      expect(titels()).toEqual(["Gamma", "Beta", "Alfa"]);

      fireEvent.click(screen.getByRole("button", { name: /Mix — nu gesorteerd aflopend/ }));
      expect(titels()).toEqual(["Gamma", "Alfa", "Beta"]);
    });

    it("sorteert BPM numeriek, niet lexicografisch", () => {
      render(<MissingMixes mixes={drie} />);
      fireEvent.click(screen.getByRole("button", { name: "Sorteer op BPM" }));
      expect(
        Array.from(document.querySelectorAll(".missing-bpm")).map((el) => el.textContent)
      ).toEqual(["112", "128", "176"]);
    });

    it("zet bij de vlag-kolom de niet-teruggevonden mix bovenaan", () => {
      render(
        <MissingMixes
          mixes={[
            makeMissing({ mixId: "1", title: "In een emmer", reason: "bucket-only" }),
            makeMissing({ mixId: "2", title: "Nergens", reason: "unmatched", bucketName: null }),
          ]}
        />
      );
      // Het zichtbare label is "!", dus de knop heet naar zijn leesbare naam.
      fireEvent.click(screen.getByRole("button", { name: "Sorteer op Niet teruggevonden" }));
      expect(titels()).toEqual(["Nergens", "In een emmer"]);
    });

    it("zet de drie redenen op aflopende urgentie", () => {
      render(
        <MissingMixes
          mixes={[
            makeMissing({ mixId: "1", title: "In een emmer", reason: "bucket-only" }),
            makeMissing({
              mixId: "2",
              title: "Geclaimd",
              reason: "claimed-by-other-mix",
              bucketName: null,
            }),
            makeMissing({ mixId: "3", title: "Nergens", reason: "unmatched", bucketName: null }),
          ]}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "Sorteer op Niet teruggevonden" }));
      expect(titels()).toEqual(["Nergens", "Geclaimd", "In een emmer"]);
    });

    it("zet lege cellen onderaan, ook bij aflopend", () => {
      const metGat = [
        makeMissing({ mixId: "1", title: "Zonder genre", genre: null }),
        makeMissing({ mixId: "2", title: "House", genre: "House" }),
        makeMissing({ mixId: "3", title: "Techno", genre: "Techno" }),
      ];
      render(<MissingMixes mixes={metGat} />);

      fireEvent.click(screen.getByRole("button", { name: "Sorteer op Genre" }));
      expect(titels()).toEqual(["House", "Techno", "Zonder genre"]);

      fireEvent.click(screen.getByRole("button", { name: /Genre — nu gesorteerd oplopend/ }));
      expect(titels()).toEqual(["Techno", "House", "Zonder genre"]);
    });
  });

  it("verdraagt een mix zonder titel, kleur of Vol.-nummer", () => {
    render(
      <MissingMixes
        mixes={[makeMissing({ title: "", color: null, volume: null, genre: null, subgenre: null })]}
      />
    );
    expect(screen.getByText("(zonder titel)")).toBeInTheDocument();
    expect(document.querySelector(".swatch--neutral")).not.toBeNull();
    expect(document.querySelector(".missing-vol")?.textContent).toBe("—");
  });
});
