import type { Metadata } from "next";
// De huisstijl eerst, ongewijzigd uit dkj-brandbook (house-style-v3), dan de eigen laag van de app
// erna -- die gebruikt house-tokens en herdefinieert er geen (#80).
import "@/styles/house/house-style.css";
import "@/styles/main.scss";
import ThemeSettings from "@/components/ThemeSettings";

export const metadata: Metadata = {
  title: "dkj-music-library",
  description:
    "Lokale mirror van de muziekbibliotheek: de Spotify-playlists, en straks de desktop-bibliotheek.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // data-theme-light/-dark: het eigen standaardpaar van deze app (Petrol en Cyaan, het dichtst bij de
  // oude teal accentkleur), zolang de gebruiker zelf niets kiest. house-theme.js zet data-theme al in
  // <head>, vóór React hydrateert -- vandaar suppressHydrationWarning op <html>.
  return (
    <html lang="nl" data-theme-light="teal" data-theme-dark="cyan" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- synchroon in <head>, zodat het thema niet flitst */}
        <script src="/house-style/house-theme.js" />
      </head>
      <body>
        <ThemeSettings />
        {children}
      </body>
    </html>
  );
}
