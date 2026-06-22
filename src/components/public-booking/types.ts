export type PublicCompany = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  brand_color: string | null;
  brand_accent: string | null;
  cover_url: string | null;
  tagline: string | null;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price_cents: number;
  commission_pct: number | null;
  active: boolean;
};

export type PublicProfessional = {
  id: string;
  name: string;
  color: string;
  commission_pct: number | null;
  active: boolean;
};

export type BrandTheme = {
  brand: string;
  accent: string;
  gradient: string;
};

export type TimeSlot = {
  date: Date;
  timeLabel: string;
  iso: string;
};

export type SlotsByDay = {
  key: string;
  label: string;
  slots: TimeSlot[];
};
