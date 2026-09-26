// De uitleg uit een mislukt antwoord van de eigen route-handlers halen, voor de client-kant.
//
// WAAROM (Dave, 2026-07-25). De interface toonde bij een mislukte schrijfactie één vaste verklaring
// ("staat het inloggen nog op de oude, read-only rechten?"). Bij 48 mislukte pogingen was dat de
// verkeerde, terwijl het antwoord van de route de juiste al bevatte -- Spotify's eigen
// *"The user is not registered for this application."*. Een vaste tekst kan niet weten wat er misging;
// het antwoord wél. Dus lezen we het.
//
// De route-handlers antwoorden bij een fout consistent met `{ error: "<code>", message?: "<uitleg>" }`
// (zie bv. api/spotify/mix-tag). Deze functie haalt daar de leesbare kant uit.
//
// Pure module (op de fetch-Response na): geen fs, geen React -- vrij te gebruiken vanuit een
// 'use client'-bestand, en los te testen.

/** De leesbare uitleg uit een niet-ok respons, of `null` als er niets bruikbaars in staat.
 *
 *  Gooit nooit: een respons zonder body, met kapotte JSON of met een onverwachte vorm levert simpelweg
 *  `null` op. Een foutmelding die zélf een fout veroorzaakt is het laatste wat je wil op dit pad -- dan
 *  verdwijnt de oorspronkelijke mislukking uit het zicht. */
export async function readRouteErrorMessage(res: Response): Promise<string | null> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null) return null;

  const { message, error } = body as { message?: unknown; error?: unknown };
  if (typeof message === "string" && message.trim() !== "") return message.trim();
  // Zonder `message` is de foutcode nog altijd informatiever dan niets ("unknown_playlist" zegt genoeg).
  if (typeof error === "string" && error.trim() !== "") return error.trim();
  return null;
}
