import type { CSSProperties } from "react";
import type { BrandTheme, PublicCompany } from "./types";

const DEFAULT_BRAND = "#0ea5e9";
const DEFAULT_ACCENT = "#6366f1";

// Normaliza para um hex de 6 dígitos válido; cai no fallback se a cor for inválida.
// Evita que uma cor malformada (ex.: "#00000") quebre estilos que a utilizam.
export function normalizeHex(value: string | null | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const hex = (value.startsWith("#") ? value : `#${value}`).trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/.exec(hex);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : fallback;
}

// Texto legível (claro/escuro) sobre uma cor sólida, via luminância relativa.
export function readableTextOn(hex: string): string {
  const c = hex.slice(1);
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0f172a" : "#ffffff";
}

export function getBrandTheme(company: Pick<PublicCompany, "brand_color" | "brand_accent">): BrandTheme {
  const brand = normalizeHex(company.brand_color, DEFAULT_BRAND);
  const accent = normalizeHex(company.brand_accent, DEFAULT_ACCENT);
  return {
    brand,
    accent,
    onBrand: readableTextOn(brand),
    onAccent: readableTextOn(accent),
  };
}

export function getHeroStyle(company: PublicCompany, theme: BrandTheme): CSSProperties {
  if (company.cover_url) {
    return {
      backgroundImage: `url("${company.cover_url}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { backgroundColor: theme.brand };
}
