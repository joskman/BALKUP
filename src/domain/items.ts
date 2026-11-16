// Oprema za prototip (8 predmeta, specifikacija Etape 0, poglavlje 6).
// Prava AI grafika (test H2) dodaje se kasnije kao PNG slojevi iste veličine;
// do tada se lik crta privremenim oblicima (vidi src/components/Avatar.tsx).

export type Slot = 'head' | 'torso' | 'legs' | 'feet' | 'hand' | 'aura';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ItemDef {
  id: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  unlockLevel: number;
}

export const ITEMS: ItemDef[] = [
  { id: 'trening-tenisice', name: 'Trening tenisice', slot: 'feet', rarity: 'common', unlockLevel: 2 },
  { id: 'kompresijske-hlace', name: 'Kompresijske hlače', slot: 'legs', rarity: 'common', unlockLevel: 3 },
  { id: 'trening-majica', name: 'Trening majica', slot: 'torso', rarity: 'common', unlockLevel: 4 },
  { id: 'ojacana-traka', name: 'Ojačana traka za glavu', slot: 'head', rarity: 'rare', unlockLevel: 5 },
  { id: 'kozno-uze', name: 'Kožno uže', slot: 'hand', rarity: 'common', unlockLevel: 6 },
  { id: 'prsluk-s-plocama', name: 'Prsluk s metalnim pločama', slot: 'torso', rarity: 'rare', unlockLevel: 8 },
  { id: 'aura-zeravice', name: 'Aura žeravice', slot: 'aura', rarity: 'epic', unlockLevel: 10 },
  { id: 'vucji-cekic', name: 'Vučji čekić', slot: 'hand', rarity: 'legendary', unlockLevel: 12 },
];

export const SLOT_LABELS: Record<Slot, string> = {
  head: 'Glava',
  torso: 'Torzo',
  legs: 'Donji dio',
  feet: 'Obuća',
  hand: 'Predmet u ruci',
  aura: 'Aura',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Obična',
  rare: 'Rijetka',
  epic: 'Epska',
  legendary: 'Legendarna',
};

export function itemById(id: string): ItemDef | undefined {
  return ITEMS.find((i) => i.id === id);
}

/** Predmeti koji su otključani na danom levelu. */
export function itemsUnlockedAt(level: number): ItemDef[] {
  return ITEMS.filter((i) => level >= i.unlockLevel);
}
