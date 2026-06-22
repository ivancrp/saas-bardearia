export type Palette = {
  id: string;
  name: string;
  brand: string;
  accent: string;
};

export const PALETTES: Palette[] = [
  { id: "ocean", name: "Ocean", brand: "#0ea5e9", accent: "#6366f1" },
  { id: "midnight", name: "Midnight", brand: "#4f46e5", accent: "#a855f7" },
  { id: "ember", name: "Ember", brand: "#e85d3a", accent: "#f59e0b" },
  { id: "noir", name: "Noir Gold", brand: "#c9a84c", accent: "#1a1a1a" },
  { id: "emerald", name: "Emerald", brand: "#10b981", accent: "#065f46" },
  { id: "rose", name: "Rose", brand: "#e11d48", accent: "#9b72cf" },
  { id: "slate", name: "Slate", brand: "#475569", accent: "#0f172a" },
  { id: "sunset", name: "Sunset", brand: "#f97316", accent: "#e84393" },
];
