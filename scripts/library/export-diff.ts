// Wat er in data/library/export/tracks.ndjson veranderd is sinds HEAD, als één regel JSON:
// { "summary": "2 tracks gewijzigd (dkj_rating 2)", "changed": 2, "added": 0, "removed": 0, "fields": {...} }.
// Gebruikt door publish-library.ps1 voor het changelog-item; de logica zit in src/lib/library/exportDiff.ts.
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { describeDiff, diffExports } from "@/lib/library/exportDiff";

const file = "data/library/export/tracks.ndjson";
const before = execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const after = fs.readFileSync(path.join(process.cwd(), file), "utf8");
const diff = diffExports(before, after);
console.log(JSON.stringify({ summary: describeDiff(diff), ...diff }));
