// Wist de lokale token-store (bv. na een verlopen refresh token, of gewoon om opnieuw te testen).
// Aangeroepen vanuit de status-pagina via een gewone <form method="POST">, dus geen JSON-body
// nodig.
import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/spotify/tokenStore";
import { sameOriginGuard } from "@/lib/http/sameOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = sameOriginGuard(request);
  if (guard) return guard;

  clearTokens();
  return NextResponse.redirect(new URL("/spotify", request.url));
}
