// @vitest-environment jsdom
// TrackRegister.tsx: de tabel van /spotify/trackregister. Het filter zelf is getest in register.test.ts;
// hier wat de component beslist: bladeren per 100 rijen, en dat een filter terugspringt naar pagina 1.
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TrackRegister } from "./TrackRegister";
import type { RegisterRow } from "@/lib/library/register";

function row(n: number, over: Partial<RegisterRow> = {}): RegisterRow {
  return {
    id: `ART01-${String(n).padStart(3, "0")}`,
    title: `Nummer ${n}`,
    artistIds: ["ART01"],
    artistNames: ["Artiest"],
    artist: "Artiest",
    albumArtist: "Artiest",
    bpm: null,
    album: null,
    albumCandidates: [],
    file: `Artiest - Nummer ${n}`,
    groups: [],
    playlists: [],
    ...over,
  };
}

const bodyRows = () => document.querySelectorAll(".register-table tbody tr");

describe("TrackRegister", () => {
  const rows = [
    ...Array.from({ length: 149 }, (_, i) => row(i + 1)),
    row(150, { bpm: "176BPM", album: "Blue Full (m)" }),
  ];

  it("toont 100 rijen per pagina", () => {
    render(<TrackRegister rows={rows} artistCount={1} />);
    expect(bodyRows()).toHaveLength(100);
    fireEvent.click(screen.getByRole("button", { name: "Volgende" }));
    expect(bodyRows()).toHaveLength(50);
    expect(screen.getByText(/pagina 2 van 2/)).toBeTruthy();
  });

  it("filtert op dkj_bpm en springt terug naar pagina 1", () => {
    render(<TrackRegister rows={rows} artistCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Volgende" }));
    fireEvent.change(screen.getByLabelText(/dkj_bpm/), { target: { value: "176BPM" } });
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("Blue Full (m)")).toBeTruthy();
    expect(screen.getByText("1 van 150 nummers")).toBeTruthy();
  });

  it("toont één playlist als link, en meer dan één als menu", () => {
    const playlists = ["Een", "Twee", "Drie"].map((name, i) => ({ id: `p${i}`, name }));
    render(<TrackRegister rows={[row(1, { playlists: [playlists[0]] }), row(2, { playlists })]} artistCount={1} />);
    const single = screen.getByRole("link", { name: "Een" });
    expect(single.getAttribute("href")).toBe("https://open.spotify.com/playlist/p0");
    expect(single.getAttribute("target")).toBe("_blank");
    expect(screen.queryByRole("link", { name: "Drie" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /3 playlists/ }));
    expect(screen.getByRole("link", { name: "Drie" }).getAttribute("href")).toBe("https://open.spotify.com/playlist/p2");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("link", { name: "Drie" })).toBeNull();
  });

  it("kapt dkj_file af, met de volledige naam als tooltip", () => {
    const file = "Airdraw, Jo.E & Aaren - Bryde's Whale (New Ordinance Edit) (Extended Mix)";
    render(<TrackRegister rows={[row(1, { file })]} artistCount={1} />);
    expect(screen.getByTitle(file).className).toContain("register-oneline");
  });

  it("zet één artiest-ID als chip, en meer in een menu met de namen", () => {
    render(
      <TrackRegister
        rows={[
          row(1, { artistIds: ["AAA01"], artistNames: ["Aa"] }),
          row(2, { artistIds: ["CCC01", "DDD01", "EEE01"], artistNames: ["Cc", "Dd", "Ee"] }),
          row(3, { artistIds: ["FFF01", "GGG01"], artistNames: ["Ff", "Gg"] }),
        ]}
        artistCount={6}
      />
    );
    expect(screen.getByTitle("Aa").textContent).toBe("AAA01");
    expect(screen.getByRole("button", { name: /2 artists/ })).toBeTruthy();
    expect(screen.queryByText("EEE01")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /3 artists/ }));
    expect(screen.getByText("EEE01")).toBeTruthy();
    expect(screen.getByText("Ee")).toBeTruthy();
  });

  it("toont één groep als label en meer groepen als menu, en filtert op elk van de groepen", () => {
    render(
      <TrackRegister rows={[row(1, { groups: ["Prive"] }), row(2, { groups: ["MMC", "DJ CYLOW"] })]} artistCount={1} />
    );
    fireEvent.click(screen.getByRole("button", { name: /2 groups/ }));
    expect(screen.getByText("DJ CYLOW", { selector: ".register-menu-item" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/dkj_group/), { target: { value: "MMC" } });
    expect(screen.getByText("1 van 2 nummers")).toBeTruthy();
  });

  it("sorteert via de kopregel: oplopend, aflopend, en weer uit", () => {
    render(
      <TrackRegister
        rows={[row(1, { bpm: "112BPM" }), row(2), row(3, { bpm: "96BPM" })]}
        artistCount={1}
      />
    );
    const ids = () => Array.from(bodyRows(), (tr) => tr.querySelector(".register-id")?.textContent);
    const header = screen.getByRole("button", { name: /dkj_bpm/ });
    fireEvent.click(header);
    expect(ids()).toEqual(["ART01-003", "ART01-001", "ART01-002"]);
    expect(header.closest("th")?.getAttribute("aria-sort")).toBe("ascending");
    fireEvent.click(header);
    expect(ids()).toEqual(["ART01-001", "ART01-003", "ART01-002"]);
    fireEvent.click(header);
    expect(ids()).toEqual(["ART01-001", "ART01-002", "ART01-003"]);
    expect(header.closest("th")?.getAttribute("aria-sort")).toBe("none");
  });

  it("toont bij verschillende albums in de playlists een menu met de kandidaten", () => {
    const candidates = ["Green Full (f)", "Cyan Full (f)"];
    render(
      <TrackRegister
        rows={[row(1, { albumCandidates: candidates }), row(2, { album: "Green Full (f)", albumCandidates: candidates })]}
        artistCount={1}
      />
    );
    // Rij 2 heeft zelf een album gekozen: dan geen menu, alleen dat album.
    const toggles = screen.getAllByRole("button", { name: /2 albums/ });
    expect(toggles).toHaveLength(1);
    fireEvent.click(toggles[0]);
    const menu = document.querySelector(".register-menu-list");
    expect(Array.from(menu?.querySelectorAll(".register-menu-item") ?? [], (item) => item.textContent)).toEqual(candidates);
  });

  it("meldt het als niets past", () => {
    render(<TrackRegister rows={rows} artistCount={1} />);
    fireEvent.change(screen.getByLabelText(/dkj_album/), { target: { value: "Red Light (f)" } });
    expect(screen.getByText("Geen nummer gevonden met deze zoekterm en filters.")).toBeTruthy();
  });
});
