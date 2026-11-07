// scanMusicFolder (#144): recursief, alleen audiobestanden, en alleen lezen.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { isAudioFile, scanMusicFolder } from "./scanMusicFolder";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dkj-music-library-scan-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function touch(relative: string) {
  const full = path.join(tempDir, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, "");
}

describe("isAudioFile", () => {
  it("herkent de audio-extensies, ongeacht hoofdletters", () => {
    expect(isAudioFile("a.mp3")).toBe(true);
    expect(isAudioFile("a.FLAC")).toBe(true);
    expect(isAudioFile("a.aiff")).toBe(true);
    expect(isAudioFile("a.m4a")).toBe(true);
    expect(isAudioFile("a.wav")).toBe(true);
    expect(isAudioFile("cover.jpg")).toBe(false);
    expect(isAudioFile("collection.xml")).toBe(false);
  });
});

describe("scanMusicFolder", () => {
  it("vindt audiobestanden in submappen en slaat de rest over", () => {
    touch("House/Abel Ramos - Higher (David Penn Remix).mp3");
    touch("House/Deep/Jaded - Can You Feel It (Luttrell Remix).FLAC");
    touch("House/cover.jpg");
    touch("rekordbox.xml");
    const result = scanMusicFolder(tempDir);
    expect(result).toEqual({
      files: [
        { name: "Abel Ramos - Higher (David Penn Remix)", relativePath: "House/Abel Ramos - Higher (David Penn Remix).mp3" },
        { name: "Jaded - Can You Feel It (Luttrell Remix)", relativePath: "House/Deep/Jaded - Can You Feel It (Luttrell Remix).FLAC" },
      ],
    });
  });

  it("verandert niets aan de map", () => {
    touch("a/Track.mp3");
    const before = fs.readdirSync(tempDir, { recursive: true }).sort();
    scanMusicFolder(tempDir);
    expect(fs.readdirSync(tempDir, { recursive: true }).sort()).toEqual(before);
  });

  it("meldt een map die niet bestaat", () => {
    const result = scanMusicFolder(path.join(tempDir, "weg"));
    expect("error" in result && result.error).toMatch(/niet gevonden/);
  });

  it("meldt een pad dat een bestand is", () => {
    touch("los.mp3");
    const result = scanMusicFolder(path.join(tempDir, "los.mp3"));
    expect("error" in result && result.error).toMatch(/geen map/);
  });
});
