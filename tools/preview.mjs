// Dibuja el arte del mod fuera de la app: los cuatro humores del cangrejo,
// toda la ropa, los cangrejitos de los subagentes, el ecualizador y la ciudad de fondo.
//
//   node tools/preview.mjs            -> escribe preview.html al lado de este archivo
//   node tools/preview.mjs salida.html
//
// Pide Node 22.15 o más nuevo (lee TypeScript sin compilar). Abrí el HTML en un navegador.

import { existsSync, writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Los módulos del mod se importan sin extensión; Node la quiere escrita.
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith('.') && ctx.parentURL && !/\.[cm]?[jt]sx?$/.test(spec)) {
      for (const ext of ['.ts', '.tsx', '/index.d.ts']) {
        if (existsSync(fileURLToPath(new URL(spec + ext, ctx.parentURL)))) return next(spec + ext, ctx)
      }
    }
    return next(spec, ctx)
  },
})

const here = dirname(fileURLToPath(import.meta.url))
const hooks = join(here, '..', 'hooks')
const scene = await import(pathToFileURL(join(hooks, 'scene.ts')).href)
const fun = await import(pathToFileURL(join(hooks, 'fun.ts')).href)
const { P } = await import(pathToFileURL(join(hooks, 'palette.ts')).href)

// Cada dibujo va en su <img>: así los id de un SVG no pisan los de otro, como en la app.
const img = (svg, style = '') =>
  `<img style="display:block;width:100%;${style}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`
const moods = ['idle', 'working', 'done', 'error']
const cell = (label, svg, width = 400) => `<figure style="width:${width}px"><figcaption>${label}</figcaption>${img(svg)}</figure>`

const swatches = Object.entries(P)
  .map(([name, hex]) => `<div class="sw"><i style="background:${hex}"></i>${name}<br><small>${hex}</small></div>`)
  .join('')

const html = `<!doctype html><meta charset="utf-8"><title>Tokyo Cyber Crab · preview</title>
<style>
  body{background:${P.void};color:${P.text};font:13px ui-monospace,Consolas,monospace;margin:20px}
  h2{font-size:13px;color:${P.cyan};margin:24px 0 8px;letter-spacing:1px}
  .row{display:flex;gap:12px;flex-wrap:wrap}
  figure{margin:0}figcaption,small{color:${P.muted}}
  .sw{width:108px}.sw i{display:block;height:36px;border-radius:4px;border:1px solid ${P.line}}
  .bd{width:100%;max-width:1600px;aspect-ratio:16/9}
</style>
<h2>PALETA</h2><div class="row">${swatches}</div>
<h2>EL CANGREJO, SIN PLAN</h2><div class="row">${moods.map(m => cell(m, scene.crabSvg(m))).join('')}</div>
<h2>CON PLAN Y ROPA</h2><div class="row">${moods.map((m, i) => cell(`${m} · ${fun.OUTFITS[i * 3].name.en}`, scene.crabSvg(m, m === 'done' ? 1 : 0.4, i * 3))).join('')}</div>
<h2>TODA LA ROPA</h2><div class="row">${fun.OUTFITS.map((o, i) => cell(`${i} · ${o.name.en}`, scene.crabSvg('done', undefined, i), 290)).join('')}</div>
<h2>SUBAGENTES Y ECUALIZADOR</h2><div class="row">${['running', 'done', 'error'].map((s, i) => cell(s, scene.miniCrabSvg(s, i), 84)).join('')}${cell('sonando', scene.eqSvg(true))}${cell('quieto', scene.eqSvg(false))}</div>
<h2>MEDIDORES</h2><div class="row">${[[0.12,P.cyan],[0.46,P.cyan],[0.74,P.yellow],[0.93,P.red]].map(([f,c]) => cell(`contexto ${Math.round(f*100)}%`, scene.gaugeSvg(f, c, [0.7, 0.9]), 300)).join('')}${cell('plan 3/5', scene.gaugeSvg(0.6, P.cyan), 300)}${cell('plan listo', scene.gaugeSvg(1, P.green), 300)}${cell('sin medir', scene.gaugeSvg(undefined, P.muted, [0.7, 0.9]), 300)}</div>
<h2>EL FONDO</h2><div class="bd">${img(scene.backdropSvg(), 'height:100%')}</div>`

const out = resolve(process.argv[2] ?? join(here, 'preview.html'))
writeFileSync(out, html)
console.log(`listo: ${out}`)
