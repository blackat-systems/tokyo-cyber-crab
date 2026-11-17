// El dibujo del cangrejo y su ciudad. Sin nada del motor: son funciones que
// devuelven el SVG como texto, así se pueden mirar fuera de la app.
// Los colores salen todos de ./palette: acá no se escribe ninguno a mano.

import type { AgentStatus, Mood } from '../types'
import { OUTFITS, outfitPixels } from './fun'
import { P } from './palette'

// ---------- El cangrejito pixelado (SVG + animaciones CSS) ----------

// C = pinza, O = cuerpo, H = brillo, D = sombra, W = ojo, K = pupila, L = patas
const CLAW_L = ['.HC...', 'C..C..', 'CCCD..']
const CLAW_R = ['...HC.', '..C..C', '..DCCC']
const BODY = [
  '..CC..W..W..CC..',
  '...O..K..K..O...',
  '...OHHHOOOOOO...',
  '..OHOOOOOOOOOO..',
  '..ODOOOOOOOODO..',
  '...DDDDDDDDDD...',
]
const LEGS = ['..L.L.L..L.L.L..']

const PX = 5

type CrabPalette = Record<'C' | 'O' | 'H' | 'D' | 'W' | 'K' | 'L', string>

function pixels(
  rows: string[],
  dx: number,
  dy: number,
  palette: Record<string, string>,
  px: number = PX,
) {
  let out = ''
  rows.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      const fill = palette[ch]
      if (fill) {
        out += `<rect x="${(dx + x) * px}" y="${(dy + y) * px}" width="${px}" height="${px}" fill="${fill}"/>`
      }
    })
  })
  return out
}

/** Mezcla dos colores #rrggbb; t va de 0 a 1. */
function mixHex(a: string, b: string, t: number): string {
  const ch = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16)
  let out = '#'
  for (let i = 0; i < 3; i++) {
    out += Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')
  }
  return out
}

/** El cangrejo de un solo tono: brillo y sombra salen del mismo color. */
function tonedCrab(body: string): CrabPalette {
  const shade = mixHex(body, P.s0, 0.38)
  return { C: body, O: body, H: mixHex(body, '#ffffff', 0.45), D: shade, W: '#ffffff', K: P.s0, L: shade }
}

const CRAB_PAL: CrabPalette = {
  C: P.crab,
  O: P.crab,
  H: P.crabLight,
  D: P.crabShade,
  W: '#ffffff',
  K: P.s0,
  L: P.crabShade,
}

// Cangrejito chico para cada subagente: cian mientras trabaja, verde al terminar.
export function miniCrabSvg(status: AgentStatus, outfitIndex?: number): string {
  const px = 2
  const pal = tonedCrab(status === 'running' ? P.cyan : status === 'done' ? P.green : P.red)
  const W = 19 * px + 4
  const H = 14 * px + 4
  const anim =
    status === 'running'
      ? `.c{animation:b .3s steps(2) infinite}.l{transform-box:fill-box;transform-origin:right bottom;animation:s .3s ease-in-out infinite alternate}.r{transform-box:fill-box;transform-origin:left bottom;animation:t .3s ease-in-out infinite alternate}`
      : status === 'error'
        ? `.c{animation:k .12s linear infinite}`
        : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">` +
    `<style>${anim}@keyframes b{from{transform:translateY(0)}to{transform:translateY(-1px)}}@keyframes s{to{transform:rotate(-16deg)}}@keyframes t{to{transform:rotate(16deg)}}@keyframes k{0%{transform:translateX(-1px)}50%{transform:translateX(1px)}}` +
    `</style>` +
    `<g transform="translate(2 ${4 * px + 2})"><g class="c">` +
    `<g class="l">${pixels(CLAW_L, 0, 0, pal, px)}</g><g class="r">${pixels(CLAW_R, 10, 0, pal, px)}</g>` +
    pixels(BODY, 0, 3, pal, px) +
    pixels(LEGS, 0, 9, pal, px) +
    outfitPixels(outfitIndex === undefined ? undefined : OUTFITS[outfitIndex], pixels, px) +
    `</g></g></svg>`
  )
}

// ---------- La escena: Neo-Córdoba de noche ----------

// La escena es casi tan alta como una pantalla de cine (16:9): en un panel angosto,
// una tira baja dejaba al cangrejo y a su pista del tamaño de una estampilla.
const SCENE_W = 400
const SCENE_H = 225
const GROUND = 186
/** El lado de cada píxel del cangrejo grande. */
const CRAB_PX = 7
/** Dónde va la pista de avance, y cuánto mide de alto. */
const TRACK_Y = GROUND + 13
const TRACK_H = 8

/** Números «al azar» que salen siempre iguales: la ciudad no cambia entre dibujos. */
function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/** Los neones de las ventanas: de noche normal, y en rojo cuando algo falló. */
const windowGlow = (m: Mood) =>
  m === 'error' ? [P.red, P.redDeep, P.sunMid] : [P.cyan, P.yellow, P.magenta, P.violet]

/** Las ventanas de un edificio: una grilla de cuadraditos, algunos prendidos y alguno que titila. */
function windows(x: number, top: number, w: number, m: Mood, rnd: () => number, lit: number): string {
  const glow = windowGlow(m)
  let out = ''
  for (let wy = top + 6; wy < GROUND - 7; wy += 9) {
    for (let wx = x + 4; wx < x + w - 6; wx += 8) {
      const r = rnd()
      if (r > lit) continue
      const color = glow[Math.floor(rnd() * glow.length)]!
      const blink = r < 0.07 ? ` class="w w${1 + Math.floor(rnd() * 3)}"` : ''
      out += `<rect${blink} x="${wx}" y="${wy}" width="4" height="5" fill="${color}" opacity="${m === 'idle' ? 0.4 : 0.8}"/>`
    }
  }
  return out
}

/** Edificios pixelados con ventanitas; algunas titilan. */
function skyline(m: Mood): { far: string; near: string } {
  const rnd = seeded(7)
  const lit = m === 'idle' ? 0.26 : m === 'error' ? 0.5 : 0.6
  let far = ''
  let near = ''
  for (let x = 0; x < SCENE_W; ) {
    const w = 20 + Math.floor(rnd() * 22)
    const h = 62 + Math.floor(rnd() * 48)
    far += `<rect x="${x}" y="${GROUND - h}" width="${w}" height="${h}" fill="${P.farBuilding}"/>`
    x += w + 3
  }
  for (let x = -6; x < SCENE_W; ) {
    const w = 26 + Math.floor(rnd() * 26)
    const h = 30 + Math.floor(rnd() * 72)
    const top = GROUND - h
    near += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${P.nearBuilding}"/>`
    // antena en algunos
    if (rnd() > 0.6) near += `<rect x="${x + Math.floor(w / 2)}" y="${top - 11}" width="1" height="11" fill="${P.faint}"/><rect class="w w2" x="${x + Math.floor(w / 2) - 1}" y="${top - 14}" width="3" height="3" fill="${P.red}"/>`
    near += windows(x, top, w, m, rnd, lit)
    x += w + 4
  }
  return { far, near }
}

/** Una torre dibujada a mano, para que los carteles tengan de dónde colgar. */
function tower(x: number, top: number, w: number, m: Mood, seed: number): string {
  return (
    `<rect x="${x}" y="${top}" width="${w}" height="${GROUND - top}" fill="${P.nearBuilding}"/>` +
    `<rect x="${x - 1}" y="${top}" width="${w + 2}" height="2" fill="${P.line}"/>` +
    windows(x, top, w, m, seeded(seed), m === 'idle' ? 0.3 : 0.62)
  )
}

/** El sol de neón partido en franjas, bien outrun, detrás de la ciudad. */
function neonSun(m: Mood): string {
  const cx = 316
  const cy = 92
  const r = 48
  const stops =
    m === 'error'
      ? `<stop offset="0" stop-color="${P.sunMid}"/><stop offset="1" stop-color="${P.red}"/>`
      : `<stop offset="0" stop-color="${P.sunTop}"/><stop offset=".5" stop-color="${P.sunMid}"/><stop offset="1" stop-color="${P.sunLow}"/>`
  const halo = m === 'error' ? P.red : P.sunLow
  const cut = m === 'error' ? '#241019' : '#1f1638'
  // franjas sólo en la mitad de abajo, cada vez más gruesas: el sol de neón de siempre
  let cuts = ''
  for (let i = 0; i < 5; i++) {
    cuts += `<rect x="${cx - r}" y="${cy + 5 + i * 9}" width="${r * 2}" height="${2 + i * 0.9}" fill="${cut}"/>`
  }
  return (
    `<defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>` +
    `<radialGradient id="halo"><stop offset=".35" stop-color="${halo}" stop-opacity=".34"/><stop offset="1" stop-color="${halo}" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="half"><rect x="0" y="0" width="${SCENE_W}" height="${GROUND}"/></clipPath></defs>` +
    `<g clip-path="url(#half)" opacity="${m === 'idle' ? 0.5 : 1}">` +
    `<circle cx="${cx}" cy="${cy}" r="${r * 2.2}" fill="url(#halo)"/>` +
    `<circle class="sun" cx="${cx}" cy="${cy}" r="${r}" fill="url(#sun)"/>${cuts}</g>`
  )
}

/** Carteles: el del cangrejo en japonés y uno bien cordobés, cada uno en su torre. */
function signs(m: Mood): string {
  const off = m === 'idle'
  const a = m === 'error' ? P.red : P.magenta
  const b = m === 'error' ? P.red : P.cyan
  return (
    // la torre del cartel vertical, con dos brazos que lo sostienen
    tower(252, 58, 26, m, 41) +
    `<rect x="246" y="76" width="6" height="2" fill="${P.faint}"/><rect x="246" y="122" width="6" height="2" fill="${P.faint}"/>` +
    `<g class="${off ? 'sign slow' : 'sign'}">` +
    `<rect x="224" y="68" width="22" height="62" fill="${P.void}" stroke="${a}" stroke-width="1.5"/>` +
    `<text x="235" y="93" text-anchor="middle" font-family="monospace" font-size="17" font-weight="bold" fill="${a}">カ</text>` +
    `<text x="235" y="121" text-anchor="middle" font-family="monospace" font-size="17" font-weight="bold" fill="${a}">ニ</text>` +
    `</g>` +
    // la torre del cartel de techo, parado sobre dos patas
    tower(132, 86, 66, m, 59) +
    `<rect x="142" y="76" width="2" height="10" fill="${P.faint}"/><rect x="186" y="76" width="2" height="10" fill="${P.faint}"/>` +
    `<g class="sign s2">` +
    `<rect x="130" y="56" width="70" height="20" fill="${P.void}" stroke="${b}" stroke-width="1.5"/>` +
    `<text x="165" y="71" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="${b}">FERNET</text>` +
    `</g>`
  )
}

export function crabSvg(m: Mood, progress?: number, outfitIndex?: number): string {
  const pal = m === 'error' ? tonedCrab(P.red) : CRAB_PAL
  const body = pal.O
  const W = SCENE_W
  const H = SCENE_H
  const px = CRAB_PX
  const crabW = 16 * px
  const crabH = 10 * px
  const tag = m === 'working' ? 'REC' : m === 'done' ? 'OK' : m === 'error' ? 'ERR' : 'ZZZ'
  const tagColor = m === 'working' ? P.red : m === 'done' ? P.green : m === 'error' ? P.red : P.muted

  const css = `
    .scene{animation:${m === 'working' ? (progress === undefined ? 'walk 3.6s ease-in-out infinite alternate' : 'pace .9s ease-in-out infinite alternate') : 'none'}}
    @keyframes pace{from{transform:translateX(-5px)}to{transform:translateX(5px)}}
    @keyframes walk{from{transform:translateX(0)}to{transform:translateX(${W - crabW - 40}px)}}
    .flag{animation:wave .5s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:left center}
    @keyframes wave{from{transform:skewY(-8deg)}to{transform:skewY(8deg)}}
    .crab{transform-box:fill-box;transform-origin:center bottom;filter:drop-shadow(0 0 4px ${body});
      animation:${
        m === 'working'
          ? 'bob .32s steps(2) infinite'
          : m === 'done'
            ? 'hop .55s ease-out 3'
            : m === 'error'
              ? 'shake .12s linear infinite'
              : 'breathe 2.4s ease-in-out infinite'
      }}
    .clawL{transform-box:fill-box;transform-origin:right bottom;animation:${m === 'idle' ? 'none' : 'snapL .35s ease-in-out infinite alternate'}}
    .clawR{transform-box:fill-box;transform-origin:left bottom;animation:${m === 'idle' ? 'none' : 'snapR .35s ease-in-out infinite alternate'}}
    .legs{animation:${m === 'working' ? 'legs .16s steps(2) infinite' : 'none'}}
    @keyframes bob{from{transform:translateY(0)}to{transform:translateY(-3px)}}
    @keyframes breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.94)}}
    @keyframes hop{0%{transform:translateY(0)}40%{transform:translateY(-22px)}100%{transform:translateY(0)}}
    @keyframes shake{0%{transform:translateX(-3px)}50%{transform:translateX(3px)}100%{transform:translateX(-3px)}}
    @keyframes snapL{from{transform:rotate(0)}to{transform:rotate(-14deg)}}
    @keyframes snapR{from{transform:rotate(0)}to{transform:rotate(14deg)}}
    @keyframes legs{from{transform:translateY(0)}to{transform:translateY(-2px)}}
    .z{fill:${P.violet};font:bold 15px monospace;opacity:0;animation:zz 2.4s ease-in infinite}
    .z2{animation-delay:.8s}.z3{animation-delay:1.6s}
    @keyframes zz{0%{opacity:0;transform:translate(0,0)}30%{opacity:1}100%{opacity:0;transform:translate(20px,-32px)}}
    .w{animation:blink 2.6s steps(2) infinite}.w2{animation-delay:.9s}.w3{animation-delay:1.7s}
    @keyframes blink{0%,70%{opacity:.9}71%,100%{opacity:.15}}
    .sign{animation:neon 3.4s steps(1) infinite}.s2{animation-delay:1.3s}.slow{animation-duration:6s}
    @keyframes neon{0%,86%{opacity:1}87%{opacity:.25}90%{opacity:1}93%{opacity:.4}96%,100%{opacity:1}}
    .sun{animation:${m === 'idle' ? 'none' : 'sun 4s ease-in-out infinite alternate'}}
    @keyframes sun{from{opacity:.85}to{opacity:1}}
    .rain{stroke:${P.cyan};stroke-width:1;opacity:.3;animation:rain .5s linear infinite}
    .r2{animation-delay:.17s}.r3{animation-delay:.33s}
    @keyframes rain{from{transform:translate(0,-26px)}to{transform:translate(-11px,26px)}}
    .glitch{fill:${P.red};opacity:0;animation:glitch .9s steps(1) infinite}
    .g2{animation-delay:.3s}.g3{animation-delay:.6s}
    @keyframes glitch{0%{opacity:0}10%{opacity:.5;transform:translateX(6px)}20%{opacity:0}55%{opacity:.35;transform:translateX(-9px)}65%,100%{opacity:0}}
    .boom{fill:none;stroke-width:2.5;stroke-dasharray:3 7;transform-box:fill-box;transform-origin:center;opacity:0;animation:boom 1.5s ease-out infinite}
    .b2{animation-delay:.5s}.b3{animation-delay:1s}
    @keyframes boom{0%{opacity:0;transform:scale(.2)}20%{opacity:1}100%{opacity:0;transform:scale(1.5)}}
    .rec{animation:${m === 'working' ? 'rec 1s steps(2) infinite' : 'none'}}
    @keyframes rec{from{opacity:1}to{opacity:.2}}
  `

  const crab =
    `<g class="crab">` +
    `<g class="clawL">${pixels(CLAW_L, 0, 0, pal, px)}</g>` +
    `<g class="clawR">${pixels(CLAW_R, 10, 0, pal, px)}</g>` +
    pixels(BODY, 0, 3, pal, px) +
    `<g class="legs">${pixels(LEGS, 0, 9, pal, px)}</g>` +
    `<g class="outfit">${outfitPixels(outfitIndex === undefined ? undefined : OUTFITS[outfitIndex], pixels, px)}</g>` +
    `</g>`

  // lo que acompaña al cangrejo según cómo anda
  const extras =
    m === 'idle'
      ? `<text class="z" x="${crabW + 16}" y="38">z</text><text class="z z2" x="${crabW + 16}" y="38">z</text><text class="z z3" x="${crabW + 16}" y="38">Z</text>`
      : ''

  // estrellas: pocas y quietas, sólo en lo alto del cielo
  const starRnd = seeded(19)
  let stars = ''
  for (let i = 0; i < 34; i++) {
    const x = Math.floor(starRnd() * W)
    const y = 6 + Math.floor(starRnd() * 78)
    stars += `<rect x="${x}" y="${y}" width="1" height="1" fill="${P.text}" opacity="${(0.2 + starRnd() * 0.4).toFixed(2)}"/>`
  }

  let weather = ''
  if (m === 'working') {
    const rnd = seeded(3)
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rnd() * (W + 24))
      const y = Math.floor(rnd() * (GROUND - 14))
      weather += `<line class="rain r${1 + (i % 3)}" x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + 10}"/>`
    }
  } else if (m === 'done') {
    weather =
      `<circle class="boom" cx="84" cy="48" r="22" stroke="${P.yellow}"/>` +
      `<circle class="boom b2" cx="206" cy="36" r="26" stroke="${P.green}"/>` +
      `<circle class="boom b3" cx="350" cy="52" r="19" stroke="${P.cyan}"/>`
  } else if (m === 'error') {
    weather =
      `<rect class="glitch" x="0" y="46" width="${W}" height="6"/>` +
      `<rect class="glitch g2" x="0" y="108" width="${W}" height="11"/>` +
      `<rect class="glitch g3" x="0" y="158" width="${W}" height="5"/>`
  }

  // vereda mojada: línea de neón, su reflejo y, si hay plan, la pista de avance hasta la banderita
  const line = m === 'error' ? P.red : P.cyan
  let floor =
    `<rect x="0" y="${GROUND}" width="${W}" height="${H - GROUND}" fill="${P.void}"/>` +
    `<rect x="0" y="${GROUND + 2}" width="${W}" height="9" fill="url(#wet)"/>` +
    `<rect x="0" y="${GROUND}" width="${W}" height="2" fill="${line}" opacity=".9"/>`
  let crabX = 16
  if (progress === undefined) {
    // sin plan, la calle: rayas de la senda
    for (let x = 8; x < W; x += 30) {
      floor += `<rect x="${x}" y="${TRACK_Y + 2}" width="15" height="3" fill="${P.line}"/>`
    }
  } else {
    const x0 = 16
    const x1 = W - 30
    const segs = 24
    const segW = (x1 - x0) / segs
    for (let i = 0; i < segs; i++) {
      const filled = (i + 1) / segs <= progress + 1e-9
      floor += `<rect x="${(x0 + i * segW).toFixed(1)}" y="${TRACK_Y}" width="${(segW - 3).toFixed(1)}" height="${TRACK_H}" fill="${filled ? P.green : P.line}"/>`
    }
    floor +=
      `<rect x="${x1 + 5}" y="${GROUND - 40}" width="3" height="40" fill="${P.muted}"/>` +
      `<rect class="flag" x="${x1 + 8}" y="${GROUND - 40}" width="15" height="11" fill="${progress >= 1 ? P.green : P.magenta}"/>`
    crabX = x0 + Math.min(1, progress) * (x1 - x0 - crabW - 8)
  }

  // marco de visor: esquinas, etiqueta del lugar y estado
  const c = 16
  const hud =
    `<path d="M1 ${c}V1H${c}M${W - c} 1H${W - 1}V${c}M${W - 1} ${H - c}V${H - 1}H${W - c}M${c} ${H - 1}H1V${H - c}" fill="none" stroke="${line}" stroke-width="2" opacity=".9"/>` +
    `<text x="22" y="16" font-family="monospace" font-size="10" font-weight="bold" fill="${P.muted}" letter-spacing="1.2">NEO-CBA // SECTOR 7</text>` +
    `<g class="rec"><circle cx="${W - 54}" cy="12.5" r="3.5" fill="${tagColor}"/></g>` +
    `<text x="${W - 46}" y="16" font-family="monospace" font-size="10" font-weight="bold" fill="${tagColor}" letter-spacing="1.2">${tag}</text>`

  const city = skyline(m)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">` +
    `<style>${css}</style>` +
    `<defs>` +
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.void}"/><stop offset=".45" stop-color="${P.s0}"/><stop offset="1" stop-color="${m === 'error' ? '#3a1322' : P.dusk}"/></linearGradient>` +
    `<linearGradient id="wet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${line}" stop-opacity=".32"/><stop offset="1" stop-color="${line}" stop-opacity="0"/></linearGradient>` +
    // el vidrio del visor: renglones de tubo y bordes en penumbra
    `<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect y="2" width="4" height="2" fill="#000000" opacity=".13"/></pattern>` +
    `<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".45"/></radialGradient>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#sky)" rx="6"/>` +
    stars +
    neonSun(m) +
    city.far +
    city.near +
    signs(m) +
    floor +
    weather +
    `<g transform="translate(${crabX.toFixed(1)} ${GROUND - crabH - 1})"><g class="scene"><g>${crab}${extras}</g></g></g>` +
    `<rect width="${W}" height="${H}" fill="url(#scan)" rx="6"/>` +
    `<rect width="${W}" height="${H}" fill="url(#vig)" rx="6"/>` +
    hud +
    `</svg>`
  )
}

// ---------- El ícono del mod ----------

/** El cangrejo delante del sol, cuadrado: de acá sale `.claude-plugin/icon.png`. */
export function iconSvg(): string {
  const S = 128
  const px = 5
  const crabW = 16 * px
  const ground = 108
  const cx = S / 2
  const cy = 46
  const r = 37
  // franjas sólo dentro del sol, cada vez más gruesas
  let cuts = ''
  for (let i = 0; i < 4; i++) {
    cuts += `<rect x="${cx - r}" y="${cy + 6 + i * 8}" width="${r * 2}" height="${2 + i}" fill="#1f1638"/>`
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" shape-rendering="crispEdges">` +
    `<defs>` +
    `<linearGradient id="isky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.void}"/><stop offset=".5" stop-color="${P.s0}"/><stop offset="1" stop-color="${P.dusk}"/></linearGradient>` +
    `<linearGradient id="isun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sunTop}"/><stop offset=".45" stop-color="${P.sunMid}"/><stop offset=".8" stop-color="${P.sunLow}"/></linearGradient>` +
    `<radialGradient id="ihalo"><stop offset=".4" stop-color="${P.sunLow}" stop-opacity=".4"/><stop offset="1" stop-color="${P.sunLow}" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="isunclip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>` +
    `</defs>` +
    `<rect width="${S}" height="${S}" fill="url(#isky)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r * 1.7}" fill="url(#ihalo)"/>` +
    `<g clip-path="url(#isunclip)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#isun)"/>${cuts}</g>` +
    `<rect y="${ground}" width="${S}" height="${S - ground}" fill="${P.void}"/>` +
    `<rect y="${ground}" width="${S}" height="2" fill="${P.cyan}"/>` +
    `<g transform="translate(${(S - crabW) / 2} ${ground - 10 * px})">` +
    pixels(CLAW_L, 0, 0, CRAB_PAL, px) +
    pixels(CLAW_R, 10, 0, CRAB_PAL, px) +
    pixels(BODY, 0, 3, CRAB_PAL, px) +
    pixels(LEGS, 0, 9, CRAB_PAL, px) +
    `</g></svg>`
  )
}

// ---------- El fondo de toda la ventana: Neo-Córdoba en panorámica ----------

const BG_W = 1600
const BG_H = 900
const BG_HORIZON = 640

const BG_GLOW = [P.cyan, P.yellow, P.magenta, P.violet, P.sunMid] as const

// Cuánto brilla cada cosa del fondo. Encima va texto, y lo que más estorba para leer son
// los puntos chicos y saturados del tamaño de una letra: ventanas y carteles. Esos van
// bajitos. Las formas grandes y suaves (el sol, las siluetas) aguantan más.
const BG_DIM = {
  windows: { far: 0.1, mid: 0.15, near: 0.22 },
  signs: 0.4,
  crab: 0.8,
  sun: 0.62,
  horizon: 0.38,
  gridLines: 0.12,
} as const

/** Una hilera de edificios con ventanas, de ancho completo. */
function bgRow(seed: number, base: string, minH: number, maxH: number, lit: number, alpha: number): string {
  const rnd = seeded(seed)
  let out = ''
  for (let x = -20; x < BG_W; ) {
    const w = 46 + Math.floor(rnd() * 70)
    const h = minH + Math.floor(rnd() * (maxH - minH))
    const top = BG_HORIZON - h
    out += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${base}"/>`
    if (rnd() > 0.7) {
      out += `<rect x="${x + Math.floor(w / 2)}" y="${top - 26}" width="2" height="26" fill="${P.faint}" opacity=".7"/>`
      out += `<rect class="bw bw2" x="${x + Math.floor(w / 2) - 2}" y="${top - 30}" width="6" height="4" fill="${P.red}"/>`
    }
    for (let wy = top + 10; wy < BG_HORIZON - 10; wy += 16) {
      for (let wx = x + 8; wx < x + w - 10; wx += 13) {
        const r = rnd()
        if (r > lit) continue
        const color = BG_GLOW[Math.floor(rnd() * BG_GLOW.length)]!
        const blink = r < 0.02 ? ` class="bw bw${1 + Math.floor(rnd() * 3)}"` : ''
        out += `<rect${blink} x="${wx}" y="${wy}" width="6" height="7" fill="${color}" opacity="${alpha}"/>`
      }
    }
    x += w + 6
  }
  return out
}

/** Una torre a mano del fondo grande: techo plano y ventanas prolijas. */
function bgTower(x: number, top: number, w: number, seed: number): string {
  const rnd = seeded(seed)
  let out =
    `<rect x="${x}" y="${top}" width="${w}" height="${BG_HORIZON - top}" fill="${P.nearBuilding}"/>` +
    `<rect x="${x - 3}" y="${top}" width="${w + 6}" height="4" fill="${P.line}"/>`
  for (let wy = top + 16; wy < BG_HORIZON - 10; wy += 16) {
    for (let wx = x + 9; wx < x + w - 10; wx += 13) {
      if (rnd() > 0.5) continue
      out += `<rect x="${wx}" y="${wy}" width="6" height="7" fill="${BG_GLOW[Math.floor(rnd() * BG_GLOW.length)]!}" opacity="${BG_DIM.windows.near}"/>`
    }
  }
  return out
}

/**
 * La ciudad de neón a ventana completa, para dibujar detrás de la conversación.
 * Es tenue a propósito: encima va texto para leer.
 */
export function backdropSvg(): string {
  const cx = 1190
  const cy = 330
  const r = 185
  // franjas sólo en la mitad de abajo, cada vez más gruesas
  let cuts = ''
  for (let i = 0; i < 6; i++) {
    cuts += `<rect x="${cx - r}" y="${cy + 14 + i * 30}" width="${r * 2}" height="${6 + i * 3}" fill="#1c1533"/>`
  }
  // piso: grilla en perspectiva hacia el horizonte
  let grid = ''
  for (let i = 0; i <= 26; i++) {
    const xTop = BG_W / 2 + (i - 13) * 34
    const xBottom = BG_W / 2 + (i - 13) * 190
    grid += `<line x1="${xTop}" y1="${BG_HORIZON}" x2="${xBottom}" y2="${BG_H}" stroke="${P.magenta}" stroke-width="1.5" opacity="${BG_DIM.gridLines}"/>`
  }
  for (let i = 0; i < 9; i++) {
    const y = BG_HORIZON + Math.round(Math.pow(i / 8, 2.1) * (BG_H - BG_HORIZON))
    grid += `<line x1="0" y1="${y}" x2="${BG_W}" y2="${y}" stroke="${P.cyan}" stroke-width="1.5" opacity="${(BG_DIM.gridLines / 2 + i * 0.014).toFixed(2)}"/>`
  }
  // estrellas fijas
  const rnd = seeded(11)
  let stars = ''
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rnd() * BG_W)
    const y = Math.floor(rnd() * 330)
    stars += `<rect x="${x}" y="${y}" width="2" height="2" fill="${P.text}" opacity="${(0.15 + rnd() * 0.45).toFixed(2)}"/>`
  }
  const css = `
    .bw{animation:bwink 5s steps(2) infinite}.bw2{animation-delay:1.7s}.bw3{animation-delay:3.1s}
    @keyframes bwink{0%,80%{opacity:.34}81%,100%{opacity:.08}}
    .bsign{animation:bneon 7s steps(1) infinite}.bs2{animation-delay:2.6s}
    @keyframes bneon{0%,90%{opacity:1}91%{opacity:.3}94%{opacity:1}96%{opacity:.5}98%,100%{opacity:1}}
  `
  // un cangrejito en la terraza de su torre: el dueño del barrio
  const roof = 404
  const tiny =
    `<g transform="translate(402 ${roof - 30})" opacity="${BG_DIM.crab}">` +
    pixels(CLAW_L, 0, 0, CRAB_PAL, 3) +
    pixels(CLAW_R, 10, 0, CRAB_PAL, 3) +
    pixels(BODY, 0, 3, CRAB_PAL, 3) +
    pixels(LEGS, 0, 9, CRAB_PAL, 3) +
    `</g>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BG_W} ${BG_H}" width="100%" height="100%" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges">` +
    `<style>${css}</style>` +
    `<defs>` +
    `<linearGradient id="bsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.void}"/><stop offset=".5" stop-color="${P.s0}"/><stop offset="1" stop-color="#3a2466"/></linearGradient>` +
    // Acá el sol no lleva amarillo: encima va texto, y lo más claro que aguanta es el naranja.
    `<linearGradient id="bsun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sunMid}"/><stop offset="1" stop-color="${P.sunLow}"/></linearGradient>` +
    `<radialGradient id="bhalo"><stop offset=".4" stop-color="${P.sunLow}" stop-opacity=".3"/><stop offset="1" stop-color="${P.sunLow}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="bwet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.cyan}" stop-opacity=".1"/><stop offset="1" stop-color="${P.cyan}" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="bhalf"><rect x="0" y="0" width="${BG_W}" height="${BG_HORIZON}"/></clipPath>` +
    `</defs>` +
    `<rect width="${BG_W}" height="${BG_H}" fill="${P.void}"/>` +
    `<rect width="${BG_W}" height="${BG_HORIZON}" fill="url(#bsky)"/>` +
    stars +
    `<g clip-path="url(#bhalf)"><circle cx="${cx}" cy="${cy}" r="${r * 2.2}" fill="url(#bhalo)"/>` +
    `<g opacity="${BG_DIM.sun}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#bsun)"/>${cuts}</g></g>` +
    bgRow(21, P.farBuilding, 90, 230, 0.2, BG_DIM.windows.far) +
    bgRow(34, P.midBuilding, 60, 270, 0.34, BG_DIM.windows.mid) +
    // la torre del cangrejo, con el cartel vertical colgado de su costado
    bgTower(384, roof, 96, 77) +
    `<rect x="368" y="${roof + 22}" width="16" height="3" fill="${P.faint}"/><rect x="368" y="${roof + 110}" width="16" height="3" fill="${P.faint}"/>` +
    `<g opacity="${BG_DIM.signs}"><g class="bsign">` +
    `<rect x="322" y="${roof + 8}" width="46" height="120" fill="${P.void}" stroke="${P.magenta}" stroke-width="3"/>` +
    `<text x="345" y="${roof + 58}" text-anchor="middle" font-family="monospace" font-size="34" font-weight="bold" fill="${P.magenta}">カ</text>` +
    `<text x="345" y="${roof + 108}" text-anchor="middle" font-family="monospace" font-size="34" font-weight="bold" fill="${P.magenta}">ニ</text>` +
    `</g></g>` +
    tiny +
    // la torre del cartel de techo, parado sobre dos patas
    bgTower(752, 486, 166, 91) +
    `<rect x="778" y="468" width="3" height="18" fill="${P.faint}"/><rect x="889" y="468" width="3" height="18" fill="${P.faint}"/>` +
    `<g opacity="${BG_DIM.signs}"><g class="bsign bs2">` +
    `<rect x="760" y="430" width="150" height="38" fill="${P.void}" stroke="${P.cyan}" stroke-width="3"/>` +
    `<text x="835" y="457" text-anchor="middle" font-family="monospace" font-size="26" font-weight="bold" fill="${P.cyan}">FERNET</text>` +
    `</g></g>` +
    bgRow(55, P.nearBuilding, 40, 200, 0.36, BG_DIM.windows.near) +
    `<rect x="0" y="${BG_HORIZON}" width="${BG_W}" height="${BG_H - BG_HORIZON}" fill="${P.void}"/>` +
    `<rect x="0" y="${BG_HORIZON + 2}" width="${BG_W}" height="60" fill="url(#bwet)"/>` +
    `<rect x="0" y="${BG_HORIZON}" width="${BG_W}" height="2" fill="${P.cyan}" opacity="${BG_DIM.horizon}"/>` +
    grid +
    `</svg>`
  )
}

// ---------- El ecualizador de neón del panel lateral ----------

/** Degradado a lo ancho: cian, violeta, magenta. */
function eqColor(t: number): string {
  return t < 0.5 ? mixHex(P.cyan, P.violet, t * 2) : mixHex(P.violet, P.magenta, (t - 0.5) * 2)
}

/**
 * Ecualizador de barras: sube y baja con CSS cuando hay algo sonando
 * (`active`) y queda quieto, bajito y apagado cuando no.
 */
export function eqSvg(active: boolean, bars = 32): string {
  const W = 400
  const H = 26
  const GAP = 2
  const baseY = H - 1 // la línea base ocupa la última fila
  const bw = (W - GAP * (bars - 1)) / bars
  const rnd = seeded(2026)
  let out = ''
  for (let i = 0; i < bars; i++) {
    const x = (i * (bw + GAP)).toFixed(2)
    const w = bw.toFixed(2)
    if (active) {
      const dur = (0.45 + rnd() * 0.65).toFixed(2)
      const delay = (-rnd() * 1.2).toFixed(2)
      const kf = i % 2 === 0 ? 'eqa' : 'eqb'
      out += `<rect class="e" x="${x}" y="0" width="${w}" height="${baseY}" fill="${eqColor(bars > 1 ? i / (bars - 1) : 0)}" style="animation:${kf} ${dur}s ease-in-out ${delay}s infinite alternate"/>`
    } else {
      const h = 2 + Math.floor(rnd() * 4)
      out += `<rect x="${x}" y="${baseY - h}" width="${w}" height="${h}" fill="${P.faint}" opacity=".5"/>`
    }
  }
  const css = active
    ? `<style>.e{transform-box:fill-box;transform-origin:center bottom;opacity:.9}` +
      `@keyframes eqa{0%{transform:scaleY(.1)}35%{transform:scaleY(.85)}70%{transform:scaleY(.3)}100%{transform:scaleY(1)}}` +
      `@keyframes eqb{0%{transform:scaleY(.2)}40%{transform:scaleY(.5)}75%{transform:scaleY(.95)}100%{transform:scaleY(.15)}}</style>`
    : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">` +
    css +
    out +
    `<rect x="0" y="${baseY}" width="${W}" height="1" fill="${P.line}"/>` +
    `</svg>`
  )
}

/**
 * Un medidor de neón: una fila de segmentos que se encienden de izquierda a derecha.
 * Sirve para el contexto (cuánto se llenó la ventana) y para el avance del plan.
 * `fraction` va de 0 a 1; sin dato, la pista queda apagada. `marks` son rayitas
 * finas sobre la pista (por ejemplo dónde empieza el «ojo»), también de 0 a 1.
 */
export function gaugeSvg(fraction: number | undefined, color: string, marks: number[] = [], segments = 40): string {
  const W = 400
  const H = 14
  const GAP = 2
  const top = 3 // deja lugar arriba para las marcas
  const sw = (W - GAP * (segments - 1)) / segments
  const f = fraction === undefined ? 0 : Math.max(0, Math.min(1, fraction))
  // con algo usado, al menos un segmento: una barra vacía dice «nada», y no es cierto
  const lit = fraction !== undefined && f > 0 ? Math.max(1, Math.round(f * segments)) : 0
  let out = ''
  // el resplandor detrás de lo encendido
  if (lit > 0) {
    const gw = (lit * (sw + GAP) - GAP).toFixed(2)
    out += `<rect x="0" y="${top - 2}" width="${gw}" height="${H - top + 3}" rx="3" fill="${color}" opacity=".16"/>`
  }
  for (let i = 0; i < segments; i++) {
    const x = (i * (sw + GAP)).toFixed(2)
    const w = sw.toFixed(2)
    if (i < lit) {
      // lo más viejo un poco más tenue, la punta a pleno
      const op = (0.55 + 0.45 * ((i + 1) / lit)).toFixed(2)
      out += `<rect x="${x}" y="${top}" width="${w}" height="${H - top - 1}" rx="1" fill="${color}" opacity="${op}"/>`
    } else {
      out += `<rect x="${x}" y="${top}" width="${w}" height="${H - top - 1}" rx="1" fill="${P.line}"/>`
    }
  }
  if (lit > 0) {
    // la punta brilla
    const x = ((lit - 1) * (sw + GAP)).toFixed(2)
    out += `<rect x="${x}" y="${top}" width="${sw.toFixed(2)}" height="${H - top - 1}" rx="1" fill="${P.text}" opacity=".55"/>`
  }
  for (const m of marks) {
    const x = (Math.max(0, Math.min(1, m)) * W).toFixed(2)
    out += `<rect x="${x}" y="0" width="2" height="${H}" fill="${P.muted}" opacity=".7"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${out}</svg>`
}
