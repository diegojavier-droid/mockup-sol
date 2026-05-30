export type CategoryId = "peluqueria" | "maquillaje" | "unas";

export type Tag = "popular" | "combinado" | "tratamiento" | "color" | "evento";

export interface Category {
  id: CategoryId;
  name: string;
  tagline: string;
  emoji: string;
}

export interface Service {
  id: string;
  name: string;
  desc: string;
  duration: string;
  price: string;
  tag?: Tag;
}

export interface Extra {
  id: string;
  name: string;
  price: string;
}

export interface PersonalizationField {
  id: string;
  label: string;
  options: string[];
}

export interface MockDate {
  iso: string;
  label: string;
  weekday: string;
  day: string;
}

export type Personalization = Record<string, string>;
