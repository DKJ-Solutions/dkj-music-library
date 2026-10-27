"use client";

// De instellingenknop van de DKJ-Solutions-huisstijl (#80): een ronde knop rechts in de site-header
// (SiteHeader.tsx) die een paneel met de twaalf thema's en een reset opent. Het gedrag zit helemaal in house-theme.js
// (public/house-style/, ongewijzigd uit dkj-brandbook) -- deze component geeft het script alleen een
// leeg element om in te tekenen. React rendert er zelf niets in, zodat het script en React elkaar
// niet in de weg zitten.
import { useEffect, useRef } from "react";

type DKJThemeApi = {
  settings: (el: HTMLElement, opts?: Record<string, string>) => HTMLElement | null;
};

export default function ThemeSettings() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const api = (window as unknown as { DKJTheme?: DKJThemeApi }).DKJTheme;
    if (ref.current && api) api.settings(ref.current);
  }, []);

  return <div ref={ref} id="settings" />;
}
