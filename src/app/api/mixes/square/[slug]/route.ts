// De vierkante thumbnail van één mix, voor de cards op /mixen/published. De afbeeldingen wonen in
// `public/` van de zusterrepo djcylow-react (naast de mix-JSON's, zie mixStore.ts), die deze app niet zelf
// serveert -- vandaar deze route. De slug wordt opgezocht in de mix-data, dus er komt nooit een pad uit
// de URL op schijf terecht.
import fs from "fs";
import path from "path";
import { findMixBySlug } from "@/lib/mixes/mixPages";
import { mixSquareFile } from "@/lib/mixes/mixStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const file = mixSquareFile(findMixBySlug(slug)?.imageSquare ?? null);
  const contentType = file ? CONTENT_TYPES[path.extname(file).toLowerCase()] : undefined;
  if (!file || !contentType) return new Response(null, { status: 404 });

  return new Response(fs.readFileSync(file), {
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" },
  });
}
