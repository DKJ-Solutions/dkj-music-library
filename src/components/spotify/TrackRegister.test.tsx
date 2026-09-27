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
    dkjTitle: `Nummer ${n}`,
    groups: [],
    playlists: [],
    mixes: [],
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

  it("toont één mix als link naar djcylow.com, en meer dan één als menu", () => {
    const mixes = ["Een", "Twee"].map((name, i) => ({ slug: `red-light-m-edm-128bpm-2026061${i}`, name }));
    render(<TrackRegister rows={[row(1, { mixes: [mixes[0]] }), row(2, { mixes })]} artistCount={1} />);
    expect(screen.getByRole("link", { name: "Een" }).getAttribute("href")).toBe(
      "https://djcylow.com/luister/mix/red-light-m-edm-128bpm-20260610"
    );
    fireEvent.click(screen.getByRole("button", { name: /2 mixes/ }));
    expect(screen.getByRole("link", { name: "Twee" }).getAttribute("href")).toBe(
      "https://djcylow.com/luister/mix/red-light-m-edm-128bpm-20260611"
    );
  });

  it("kapt dkj_title af, met de volledige titel als tooltip, en toont dkj_file, dkj_artist, dkj_track_id en dkj_artist_id niet", () => {
    const dkjTitle = "Bryde's Whale (New Ordinance Edit) (Extended Mix)";
    const file = `Airdraw, Jo.E & Aaren - ${dkjTitle}`;
    render(<TrackRegister rows={[row(1, { dkjTitle, file })]} artistCount={1} />);
    expect(screen.getByTitle(dkjTitle).className).toContain("register-oneline");
    expect(screen.queryByTitle(file)).toBeNull();
    expect(screen.queryByRole("button", { name: /dkj_file/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^dkj_artist/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /dkj_track_id/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /dkj_artist_id/ })).toBeNull();
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
    const titles = () => Array.from(bodyRows(), (tr) => tr.querySelector(".register-title")?.textContent);
    const header = screen.getByRole("button", { name: /dkj_bpm/ });
    fireEvent.click(header);
    expect(titles()).toEqual(["Nummer 3", "Nummer 1", "Nummer 2"]);
    expect(header.closest("th")?.getAttribute("aria-sort")).toBe("ascending");
    fireEvent.click(header);
    expect(titles()).toEqual(["Nummer 1", "Nummer 3", "Nummer 2"]);
    fireEvent.click(header);
    expect(titles()).toEqual(["Nummer 1", "Nummer 2", "Nummer 3"]);
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
