// Grafika lika i opreme kao SVG slojevi na istoj mreži (viewBox 0 0 200 200).
// Svaki predmet je nacrtan točno na mjestu gdje sjeda na lik, pa se slojevi
// samo slažu jedan na drugi. Stil: ravni vektorski „sportaš-ratnik“.
// Datoteka nema ovisnosti o React Nativeu, pa se može koristiti i za pregled u pregledniku.

import type { Slot } from '../domain/items.ts';

export const VIEWBOX = '0 0 200 200';

const SKIN = '#C9926C';
const SKIN_SHADE = '#AD7653';
const HAIR = '#2B1D16';

/** Osnovni muški lik (odluka T4): majica bez rukava i kratke hlače. */
export const BASE_MALE = `
<ellipse cx="100" cy="196" rx="36" ry="4" fill="#000" opacity="0.35"/>
<path d="M88 134 L86 166 L86 187" stroke="${SKIN}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M112 134 L114 166 L114 187" stroke="${SKIN}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M86 160 L86 168" stroke="${SKIN_SHADE}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
<path d="M114 160 L114 168" stroke="${SKIN_SHADE}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
<ellipse cx="84" cy="192" rx="9" ry="4.5" fill="${SKIN_SHADE}"/>
<ellipse cx="116" cy="192" rx="9" ry="4.5" fill="${SKIN_SHADE}"/>
<path d="M72 64 L63 98 L59 127" stroke="${SKIN}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M128 64 L137 98 L141 127" stroke="${SKIN}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M67 80 L64 92" stroke="${SKIN_SHADE}" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
<path d="M133 80 L136 92" stroke="${SKIN_SHADE}" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
<circle cx="58" cy="131" r="6.5" fill="${SKIN}"/>
<circle cx="142" cy="131" r="6.5" fill="${SKIN}"/>
<rect x="93" y="42" width="14" height="16" rx="4" fill="${SKIN_SHADE}"/>
<path d="M74 58 Q100 52 126 58 L130 70 L123 114 L77 114 L70 70 Z" fill="#2E333D"/>
<path d="M86 56 Q100 64 114 56" stroke="${SKIN}" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M77 110 L123 110 L127 146 L104 146 L100 132 L96 146 L73 146 Z" fill="#23272F"/>
<ellipse cx="86" cy="32" rx="2.6" ry="4" fill="${SKIN_SHADE}"/>
<ellipse cx="114" cy="32" rx="2.6" ry="4" fill="${SKIN_SHADE}"/>
<ellipse cx="100" cy="30" rx="14" ry="17" fill="${SKIN}"/>
<path d="M86 27 Q85 11 100 11 Q115 11 114 27 Q110 19 100 19.5 Q90 19 86 27 Z" fill="${HAIR}"/>
<path d="M91.5 27.2 L97 26.4" stroke="${HAIR}" stroke-width="1.5" stroke-linecap="round"/>
<path d="M103 26.4 L108.5 27.2" stroke="${HAIR}" stroke-width="1.5" stroke-linecap="round"/>
<circle cx="94.5" cy="31" r="1.6" fill="#1B1B1B"/>
<circle cx="105.5" cy="31" r="1.6" fill="#1B1B1B"/>
<path d="M100 32 L99 36 L101 36" stroke="${SKIN_SHADE}" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M96 40 Q100 42 104 40" stroke="#7A4A33" stroke-width="1.4" fill="none" stroke-linecap="round"/>
`;

/** Ruka koja „drži“ predmet, crta se preko drške. */
const GRIP = `<circle cx="142" cy="131" r="6.5" fill="${SKIN}"/><path d="M137 129 L147 129" stroke="${SKIN_SHADE}" stroke-width="1" opacity="0.6"/>`;

export const ITEM_ART: Record<string, string> = {
  // Obuća · obična
  'trening-tenisice': `
<path d="M74 195 Q74 186 82 185.5 L89 185.5 Q95 186.5 95.5 192 L95.5 196 L74 196 Z" fill="#E8EAED"/>
<path d="M104.5 192 Q105 186.5 111 185.5 L118 185.5 Q126 186 126 195 L126 196 L104.5 196 Z" fill="#E8EAED"/>
<rect x="73.5" y="195" width="22.5" height="3" rx="1.2" fill="#9AA0A6"/>
<rect x="104" y="195" width="22.5" height="3" rx="1.2" fill="#9AA0A6"/>
<path d="M79 191.5 L90 189" stroke="#FF5A36" stroke-width="2" stroke-linecap="round"/>
<path d="M110 189 L121 191.5" stroke="#FF5A36" stroke-width="2" stroke-linecap="round"/>
<path d="M84 186.5 L88 186.5" stroke="#B8BDC4" stroke-width="1.2"/>
<path d="M112 186.5 L116 186.5" stroke="#B8BDC4" stroke-width="1.2"/>`,

  // Donji dio · obična
  'kompresijske-hlace': `
<path d="M88 132 L86 166 L86 187" stroke="#26324A" stroke-width="16.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M112 132 L114 166 L114 187" stroke="#26324A" stroke-width="16.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M76 108 L124 108 L128 148 L104 148 L100 134 L96 148 L72 148 Z" fill="#26324A"/>
<path d="M80 136 L78.6 166 L79 184" stroke="#9AA0A6" stroke-width="1.6" fill="none"/>
<path d="M120 136 L121.4 166 L121 184" stroke="#9AA0A6" stroke-width="1.6" fill="none"/>
<rect x="76" y="107" width="48" height="5" rx="2" fill="#1A2236"/>`,

  // Torzo · obična
  'trening-majica': `
<path d="M72 57 Q100 50 128 57 L140 80 L131 85 L127 76 L123 116 L77 116 L73 76 L69 85 L60 80 Z" fill="#3A3F4A"/>
<path d="M92 55 Q100 61 108 55" stroke="#262A32" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<path d="M75 74 L125 74" stroke="#FF5A36" stroke-width="3"/>
<path d="M60.5 80 L69 84.5" stroke="#262A32" stroke-width="1.5"/>
<path d="M139.5 80 L131 84.5" stroke="#262A32" stroke-width="1.5"/>
<path d="M95 86 L100 82 L105 86 L100 96 Z" fill="#FF5A36" opacity="0.9"/>`,

  // Glava · rijetka
  'ojacana-traka': `
<path d="M86.2 25 Q100 18.5 113.8 25 L114.2 29.5 Q100 23 85.8 29.5 Z" fill="#3B82F6"/>
<path d="M86.5 26.2 Q100 20 113.5 26.2" stroke="#93C5FD" stroke-width="0.8" fill="none" opacity="0.8"/>
<circle cx="93" cy="23.4" r="1.3" fill="#D6DEE8"/>
<circle cx="100" cy="22" r="1.3" fill="#D6DEE8"/>
<circle cx="107" cy="23.4" r="1.3" fill="#D6DEE8"/>
<path d="M113.5 27 L121 31.5 L117.5 34.5 Z" fill="#2F6BD0"/>
<path d="M113.5 28 L119 35 L115 36 Z" fill="#2459B5"/>`,

  // Predmet u ruci · obična
  'kozno-uze': `
<path d="M142 138 C162 150 165 180 148 185 C132 190 130 163 143 150 C150 143 158 150 156 160" stroke="#8B5A2B" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<rect x="138.5" y="120" width="7" height="20" rx="3" fill="#5C3A1E"/>
<rect x="138.5" y="120" width="7" height="3" rx="1.5" fill="#9AA0A6"/>
${GRIP}`,

  // Torzo · rijetka
  'prsluk-s-plocama': `
<path d="M74 57 Q100 51 126 57 L129 70 L124 116 L76 116 L71 70 Z" fill="#1E3A6E"/>
<ellipse cx="72.5" cy="63" rx="9" ry="6" fill="#8C96A6"/>
<ellipse cx="127.5" cy="63" rx="9" ry="6" fill="#8C96A6"/>
<path d="M66 61 Q72.5 57.5 79 61" stroke="#C9D1DC" stroke-width="1.2" fill="none"/>
<path d="M121 61 Q127.5 57.5 134 61" stroke="#C9D1DC" stroke-width="1.2" fill="none"/>
<rect x="80" y="64" width="18" height="21" rx="3" fill="#8C96A6"/>
<rect x="102" y="64" width="18" height="21" rx="3" fill="#8C96A6"/>
<rect x="80" y="88" width="40" height="9" rx="3" fill="#7A8494"/>
<rect x="80" y="99" width="40" height="9" rx="3" fill="#7A8494"/>
<path d="M82.5 66.5 L95.5 66.5" stroke="#C9D1DC" stroke-width="1.4"/>
<path d="M104.5 66.5 L117.5 66.5" stroke="#C9D1DC" stroke-width="1.4"/>
<circle cx="83" cy="82" r="1.2" fill="#3B82F6"/><circle cx="95" cy="82" r="1.2" fill="#3B82F6"/>
<circle cx="105" cy="82" r="1.2" fill="#3B82F6"/><circle cx="117" cy="82" r="1.2" fill="#3B82F6"/>
<path d="M85 55 L87 64" stroke="#3B82F6" stroke-width="4" stroke-linecap="round"/>
<path d="M115 55 L113 64" stroke="#3B82F6" stroke-width="4" stroke-linecap="round"/>
<rect x="76" y="110" width="48" height="5" rx="2" fill="#3B82F6"/>
<rect x="96" y="109" width="8" height="7" rx="1.5" fill="#D6DEE8"/>`,

  // Aura · epska
  'aura-zeravice': `
<defs>
  <radialGradient id="auraZeravice" cx="50%" cy="55%" r="50%">
    <stop offset="0%" stop-color="#A855F7" stop-opacity="0.55"/>
    <stop offset="55%" stop-color="#A855F7" stop-opacity="0.2"/>
    <stop offset="100%" stop-color="#A855F7" stop-opacity="0"/>
  </radialGradient>
</defs>
<ellipse cx="100" cy="104" rx="80" ry="98" fill="url(#auraZeravice)"/>
<circle cx="50" cy="150" r="2.2" fill="#FF8A3D"/>
<circle cx="150" cy="58" r="1.7" fill="#FF8A3D"/>
<circle cx="163" cy="140" r="2.4" fill="#FFB067"/>
<circle cx="38" cy="92" r="1.5" fill="#C084FC"/>
<circle cx="60" cy="40" r="1.9" fill="#FF8A3D"/>
<circle cx="140" cy="178" r="1.6" fill="#C084FC"/>
<circle cx="172" cy="98" r="1.7" fill="#FF8A3D"/>
<circle cx="30" cy="132" r="1.3" fill="#FFB067"/>
<circle cx="70" cy="18" r="1.2" fill="#C084FC"/>
<circle cx="132" cy="22" r="1.4" fill="#FFB067"/>`,

  // Predmet u ruci · legendarna
  'vucji-cekic': `
<g transform="translate(142 131) rotate(24)">
  <rect x="-2.6" y="-58" width="5.2" height="80" rx="2" fill="#6B4A2F"/>
  <path d="M-2.6 -40 L2.6 -36 M-2.6 -30 L2.6 -26 M-2.6 -20 L2.6 -16" stroke="#4A321F" stroke-width="1.2"/>
  <rect x="-3.5" y="18" width="7" height="8" rx="2" fill="#F5B301"/>
  <path d="M-21 -74 L21 -74 L24 -70 L24 -52 L21 -48 L-21 -48 L-24 -52 L-24 -70 Z" fill="#5E6672"/>
  <path d="M-21 -74 L21 -74 L24 -70 L-24 -70 Z" fill="#8C96A6"/>
  <rect x="-24" y="-66" width="48" height="3" fill="#F5B301"/>
  <rect x="-24" y="-56" width="48" height="3" fill="#F5B301"/>
  <path d="M-7 -66 L-4.5 -71.5 L-1.5 -66.5 L1.5 -66.5 L4.5 -71.5 L7 -66 L5.5 -57 L0 -52 L-5.5 -57 Z" fill="#F5B301"/>
  <circle cx="-2.6" cy="-62" r="0.9" fill="#2B1D16"/>
  <circle cx="2.6" cy="-62" r="0.9" fill="#2B1D16"/>
  <path d="M-1.5 -56.5 L0 -55 L1.5 -56.5" stroke="#2B1D16" stroke-width="0.8" fill="none"/>
</g>
${GRIP}`,
};

/** Redoslijed slojeva odozdo prema gore. */
export const LAYER_ORDER: (Slot | 'base')[] = ['aura', 'base', 'legs', 'feet', 'torso', 'head', 'hand'];

/** Sastavlja cijeli lik s opremljenim predmetima u jedan SVG. */
export function composeAvatarSvg(equipped: Partial<Record<Slot, string>>): string {
  const layers = LAYER_ORDER.map((layer) => {
    if (layer === 'base') return BASE_MALE;
    const itemId = equipped[layer];
    return itemId ? (ITEM_ART[itemId] ?? '') : '';
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}">${layers.join('')}</svg>`;
}

/** Dio lika u kojem se predmet vidi, za sličice u inventaru. */
const PREVIEW_BOX: Record<Slot, string> = {
  head: '72 6 56 40',
  torso: '52 46 96 76',
  legs: '60 100 80 100',
  feet: '66 176 68 26',
  hand: '108 40 92 150',
  aura: '0 0 200 200',
};

/** Sličica predmeta: blijedi lik u pozadini i predmet preko njega. */
export function composeItemPreviewSvg(itemId: string, slot: Slot): string {
  const art = ITEM_ART[itemId] ?? '';
  const base = `<g opacity="0.3">${BASE_MALE}</g>`;
  const body = slot === 'aura' ? `${art}${base}` : `${base}${art}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${PREVIEW_BOX[slot]}">${body}</svg>`;
}
