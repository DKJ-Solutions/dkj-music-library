import type { Metadata } from "next";
// De huisstijl eerst, ongewijzigd uit dkj-brandbook (house-style-v3), dan de eigen laag van de app
// erna -- die gebruikt house-tokens en herdefinieert er geen (#80).
import "@/styles/house/house-style.css";
import "@/styles/main.scss";
import SiteHeader from "@/components/SiteHeader";

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
  // data-theme-default: het eigen standaardthema van deze app, Roze (donker), zoals de huisstijl het
  // per repo vastlegt (#86), zolang de gebruiker zelf niets kiest. house-theme.js zet data-theme al in
  // <head>, vóór React hydrateert -- vandaar suppressHydrationWarning op <html>.
  return (
    <html lang="nl" data-theme-default="pink" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- synchroon in <head>, zodat het thema niet flitst */}
        <script src="/house-style/house-theme.js" />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
