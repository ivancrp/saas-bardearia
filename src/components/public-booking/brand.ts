import type { CSSProperties } from "react";
import type { BrandTheme, PublicCompany } from "./types";

const DEFAULT_BRAND = "#0ea5e9";
const DEFAULT_ACCENT = "#6366f1";

export function getBrandTheme(company: Pick<PublicCompany, "brand_color" | "brand_accent">): BrandTheme {
  const brand = company.brand_color || DEFAULT_BRAND;
  const accent = company.brand_accent || DEFAULT_ACCENT;
  return {
    brand,
    accent,
    gradient: `linear-gradient(135deg, ${brand}, ${accent})`,
  };
}

export function getHeroStyle(company: PublicCompany, theme: BrandTheme): CSSProperties {
  return {
    backgroundImage: company.cover_url
      ? `linear-gradient(135deg, ${theme.brand}cc, ${theme.accent}cc), url(${company.cover_url})`
      : theme.gradient,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
