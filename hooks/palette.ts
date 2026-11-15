// La paleta de Tokyo Cyber Crab: UNA sola, para la app, el panel y la ciudad.
// La noche es la de Tokyo Night (azul violáceo, calma para leer) y encima van
// los neones de Neo-Córdoba. Todo color del mod sale de acá: si un tono se
// escribe a mano en otro archivo, el panel y la app dejan de parecer lo mismo.

export const P = {
  // ── La noche: superficies, de la más honda a la más alta ──
  void: '#0c0c14', // el cielo allá arriba, más negro que la página
  s0: '#14141f', // la página
  s1: '#181924', // tarjetas
  s2: '#1c1d2b', // paneles
  s3: '#1f2030', // menús
  line: '#2c2f48', // bordes quietos y pistas vacías

  // ── Las letras ──
  text: '#d5dcff', // 13:1 sobre la página
  dim: '#aab3dd', // lo ya hecho: se lee, pero no llama
  muted: '#8b93b8', // etiquetas y datos de apoyo; 6:1, el piso para texto
  faint: '#565f89', // SÓLO adorno (antenas, postes): no pasa contraste de texto

  // ── Los neones: cada uno dice una sola cosa ──
  magenta: '#ff4fd8', // la marca
  cyan: '#00e5ff', // lo que está vivo, en curso
  violet: '#c77dff', // acento de apoyo
  green: '#39ff9a', // salió bien
  yellow: '#ffd166', // ojo
  red: '#ff3d71', // falló
  redDeep: '#c2264f',

  // ── El cangrejo ──
  crab: '#ff9e64',
  crabLight: '#ffc79a',
  crabShade: '#d9703f',

  // ── La ciudad ──
  sunTop: '#ffd166',
  sunMid: '#ff9e64',
  sunLow: '#ff4fd8',
  dusk: '#2b1a4d', // el violeta del horizonte
  farBuilding: '#191a2a',
  midBuilding: '#1e2035',
  nearBuilding: '#252842',
} as const

export type PaletteColor = keyof typeof P
