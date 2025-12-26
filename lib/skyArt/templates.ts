/**
 * Sky Art Templates - Predefined SVG paths for GPS art
 * Each template is a SINGLE CONTINUOUS line drawing optimized for flight paths
 * No disconnected strokes - everything can be flown without "turning off the transponder"
 */

export interface SkyArtTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** SVG path data (d attribute) - must be a single continuous path */
  path: string;
  /** Suggested width in NM for best appearance */
  suggestedWidthNM: number;
  /** Category for grouping */
  category: "holiday" | "symbol" | "nature" | "fun";
  /** Optional attribution for the original creator */
  attribution?: {
    creator: string;
    url?: string;
  };
}

export const skyArtTemplates: SkyArtTemplate[] = [
  // Holiday
  {
    id: "christmas-tree",
    name: "Christmas Tree",
    emoji: "🎄",
    description: "Christmas tree outline",
    // Continuous path: start at bottom left, go up through the tree layers, back down
    path: "M40 95 L40 85 L15 85 L50 45 L25 45 L50 10 L75 45 L50 45 L85 85 L60 85 L60 95 Z",
    suggestedWidthNM: 10,
    category: "holiday",
  },
  {
    id: "star",
    name: "Star",
    emoji: "⭐",
    description: "Five-pointed star",
    // Classic 5-point star drawn in one stroke
    path: "M50 5 L61 40 L97 40 L68 60 L79 95 L50 75 L21 95 L32 60 L3 40 L39 40 Z",
    suggestedWidthNM: 8,
    category: "holiday",
  },
  {
    id: "candy-cane",
    name: "Candy Cane",
    emoji: "🍬",
    description: "Classic candy cane shape",
    // J-shape with curved top
    path: "M65 95 L65 35 Q65 10 40 10 Q15 10 15 35",
    suggestedWidthNM: 6,
    category: "holiday",
  },
  {
    id: "bell",
    name: "Bell",
    emoji: "🔔",
    description: "Christmas bell",
    // Bell shape - continuous outline
    path: "M50 5 L50 15 Q25 15 20 50 L20 75 L10 75 L10 85 L90 85 L90 75 L80 75 L80 50 Q75 15 50 15 L50 5",
    suggestedWidthNM: 8,
    category: "holiday",
  },
  {
    id: "stocking",
    name: "Stocking",
    emoji: "🧦",
    description: "Christmas stocking",
    // Stocking shape
    path: "M30 5 L30 50 L20 60 Q10 70 20 85 L40 95 Q55 95 60 80 L70 50 L70 5 Z",
    suggestedWidthNM: 8,
    category: "holiday",
  },
  {
    id: "grinch",
    name: "Grinch",
    emoji: "💚",
    description: "The Grinch - from the real FlightRadar24 Christmas flight!",
    // Extracted from actual GPS art flight over Nova Scotia, Dec 2025
    // Starts at left foot (southernmost point), traces up the body
    path: "M71.2 94.7 L69.2 94.7 L71.2 91.7 L73.2 90.6 L76.6 89.5 L78.6 88.7 L78.2 87.2 L79.7 86.7 L79.9 85.3 L79.2 83.8 L78.0 81.7 L76.8 78.9 L75.9 76.6 L75.1 74.9 L73.9 72.3 L71.9 68.2 L70.2 64.7 L68.2 61.7 L66.3 57.6 L66.9 52.1 L69.1 47.5 L72.5 41.1 L74.1 37.6 L75.9 33.5 L74.6 32.1 L72.2 32.7 L70.2 33.2 L68.1 34.0 L70.3 39.2 L70.3 44.9 L68.3 49.0 L65.7 50.1 L63.8 49.3 L62.0 48.8 L60.8 49.2 L59.7 49.4 L60.0 50.4 L61.1 48.5 L62.4 47.7 L64.9 48.8 L65.2 47.3 L64.6 46.2 L66.7 47.9 L68.7 45.8 L67.5 44.7 L68.1 43.2 L68.2 41.7 L64.8 36.6 L63.3 33.8 L66.6 30.9 L69.3 30.3 L71.2 29.6 L73.4 28.8 L75.6 27.5 L77.6 25.5 L76.6 23.9 L78.2 23.0 L81.0 23.0 L79.7 22.1 L78.6 20.7 L77.6 19.3 L76.9 17.3 L76.8 15.5 L77.5 13.8 L78.8 12.3 L80.5 12.4 L81.8 13.6 L82.6 15.1 L83.5 16.2 L84.9 15.9 L84.6 14.9 L83.8 14.2 L83.2 15.0 L83.7 14.8 L83.2 13.8 L81.9 13.2 L80.6 12.4 L79.8 11.3 L80.2 9.6 L81.5 8.3 L82.8 6.9 L83.5 5.2 L82.7 3.9 L82.1 2.4 L83.1 0.7 L85.0 0.0 L86.8 0.2 L88.5 1.2 L90.1 2.7 L91.8 3.8 L93.6 3.6 L94.9 4.7 L93.9 5.9 L92.6 5.9 L91.3 5.5 L89.9 4.9 L88.8 5.6 L89.1 7.6 L90.0 9.5 L90.2 12.1 L89.3 13.3 L88.3 14.0 L87.8 15.1 L88.2 14.7 L87.6 14.5 L86.9 15.7 L87.9 16.9 L88.8 15.4 L89.4 13.8 L90.4 12.6 L91.4 14.3 L93.2 20.7 L91.8 22.2 L90.5 23.7 L89.0 24.7 L87.7 25.3 L88.9 27.0 L90.7 26.5 L91.4 29.0 L90.0 28.7 L90.8 30.4 L92.1 33.2 L93.7 37.0 L97.5 46.8 L94.5 47.4 L92.5 47.7 L92.4 49.6 L93.6 50.7 L92.7 51.8 L92.8 54.0 L93.7 55.5 L95.0 55.5 L96.4 55.1 L97.4 54.6 L96.5 55.3 L95.6 56.0 L95.5 56.8 L96.8 56.9 L97.8 57.7 L98.9 58.7 L100.0 59.1 L99.3 58.4 L98.2 58.3 L97.0 58.2 L95.5 58.1 L94.1 58.0 L92.8 57.3 L92.0 55.7 L91.5 54.1 L90.8 52.3 L89.8 49.3 L90.1 47.1 L91.6 45.6 L92.9 42.5 L90.2 39.0 L88.3 41.1 L88.5 44.2 L89.0 47.5 L90.0 50.0 L90.8 52.4 L91.5 54.6 L92.3 56.8 L92.9 58.9 L92.4 60.8 L91.9 62.8 L91.3 64.6 L89.8 67.5 L88.7 69.7 L87.8 72.1 L87.4 74.1 L87.1 76.3 L86.6 78.3 L85.9 80.1 L85.3 82.0 L84.7 85.5 L86.2 86.1 L87.8 85.5 L87.6 87.0 L86.8 88.3 L88.3 89.1 L89.9 88.4 L91.6 88.7 L93.4 89.3 L95.3 90.0 L96.9 91.4 L96.5 92.9 L95.2 93.0 L93.8 92.8 L92.3 92.6 L90.8 92.4 L89.2 92.2 L87.2 91.9 L85.7 91.6 L84.0 91.4 L82.9 90.5 L82.7 88.7 L82.7 86.6 L82.9 84.6 L83.0 82.5 L83.1 80.6 L83.3 78.7 L83.2 76.8 L82.9 74.8 L82.5 73.2 L81.7 74.0 L81.3 75.9 L81.3 77.9 L81.4 80.0 L81.7 82.0 L82.0 84.1 L82.3 86.1 L82.6 88.2 L82.6 90.8 L81.4 91.6 L79.9 92.1 L78.3 92.6 L76.8 93.1 L71.7 94.6",
    suggestedWidthNM: 25,
    category: "holiday",
    attribution: {
      creator: "Dimitri Neonakis",
      url: "https://x.com/flightradar24/status/2001030274432237647",
    },
  },
  
  // Symbols
  {
    id: "heart",
    name: "Heart",
    emoji: "❤️",
    description: "Classic heart shape",
    // Heart drawn continuously
    path: "M50 90 Q15 60 15 35 Q15 10 35 10 Q50 10 50 30 Q50 10 65 10 Q85 10 85 35 Q85 60 50 90 Z",
    suggestedWidthNM: 10,
    category: "symbol",
  },
  {
    id: "infinity",
    name: "Infinity",
    emoji: "♾️",
    description: "Figure-eight infinity loop",
    // Figure 8 / infinity - one continuous loop
    path: "M50 50 Q30 20 15 35 Q0 50 15 65 Q30 80 50 50 Q70 20 85 35 Q100 50 85 65 Q70 80 50 50",
    suggestedWidthNM: 12,
    category: "symbol",
  },
  {
    id: "spiral",
    name: "Spiral",
    emoji: "🌀",
    description: "Expanding spiral",
    // Spiral from center outward
    path: "M50 50 Q55 45 60 50 Q65 60 50 65 Q35 65 35 50 Q35 30 55 30 Q80 30 80 55 Q80 80 50 80 Q15 80 15 50 Q15 15 55 15 Q95 15 95 55",
    suggestedWidthNM: 10,
    category: "symbol",
  },
  {
    id: "triangle",
    name: "Triangle",
    emoji: "🔺",
    description: "Simple triangle",
    path: "M50 10 L90 85 L10 85 Z",
    suggestedWidthNM: 8,
    category: "symbol",
  },
  {
    id: "diamond",
    name: "Diamond",
    emoji: "💎",
    description: "Diamond shape",
    path: "M50 5 L90 50 L50 95 L10 50 Z",
    suggestedWidthNM: 8,
    category: "symbol",
  },
  
  // Nature
  {
    id: "bird",
    name: "Bird",
    emoji: "🐦",
    description: "Flying bird silhouette",
    // Simple V-shaped bird
    path: "M5 40 Q25 20 50 40 Q75 20 95 40",
    suggestedWidthNM: 10,
    category: "nature",
  },
  {
    id: "fish",
    name: "Fish",
    emoji: "🐟",
    description: "Simple fish outline",
    // Fish body with tail - continuous
    path: "M95 50 L75 35 Q40 20 20 50 Q40 80 75 65 L95 50 L75 65 L75 35",
    suggestedWidthNM: 10,
    category: "nature",
  },
  {
    id: "moon",
    name: "Crescent Moon",
    emoji: "🌙",
    description: "Crescent moon shape",
    // Crescent - two arcs
    path: "M70 10 Q20 10 20 50 Q20 90 70 90 Q40 70 40 50 Q40 30 70 10",
    suggestedWidthNM: 8,
    category: "nature",
  },
  {
    id: "cloud",
    name: "Cloud",
    emoji: "☁️",
    description: "Fluffy cloud",
    path: "M20 60 Q5 60 10 45 Q10 30 30 30 Q35 15 55 20 Q75 10 85 30 Q100 35 95 50 Q100 65 80 65 Z",
    suggestedWidthNM: 12,
    category: "nature",
  },
  {
    id: "leaf",
    name: "Leaf",
    emoji: "🍃",
    description: "Simple leaf shape",
    path: "M50 95 Q20 70 20 40 Q20 10 50 5 Q80 10 80 40 Q80 70 50 95 L50 50",
    suggestedWidthNM: 8,
    category: "nature",
  },
  
  // Fun
  {
    id: "lightning",
    name: "Lightning",
    emoji: "⚡",
    description: "Lightning bolt",
    // Zigzag lightning bolt
    path: "M55 5 L30 45 L50 45 L25 95 L75 50 L55 50 L80 5 Z",
    suggestedWidthNM: 6,
    category: "fun",
  },
  {
    id: "arrow",
    name: "Arrow",
    emoji: "➡️",
    description: "Pointing arrow",
    path: "M5 50 L70 50 L70 30 L95 50 L70 70 L70 50",
    suggestedWidthNM: 10,
    category: "fun",
  },
  {
    id: "house",
    name: "House",
    emoji: "🏠",
    description: "Simple house outline",
    // House with roof - continuous path
    path: "M10 50 L10 90 L90 90 L90 50 L50 15 L10 50 L90 50",
    suggestedWidthNM: 10,
    category: "fun",
  },
  {
    id: "mountain",
    name: "Mountain",
    emoji: "⛰️",
    description: "Mountain peaks",
    path: "M5 85 L30 30 L45 50 L65 20 L95 85 Z",
    suggestedWidthNM: 12,
    category: "fun",
  },
  {
    id: "wave",
    name: "Wave",
    emoji: "🌊",
    description: "Ocean wave",
    path: "M5 50 Q20 20 35 50 Q50 80 65 50 Q80 20 95 50",
    suggestedWidthNM: 12,
    category: "fun",
  },
];

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): SkyArtTemplate | undefined {
  return skyArtTemplates.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: SkyArtTemplate["category"]): SkyArtTemplate[] {
  return skyArtTemplates.filter(t => t.category === category);
}

/**
 * Get all categories with their templates
 */
export function getTemplateCategories(): { category: SkyArtTemplate["category"]; label: string; templates: SkyArtTemplate[] }[] {
  return [
    { category: "holiday", label: "Holiday", templates: getTemplatesByCategory("holiday") },
    { category: "symbol", label: "Symbols", templates: getTemplatesByCategory("symbol") },
    { category: "nature", label: "Nature", templates: getTemplatesByCategory("nature") },
    { category: "fun", label: "Fun", templates: getTemplatesByCategory("fun") },
  ];
}
