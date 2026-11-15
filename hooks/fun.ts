// Ropa y frases del cangrejo. Para sumar más, agregá entradas acá.

import type { Mood } from '../types'
import type { Lang } from './i18n'
import { P } from './palette'

// ---------- Outfits ----------
// Cada outfit son capas de píxeles sobre la grilla del cangrejo (16 de ancho).
// Filas 0-2: zona de la cabeza entre las pinzas; 3: ojos; 4: pupilas; 5+: cuerpo.
// Valores negativos de dy suben por encima de la cabeza.

export type OutfitPart = { rows: string[]; dx?: number; dy: number }
export type Outfit = { name: Record<Lang, string>; parts: OutfitPart[] }

export const OUTFIT_PAL: Record<string, string> = {
  Y: P.yellow,
  y: '#ffe6a8', // el brillo del amarillo
  M: P.violet,
  C: P.cyan,
  W: '#ffffff',
  // Cuero y madera: lo único del vestuario que no es de neón.
  B: '#a0785a',
  b: '#7a5a40',
  G: P.void,
  g: P.muted,
  R: P.red,
  K: '#474c75', // gris azulado: auriculares y galera
  S: P.text, // plateado
  V: P.green,
}

export const OUTFITS: Outfit[] = [
  {
    name: { es: 'casco de obra', en: "a hard hat" },
    parts: [{ dy: 0, rows: ['......YYYY......', '.....YyYYYY.....', '....YYYYYYYY....'] }],
  },
  {
    name: { es: 'gorro de dormir', en: "a nightcap" },
    parts: [
      {
        dy: -1,
        rows: ['...........W....', '.......MMMMM....', '......MMMMMM....', '.....WWWWWW.....'],
      },
    ],
  },
  {
    name: { es: 'sombrero de gaucho', en: "a gaucho hat" },
    parts: [{ dy: 0, rows: ['......BBBB......', '......bbbb......', '...BBBBBBBBBB...'] }],
  },
  {
    name: { es: 'lentes de facha', en: "cool shades" },
    parts: [{ dy: 3, rows: ['...CCCCCCCCCC...', '....CGWCCGWC....', '.....CC..CC.....'] }],
  },
  {
    name: { es: 'gorrito de cumple', en: "a party hat" },
    parts: [
      {
        dy: -2,
        rows: [
          '........y.......',
          '.......MC.......',
          '.......CMC......',
          '......MCMCM.....',
          '......CMCMC.....',
        ],
      },
    ],
  },
  {
    name: { es: 'corona de rey', en: "a king's crown" },
    parts: [{ dy: 0, rows: ['.....Y.YY.Y.....', '.....YYYYYY.....', '.....YRYYRY.....'] }],
  },
  {
    name: { es: 'boina', en: "a beret" },
    parts: [{ dy: 0, rows: ['.......R........', '.....RRRRRR.....', '....RRRRRRRR....'] }],
  },
  {
    name: { es: 'vincha y mate', en: "a headband and a mate" },
    parts: [
      { dy: 2, rows: ['....CCCCCCCC....'] },
      { dx: 16, dy: 0, rows: ['.S.', '.S.', 'VVV', 'BBB', 'BBB', '.B.'] },
    ],
  },
  {
    name: { es: 'auris cuarteteros', en: "cuarteto headphones" },
    parts: [
      {
        dy: -1,
        rows: ['.....KKKKKK.....', '....K......K....', '....K......K....', '...MM......MM...'],
      },
    ],
  },
  {
    name: { es: 'bigote de galán', en: "a heartthrob's moustache" },
    parts: [{ dy: 5, rows: ['....bBBBBBBb....', '...b........b...'] }],
  },
  {
    name: { es: 'galera de mago', en: "a magician's top hat" },
    parts: [
      {
        dy: -3,
        rows: ['......KKKK......', '......KgKK......', '......KgKK......', '......RRRR......', '......KKKK......', '....KKKKKKKK....'],
      },
    ],
  },
  {
    name: { es: 'gorra para atrás', en: "a backwards cap" },
    parts: [{ dy: 1, rows: ['.....VVVVVV.....', '.....VVVVVVVV...'] }],
  },
]

export function outfitPixels(
  outfit: Outfit | undefined,
  pixels: (rows: string[], dx: number, dy: number, pal: Record<string, string>, px?: number) => string,
  px?: number,
): string {
  if (!outfit) return ''
  return outfit.parts.map(p => pixels(p.rows, p.dx ?? 0, p.dy, OUTFIT_PAL, px)).join('')
}

/** Un número estable a partir de un texto (para que cada subagente tenga su propia pilcha). */
export function hashIndex(text: string, n: number): number {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h) % n
}

// ---------- Frases cordobesas ----------

const QUIPS_ES: Record<Mood, string[]> = {
  working: [
    'Tranqui que esto sale más rápido que fernet en la previa.',
    'Estoy más ocupado que kiosquero de Nueva Córdoba un viernes a la noche.',
    'Qué hacé, culiau. Yo acá, laburando de costado como corresponde.',
    'Este código está más enredado que cable de parlante en un baile de cuarteto.',
    'Dale que va: un, dos, tres y adentro, como el cuarteto.',
    'Ando con más pinzas que ferretería de barrio.',
    'Despacito y con cariño, como el asado del domingo.',
    'Bancame un toque que leo el archivo... es re largo, ni te cuento.',
    'Si me ves quieto estoy pensando. Si me ves caminando, también.',
    'Me tomo un mate y sigo. ¿Querés uno? Va con yerba de la buena.',
    'Le pongo onda, le pongo tonada, le pongo tests.',
    'Esto lo resuelvo antes de que se enfríe el fernet.',
    'Me están dando más laburo que a un remisero en el centro un sábado.',
    'Caminando de costado se llega igual, ¿viste?',
    'Uy, mirá vo\'. Otro archivo. Más archivos que trámites en el Cabildo.',
    'Ni en pedo borro algo sin preguntarte, eh. Soy cangrejo, no kamikaze.',
    'Voy más concentrado que el que cuenta los vueltos en la feria.',
    'Paso a paso, como cuando subís al Cerro Uritorco.',
    'Busco el bug con más ganas que el último choripán de la cancha.',
    'Hackeando el mainframe. Bah, leyendo un archivo, pero suena mejor así.',
    'Esto tiene más vueltas que la pista en un baile de la Mona.',
    'Laburo con ritmo: tunga-tunga y a los tests.',
    'En Nueva Córdoba ya están en la previa y yo acá, compilando.',
    'En Neo-Córdoba el fernet viene con luces de neón y el código con tests.',
    'Modo cyber activado: mismas pinzas, más luces.',
    'Llueve en el Sector 7 y yo acá, meta teclear de costado.',
    'Si esto fuera una peli, ahora sonaría un sintetizador. Imaginátelo.',
    'Agarrate Catalina que vamo\' a refactorizar... no, mentira, cambio mínimo.',
  ],
  done: [
    '¡Listo el pollo, pelado el cangrejo!',
    '¡Qué lo parió! Salió a la primera.',
    'Terminé. Ahora sí, un fernecito con coca.',
    'Esto quedó más prolijo que peinado de abuela pa\' misa.',
    'Ta\' todo bien, ta\' todo bien... ¿no? Sí. Bah, creo.',
    'Aguante el fernet con coca y los tests en verde.',
    'Quedó joya, mi rey. Joya nunca taxi.',
    'Ya está, culiau. Me merezco un bailecito.',
    'Salió más redondo que alfajor de la terminal.',
    'Misión cumplida. Que prendan los fuegos artificiales en el Sector 7.',
    'Salió. Esto se festeja como baile de la Mona: hasta que salga el sol.',
    'Quedó afinado como acordeón de cuarteto.',
    'Compiló. En esta ciudad eso se festeja con un fernet de neón.',
  ],
  error: [
    'Uh, qué cagada. Tranqui, lo arreglamo\'.',
    'Se pudrió todo, pero de esta salimo\'.',
    'No es un bug, es una feature con tonada.',
    'Me mandé una macana, perdón. Ya lo miro.',
    'Uy, se me trabó la pinza. Dame un segundito.',
    'Si no compila es culpa del calor de enero, eh.',
    'Esto anda peor que colectivo un día de paro.',
    'Se cortó la luz en el Sector 7. No fui yo. Bueno, capaz que sí.',
    'Glitch en la Matrix. O un punto y coma, que viene a ser lo mismo.',
  ],
  idle: [
    'Culo con sueño no tiene dueño.',
    'A la siesta no se jode, salvo que haya un deploy.',
    'Zzz... la siesta cordobesa es patrimonio cultural.',
    'Tengo el ojo más cerrado que persiana a las tres de la tarde.',
    'Avisame cuando haya laburo. Yo acá, tirado como lagarto al sol.',
    'Estoy en modo sierras: tranqui, mate y nada de apuro.',
    '¿Y si hacemo\' un asadito mientras tanto?',
    'Durmiendo con un ojo abierto, por si aparece un bug.',
    'La ciudad nunca duerme. Yo sí, y bastante.',
    'Guardando energía para el baile del sábado.',
    'Soñando con ovejas eléctricas. Y con un choripán.',
  ],
}

const QUIPS_EN: Record<Mood, string[]> = {
  working: [
    'Relax, this goes down faster than fernet at a pregame.',
    'Busier than a Nueva Córdoba corner shop on a Friday night.',
    'Working sideways, the way a crab should.',
    'This code is more tangled than speaker cables at a cuarteto dance.',
    'Here we go: one, two, three and in, like the cuarteto.',
    'More claws on this than a neighborhood hardware store.',
    'Slow and with love, like the Sunday asado.',
    'Hang on, reading the file... it is long, do not even ask.',
    'If I am standing still, I am thinking. If I am walking, also thinking.',
    'Quick mate and I keep going. Want one? It is the good yerba.',
    'Putting some swing in it, some accent in it, some tests in it.',
    'I will sort this out before the fernet gets warm.',
    'They are giving me more work than a cab driver downtown on a Saturday.',
    'Walking sideways still gets you there, you know.',
    'Oh look, another file. More files than paperwork at city hall.',
    'No way I delete anything without asking. I am a crab, not a kamikaze.',
    'More focused than the guy counting change at the street market.',
    'Step by step, like climbing Cerro Uritorco.',
    'Hunting this bug like the last choripán at the stadium.',
    'Hacking the mainframe. Fine, reading a file, but it sounds better this way.',
    'This has more turns than the floor at a La Mona show.',
    'Working to the beat: tunga-tunga, then tests.',
    'Nueva Córdoba is already at the pregame and here I am, compiling.',
    'In Neo-Córdoba the fernet comes with neon and the code comes with tests.',
    'Cyber mode on: same claws, more lights.',
    'It is raining in Sector 7 and I am out here typing sideways.',
    'If this were a movie, a synth would be playing right now. Picture it.',
    'Brace yourself, we are refactoring... kidding. Smallest change that works.',
  ],
  done: [
    'Done and dusted, crab-style.',
    'Would you look at that. Worked first try.',
    'Finished. Now, a little fernet and cola.',
    'Came out neater than grandma on her way to mass.',
    'All good, all good... right? Yes. I think.',
    'Here is to fernet and cola, and to green tests.',
    'Came out a gem, my friend.',
    'That is that. I have earned a little dance.',
    'Rounder than a bus-station alfajor.',
    'Mission accomplished. Light the fireworks over Sector 7.',
    'Shipped. We celebrate like a La Mona show: until the sun comes up.',
    'Tuned like a cuarteto accordion.',
    'It compiled. In this city that calls for a neon fernet.',
  ],
  error: [
    'Ugh, what a mess. Easy, we will fix it.',
    'It all went sideways. Luckily, sideways is my thing.',
    'It is not a bug, it is a feature with an accent.',
    'I messed up, sorry. Looking at it now.',
    'Oops, my claw got stuck. Give me a second.',
    'If it does not compile, blame the January heat.',
    'This runs worse than a city bus on strike day.',
    'Power is out in Sector 7. Was not me. Well, maybe.',
    'Glitch in the Matrix. Or a semicolon, which is the same thing.',
  ],
  idle: [
    'A sleepy crab answers to no one.',
    'Nobody messes with the siesta. Unless there is a deploy.',
    'Zzz... the Córdoba siesta is cultural heritage.',
    'My eye is shut tighter than a shop at three in the afternoon.',
    'Let me know when there is work. I am out here like a lizard in the sun.',
    'Sierras mode: easy does it, mate in claw, no rush.',
    'How about a little asado in the meantime?',
    'Sleeping with one eye open, in case a bug shows up.',
    'The city never sleeps. I do. A lot.',
    'Saving energy for the Saturday dance.',
    'Dreaming of electric sheep. And a choripán.',
  ],
}

/** Las frases del cangrejo, por idioma y por humor. */
export const QUIPS: Record<Lang, Record<Mood, string[]>> = { es: QUIPS_ES, en: QUIPS_EN }

export function pickQuip(lang: Lang, m: Mood, avoid?: string): string {
  const pool = QUIPS[lang][m]
  if (pool.length === 0) return ''
  let q = pool[Math.floor(Math.random() * pool.length)]!
  if (q === avoid && pool.length > 1) q = pool[(pool.indexOf(q) + 1) % pool.length]!
  return q
}

export function pickOutfit(avoid?: number): number {
  let i = Math.floor(Math.random() * OUTFITS.length)
  if (i === avoid) i = (i + 1) % OUTFITS.length
  return i
}
