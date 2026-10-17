import React, { createContext, useContext, useMemo } from "react";

/**
 * One small design system: soft tinted background, white rounded cards, ONE accent colour.
 * Contrast (checked by hand and by the axe scan): body text >= 7:1 on white, primary button text 8:1+.
 * Meaning is always text plus a symbol, never colour alone.
 */
export const colors = {
  bg: "#EEF3FA",
  card: "#FFFFFF",
  text: "#12202F",
  muted: "#44546A",
  line: "#C9D4E3",
  accent: "#0B4F9C",
  accentSoft: "#E1ECFA",
  onAccent: "#FFFFFF",
  warnBg: "#FDECE9",
  warnText: "#8A1C12",
  amberBg: "#FFF3D1",
  amberText: "#5C3D00",
  okBg: "#E2F4E8",
  okText: "#0F5129",
  neutralBg: "#E6ECF5",
  neutralText: "#2B3A4F",
  highlight: "#FFE08A"
};

export const radius = 16;
export const space = { xs: 6, sm: 10, md: 16, lg: 24 };

export interface Scale { mult: number }
const ScaleContext = createContext<Scale>({ mult: 1 });
export const ScaleProvider = ScaleContext.Provider;
export const useScale = () => useContext(ScaleContext).mult;

export const TEXT_SIZES = [
  { id: "normal", label: "Normal", mult: 1 },
  { id: "large", label: "Large", mult: 1.2 },
  { id: "xl", label: "Extra large", mult: 1.4 }
] as const;
export type TextSizeId = (typeof TEXT_SIZES)[number]["id"];

/** Base sizes (px). They are multiplied by the in-app Text size and, on web tests, by ?fontscale=. Android's own font scale applies on top. */
export const base = { body: 17, small: 15, h1: 26, h2: 22, button: 18, chip: 14 };

export function useFont() {
  const m = useScale();
  return useMemo(() => {
    const f = (n: number) => Math.round(n * m);
    const hm = Math.min(m, 1.5); // headings grow less so long words still fit a narrow phone
    const fh = (n: number) => Math.round(n * hm);
    return { body: f(base.body), small: f(base.small), h1: fh(base.h1), h2: fh(base.h2), button: f(base.button), chip: f(base.chip), line: (n: number) => Math.round(f(n) * 1.4) };
  }, [m]);
}
