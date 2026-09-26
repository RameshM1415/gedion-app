export interface EffectPreset {
  id: string;
  name: string;
  category: EffectCategory;
  cssFilter: string;
  previewGradient: string;
  tag?: string;
}

export type EffectCategory =
  | 'Viral'
  | '4K Cinema'
  | 'Snap Glow'
  | 'AI Neon'
  | 'Vintage';

export const EFFECT_CATEGORIES: EffectCategory[] = [
  'Viral',
  '4K Cinema',
  'Snap Glow',
  'AI Neon',
  'Vintage',
];

export const EFFECT_PRESETS: EffectPreset[] = [
  // 1. Viral (Instagram / TikTok Trending)
  {
    id: 'normal',
    name: 'Normal',
    category: 'Viral',
    cssFilter: 'none',
    previewGradient: 'from-zinc-700 to-zinc-900',
    tag: 'Original',
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    category: 'Viral',
    cssFilter: 'sepia(0.25) saturate(1.35) contrast(1.1) brightness(1.05)',
    previewGradient: 'from-amber-400 via-orange-500 to-yellow-600',
    tag: 'Hot',
  },
  {
    id: 'sunset_haze',
    name: 'Sunset Haze',
    category: 'Viral',
    cssFilter: 'contrast(1.15) saturate(1.4) hue-rotate(-15deg) brightness(1.02)',
    previewGradient: 'from-rose-500 via-orange-400 to-amber-500',
    tag: 'Trending',
  },
  {
    id: 'moody_teal',
    name: 'Moody Teal',
    category: 'Viral',
    cssFilter: 'contrast(1.22) saturate(1.35) hue-rotate(15deg)',
    previewGradient: 'from-teal-400 via-cyan-600 to-slate-800',
    tag: 'Popular',
  },
  {
    id: 'cali_dream',
    name: 'Cali Dream',
    category: 'Viral',
    cssFilter: 'sepia(0.18) contrast(1.08) saturate(1.3) brightness(1.05)',
    previewGradient: 'from-amber-300 via-orange-400 to-rose-400',
  },
  {
    id: 'bubblegum_pop',
    name: 'Bubblegum Pop',
    category: 'Viral',
    cssFilter: 'saturate(1.6) contrast(1.1) brightness(1.06) hue-rotate(320deg)',
    previewGradient: 'from-pink-400 via-rose-400 to-fuchsia-400',
  },
  {
    id: 'diamond_sparkle',
    name: 'Diamond Sparkle',
    category: 'Viral',
    cssFilter: 'brightness(1.18) contrast(1.1) saturate(1.3)',
    previewGradient: 'from-cyan-200 via-pink-200 to-indigo-300',
  },
  {
    id: 'velvet_peach',
    name: 'Velvet Peach',
    category: 'Viral',
    cssFilter: 'saturate(1.3) sepia(0.15) contrast(1.08) brightness(1.02)',
    previewGradient: 'from-orange-300 via-rose-300 to-amber-300',
  },

  // 2. 4K Cinema (Studio HDR, Film & Blockbuster)
  {
    id: 'clarity_4k',
    name: '4K Ultra Clarity',
    category: '4K Cinema',
    cssFilter: 'contrast(1.3) saturate(1.25) brightness(1.02)',
    previewGradient: 'from-sky-400 via-blue-500 to-indigo-600',
    tag: '4K HDR',
  },
  {
    id: 'hollywood_warm',
    name: 'Hollywood 35mm',
    category: '4K Cinema',
    cssFilter: 'sepia(0.2) contrast(1.2) saturate(1.25) brightness(1.02)',
    previewGradient: 'from-amber-600 via-stone-700 to-yellow-800',
    tag: 'Cinema',
  },
  {
    id: 'imax_deep',
    name: 'IMAX Deep Tone',
    category: '4K Cinema',
    cssFilter: 'contrast(1.35) saturate(1.15) brightness(0.98)',
    previewGradient: 'from-slate-800 via-blue-900 to-indigo-950',
  },
  {
    id: 'bleach_bypass',
    name: 'Bleach Bypass',
    category: '4K Cinema',
    cssFilter: 'contrast(1.45) saturate(0.65) brightness(1.04)',
    previewGradient: 'from-stone-600 via-zinc-700 to-neutral-800',
  },
  {
    id: 'technicolor_50s',
    name: 'Technicolor Cinema',
    category: '4K Cinema',
    cssFilter: 'saturate(1.6) contrast(1.25) brightness(1.05)',
    previewGradient: 'from-red-600 via-blue-600 to-yellow-500',
  },
  {
    id: 'denis_dune',
    name: 'Arrakis Sand',
    category: '4K Cinema',
    cssFilter: 'sepia(0.45) contrast(1.22) saturate(1.1) brightness(0.96)',
    previewGradient: 'from-amber-700 via-orange-800 to-yellow-900',
  },
  {
    id: 'noir_black',
    name: 'Noir Black',
    category: '4K Cinema',
    cssFilter: 'grayscale(1) contrast(1.4) brightness(0.95)',
    previewGradient: 'from-stone-800 via-zinc-900 to-black',
    tag: 'B&W',
  },

  // 3. Snap Glow (Snapchat Glam & Beauty)
  {
    id: 'soft_glam',
    name: 'Soft Glam',
    category: 'Snap Glow',
    cssFilter: 'brightness(1.12) contrast(1.05) saturate(1.2)',
    previewGradient: 'from-rose-300 via-amber-200 to-pink-300',
    tag: 'Glow',
  },
  {
    id: 'fairy_dust',
    name: 'Fairy Dust',
    category: 'Snap Glow',
    cssFilter: 'brightness(1.16) contrast(1.05) saturate(1.3) hue-rotate(330deg)',
    previewGradient: 'from-pink-300 via-purple-300 to-cyan-200',
    tag: 'Shimmer',
  },
  {
    id: 'rosy_cheeks',
    name: 'Rosy Cheeks',
    category: 'Snap Glow',
    cssFilter: 'saturate(1.35) contrast(1.04) brightness(1.08) hue-rotate(345deg)',
    previewGradient: 'from-rose-400 via-pink-400 to-red-300',
  },
  {
    id: 'butterfly_halo',
    name: 'Butterfly Halo',
    category: 'Snap Glow',
    cssFilter: 'brightness(1.12) contrast(1.08) saturate(1.35) hue-rotate(40deg)',
    previewGradient: 'from-yellow-300 via-amber-300 to-cyan-300',
  },
  {
    id: 'dewy_glass',
    name: 'Dewy Glass Skin',
    category: 'Snap Glow',
    cssFilter: 'brightness(1.14) contrast(1.02) saturate(1.15)',
    previewGradient: 'from-teal-100 via-sky-100 to-pink-100',
  },
  {
    id: 'kawaii_blush',
    name: 'Kawaii Blush',
    category: 'Snap Glow',
    cssFilter: 'saturate(1.45) brightness(1.1) contrast(1.02) hue-rotate(335deg)',
    previewGradient: 'from-rose-400 via-pink-300 to-rose-200',
  },
  {
    id: 'starry_eyed',
    name: 'Starry Eyed',
    category: 'Snap Glow',
    cssFilter: 'contrast(1.15) brightness(1.14) saturate(1.25)',
    previewGradient: 'from-indigo-300 via-purple-300 to-yellow-200',
  },

  // 4. AI Neon (Cyberpunk & Future AI)
  {
    id: 'cyber_glow',
    name: 'Cyber Glow',
    category: 'AI Neon',
    cssFilter: 'contrast(1.15) saturate(1.4) hue-rotate(15deg)',
    previewGradient: 'from-cyan-400 via-purple-500 to-pink-500',
    tag: 'Core',
  },
  {
    id: 'neon_dream',
    name: 'Neon Dream',
    category: 'AI Neon',
    cssFilter: 'contrast(1.25) saturate(1.6) hue-rotate(290deg) brightness(1.05)',
    previewGradient: 'from-fuchsia-500 via-purple-600 to-cyan-400',
    tag: 'AI',
  },
  {
    id: 'cyberpunk_2077',
    name: 'Cyberpunk 2077',
    category: 'AI Neon',
    cssFilter: 'contrast(1.35) saturate(1.6) hue-rotate(295deg)',
    previewGradient: 'from-yellow-400 via-fuchsia-600 to-cyan-500',
  },
  {
    id: 'hologram_cyan',
    name: 'Hologram Cyan',
    category: 'AI Neon',
    cssFilter: 'contrast(1.25) saturate(1.4) hue-rotate(170deg) brightness(1.08)',
    previewGradient: 'from-cyan-400 via-teal-500 to-blue-600',
  },
  {
    id: 'synthwave_80s',
    name: 'Synthwave 80s',
    category: 'AI Neon',
    cssFilter: 'contrast(1.3) saturate(1.5) hue-rotate(280deg)',
    previewGradient: 'from-purple-600 via-pink-500 to-amber-400',
  },
  {
    id: 'laser_violet',
    name: 'Laser Grid Violet',
    category: 'AI Neon',
    cssFilter: 'contrast(1.3) saturate(1.55) hue-rotate(260deg)',
    previewGradient: 'from-violet-600 via-indigo-600 to-fuchsia-700',
  },
  {
    id: 'matrix_core',
    name: 'Matrix Core',
    category: 'AI Neon',
    cssFilter: 'contrast(1.3) saturate(1.2) hue-rotate(90deg) brightness(0.96)',
    previewGradient: 'from-green-500 via-emerald-700 to-black',
  },

  // 5. Vintage (Retro, VHS & Film)
  {
    id: 'vhs_90s',
    name: 'VHS 90s',
    category: 'Vintage',
    cssFilter: 'contrast(1.2) saturate(1.3) hue-rotate(20deg) brightness(1.02)',
    previewGradient: 'from-cyan-600 via-purple-600 to-rose-600',
    tag: 'Tape',
  },
  {
    id: 'kodak_portra',
    name: 'Kodak Portra',
    category: 'Vintage',
    cssFilter: 'contrast(1.14) saturate(1.22) sepia(0.18) brightness(1.03)',
    previewGradient: 'from-amber-400 via-orange-400 to-stone-500',
    tag: '35mm',
  },
  {
    id: 'super_8mm',
    name: 'Super 8mm',
    category: 'Vintage',
    cssFilter: 'sepia(0.4) contrast(1.18) saturate(1.15) brightness(0.98)',
    previewGradient: 'from-orange-500 via-amber-600 to-yellow-800',
  },
  {
    id: 'polaroid_600',
    name: 'Polaroid 600',
    category: 'Vintage',
    cssFilter: 'contrast(1.08) brightness(1.06) saturate(1.12) sepia(0.15)',
    previewGradient: 'from-sky-300 via-stone-300 to-amber-200',
  },
  {
    id: 'disco_70s',
    name: '1970s Disco Haze',
    category: 'Vintage',
    cssFilter: 'sepia(0.28) contrast(1.15) saturate(1.35) hue-rotate(-10deg)',
    previewGradient: 'from-orange-500 via-amber-500 to-rose-500',
  },
  {
    id: 'vintage_90s_core',
    name: 'Vintage 90s',
    category: 'Vintage',
    cssFilter: 'sepia(0.35) contrast(1.1) brightness(0.95)',
    previewGradient: 'from-amber-600 via-yellow-700 to-stone-800',
  },
  {
    id: 'sepia_nostalgia',
    name: 'Sepia Classic',
    category: 'Vintage',
    cssFilter: 'sepia(0.8) contrast(1.15) brightness(0.95)',
    previewGradient: 'from-amber-700 via-yellow-800 to-stone-900',
  },
];
