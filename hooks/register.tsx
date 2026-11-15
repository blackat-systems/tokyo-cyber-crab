import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type {
  AgentStatus,
  Mood,
  PlanItem,
  PlanStatus,
  Stats,
  Step,
  StepStatus,
  SubAgent,
} from '../types'
import { OUTFITS, hashIndex, pickOutfit, pickQuip } from './fun'
import { STRINGS, langOf } from './i18n'
import type { Lang, Strings } from './i18n'
import { BACKDROP, LOOK } from './look'
import { P } from './palette'
import { backdropSvg, crabSvg, eqSvg, miniCrabSvg } from './scene'

const PANE = 'tokyo-crab'
export const OUTFIT_EVERY_MS = 5 * 60 * 1000

// Cambiar el tag si cambian los campos: descarta lo guardado por una versión vieja.
const steps = atom({ plugin: 'tokyo-crab', key: 'steps' } as const, [] as Step[], {
  shape: 'steps-1',
})
const mood = atom({ plugin: 'tokyo-crab', key: 'mood' } as const, 'idle' as Mood, {
  shape: 'mood-1',
})
const plan = atom({ plugin: 'tokyo-crab', key: 'plan' } as const, [] as PlanItem[], {
  shape: 'plan-1',
})
const quip = atom({ plugin: 'tokyo-crab', key: 'quip' } as const, '', { shape: 'quip-1' })
const outfit = atom({ plugin: 'tokyo-crab', key: 'outfit' } as const, 0, { shape: 'outfit-1' })
const agents = atom({ plugin: 'tokyo-crab', key: 'agents' } as const, [] as SubAgent[], {
  shape: 'agents-1',
})
// El modo cyber: los colores Neo-Córdoba en toda la app y la ciudad de neón detrás
// de la ventana (donde la app dibuje temas), la franja de visor y la línea de espera.
// /cyber lo apaga y lo prende.
const backdrop = atom({ plugin: 'tokyo-crab', key: 'backdrop' } as const, true, { shape: 'backdrop-1' })
const NO_STATS: Stats = { prompts: 0, steps: 0, fails: 0, workMs: 0 }
const stats = atom({ plugin: 'tokyo-crab', key: 'stats' } as const, NO_STATS, { shape: 'stats-1' })
// El tunga-tunga al terminar una tarea. /cyber-sonido lo apaga y lo prende.
const sound = atom({ plugin: 'tokyo-crab', key: 'sound' } as const, true, { shape: 'sound-1' })

// El cangrejo opina de lo que pasó de verdad en cada tarea. Apagado de fábrica: cada
// opinión es una consulta chica al modelo y eso se paga. /cangrejo-opina lo prende.
const chatty = atom({ plugin: 'tokyo-crab', key: 'chatty' } as const, false, { shape: 'chatty-1' })
const OPINION_HOLD_MS = 60_000

// El tunga-tunga. `$.audio.play` suena donde hay reproductor (macOS). En Windows los mods
// no tienen uno, así que se le pide al propio sistema que toque el archivo: lo busca donde
// Claude Code deja el mod, sea instalado desde un repositorio o leído de una carpeta local.
const SOUND_ASSET = 'sounds/tunga.wav'
const WINDOWS_SOUND_ARGV = [
  'powershell.exe',
  '-NoProfile',
  '-WindowStyle',
  'Hidden',
  '-Command',
  "$h = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $env:USERPROFILE '.claude' }; " +
    "$f = Get-Item -Path (Join-Path $h 'plugins\\cache\\*\\tokyo-crab\\*\\sounds\\tunga.wav'), (Join-Path $h 'local-marketplaces\\tokyo-crab\\sounds\\tunga.wav') -ErrorAction SilentlyContinue | " +
    'Sort-Object LastWriteTime -Descending | Select-Object -First 1; ' +
    'if ($f) { (New-Object System.Media.SoundPlayer $f.FullName).PlaySync() }',
] as const

/** Toca el tunga-tunga; si no se puede, no pasa nada: es un chiche, no un aviso. */
async function playTunga($: EngineInterface): Promise<void> {
  try {
    if ((await $.env.get('OS')) === 'Windows_NT') {
      await $.process.run(WINDOWS_SOUND_ARGV, { timeoutMs: 8000 })
    } else {
      await $.audio.play({ asset: SOUND_ASSET })
    }
  } catch {
    // sin sonido
  }
}

/**
 * Pide el look entero. Una build que todavía no entiende colores rechaza la llamada:
 * ahí se pide sólo la ciudad de fondo, que es lo que sí sabe dibujar.
 */
async function applyLook($: EngineInterface) {
  try {
    return await $.theme.set(LOOK)
  } catch {
    return $.theme.set({ backdrop: LOOK.backdrop, overrideColorScheme: 'dark' })
  }
}

// ---------- El plan del cangrejo ----------

// Herramientas con las que Claude lleva su lista de tareas.
const isPlanTool = (tool: string) => tool === 'TodoWrite' || /(^|__)update_plan$/.test(tool)
const isWrapTool = (tool: string) => /(^|__)wrap_up$/.test(tool)

const asStatus = (v: unknown): PlanStatus =>
  v === 'completed' || v === 'in_progress' ? v : 'pending'

export function applyPlan(prev: PlanItem[], input: Record<string, unknown>): PlanItem[] {
  const list = Array.isArray(input.items)
    ? input.items
    : Array.isArray(input.todos)
      ? input.todos
      : undefined
  const next: PlanItem[] = list
    ? list.map(raw => {
        const it = (raw ?? {}) as Record<string, unknown>
        return { content: String(it.content ?? it.activeForm ?? ''), status: asStatus(it.status) }
      })
    : prev.map(it => ({ ...it }))

  if (input.advance === true) {
    const cur = next.findIndex(it => it.status === 'in_progress')
    if (cur >= 0) next[cur] = { ...next[cur]!, status: 'completed' }
    const nxt = next.findIndex((it, i) => i > cur && it.status === 'pending')
    if (nxt >= 0) next[nxt] = { ...next[nxt]!, status: 'in_progress' }
  }
  if (Array.isArray(input.done)) {
    for (const n of input.done) {
      const i = Number(n) - 1
      if (next[i]) next[i] = { ...next[i]!, status: 'completed' }
    }
  }
  if (typeof input.start === 'number') {
    const i = input.start - 1
    if (next[i]) next[i] = { ...next[i]!, status: 'in_progress' }
  }
  return next.filter(it => it.content !== '')
}

const progressOf = (p: PlanItem[]) =>
  p.length === 0 ? undefined : p.filter(it => it.status === 'completed').length / p.length

// ---------- Etiquetas de cada paso ----------

const base = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() ?? p
const clip = (s: string, n = 60) => {
  const one = s.replace(/\s+/g, ' ').trim()
  return one.length > n ? one.slice(0, n - 1) + '…' : one
}

// `cd "/ruta/larga" && git status` -> `git status` (el cd no dice nada util)
export const stripCd = (cmd: string) =>
  cmd.replace(/^\s*(cd|Set-Location|pushd)\s+("[^"]*"|'[^']*'|\S+)\s*(&&|;)\s*/i, '').trim()

export function labelFor(tool: string, input: Record<string, unknown>, lang: Lang = 'es'): string {
  const str = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '')
  const short = tool.startsWith('mcp__') ? tool.split('__').slice(2).join(' ') || tool : tool
  const verb = STRINGS[lang].verbs[tool] ?? short
  const detail =
    str('description') ||
    (str('file_path') && base(str('file_path'))) ||
    (str('notebook_path') && base(str('notebook_path'))) ||
    stripCd(str('command')) ||
    str('pattern') ||
    str('query') ||
    str('url') ||
    str('skill')
  return detail ? `${verb} · ${clip(detail)}` : verb
}

const MOOD_COLOR: Record<Mood, string> = {
  idle: P.muted,
  working: P.cyan,
  done: P.green,
  error: P.red,
}

const ICON: Record<StepStatus, { glyph: string; color: string }> = {
  running: { glyph: '◐', color: P.cyan },
  done: { glyph: '✓', color: P.green },
  error: { glyph: '✗', color: P.red },
  denied: { glyph: '⊘', color: P.muted },
}

const AGENT_COLOR: Record<AgentStatus, string> = {
  running: P.cyan,
  done: P.green,
  error: P.red,
}

const fmtMs = (ms?: number) =>
  ms === undefined ? '…' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`

/** Cuántos subagentes se dibujan enteros; el resto se cuenta en un renglón. */
const MAX_AGENTS = 4

/** Tres o más pasos seguidos del mismo tipo, ya hechos, se cuentan en un solo renglón. */
export function groupSteps(list: Step[]): Step[] {
  const verbOf = (s: Step) => s.label.split(' · ')[0] ?? s.label
  const out: Step[] = []
  let i = 0
  while (i < list.length) {
    const first = list[i]!
    let j = i + 1
    while (
      j < list.length &&
      first.status === 'done' &&
      list[j]!.status === 'done' &&
      verbOf(list[j]!) === verbOf(first)
    ) {
      j += 1
    }
    const run = list.slice(i, j)
    if (run.length >= 3) {
      const last = run[run.length - 1]!
      const at = last.label.indexOf(' · ')
      const detail = at >= 0 ? last.label.slice(at + 3) : ''
      out.push({
        ...last,
        label: `${verbOf(first)} ×${run.length}${detail === '' ? '' : ` · ${detail}`}`,
        ms: run.reduce((sum, s) => sum + (s.ms ?? 0), 0),
      })
    } else {
      out.push(...run)
    }
    i = j
  }
  return out
}

/** Lo que dice la franja de visor según cómo está el turno. */
export function bandState(
  m: Mood,
  isWorking: boolean,
  lang: Lang = 'es',
): { text: string; dot: string; color: string } {
  const t = STRINGS[lang].band
  if (m === 'error' && !isWorking) return { text: t.static, dot: P.red, color: P.red }
  if (isWorking || m === 'working') return { text: t.live, dot: P.red, color: P.cyan }
  if (m === 'done') return { text: t.done, dot: P.green, color: P.green }
  return { text: t.online, dot: P.green, color: P.muted }
}

/** Un tiempo de trabajo en palabras cortas: 45s, 4m 21s, 1h 05m. */
export function fmtWork(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

/**
 * La palabra de espera de este turno: cambia de un pedido al otro, no mientras gira.
 * Mientras corre una herramienta no hay palabra: ahí la app dice qué paso es.
 */
export function waitingWord(mode: string, turn: number, lang: Lang = 'es'): string | undefined {
  if (mode !== 'thinking' && mode !== 'requesting' && mode !== 'responding') return undefined
  const pool = STRINGS[lang].waiting[mode]
  return pool[turn % pool.length]
}

// ---------- Los comandos ----------
// Van acá arriba y no dentro de `register`: el motor sólo deja pasar `$` a funciones
// declaradas en el tope del archivo.

const outfitNameOf = (i: number | undefined, lang: Lang) => (i === undefined ? undefined : OUTFITS[i]?.name[lang])

async function openPane($: EngineInterface, S: Strings) {
  await $.ui.open({ id: PANE, title: S.title, backgroundColor: P.s0 })
  return { text: S.cmd.paneOpen }
}

async function toggleOpinion($: EngineInterface, S: Strings) {
  const isOn = await update($, chatty, v => !(v ?? false))
  return { text: isOn ? S.cmd.opinionOn : S.cmd.opinionOff }
}

async function toggleSound($: EngineInterface, S: Strings) {
  const isOn = await update($, sound, v => !(v ?? true))
  if (isOn) void playTunga($)
  return { text: isOn ? S.cmd.soundOn : S.cmd.soundOff }
}

async function changeOutfit($: EngineInterface, S: Strings, lang: Lang) {
  const i = await update($, outfit, o => pickOutfit(o))
  await update($, quip, () => S.cmd.outfitQuip)
  return { text: S.cmd.outfitNow(outfitNameOf(i, lang) ?? S.cmd.outfitFallback) }
}

// ---------- Hooks ----------

export const register: Register = (on, options) => {
  const lang = langOf(options.language)
  const S = STRINGS[lang]
  // Cómo se firman los mensajes propios: el nombre elegido en las opciones, o «VOS» / «YOU».
  const who = (typeof options.name === 'string' && options.name.trim() !== '' ? options.name.trim() : S.you).toUpperCase()
  const outfitName = (i: number | undefined) => outfitNameOf(i, lang)
  let restTimer: { cancel: () => void } | undefined
  let quipTimer: { cancel: () => void } | undefined
  let outfitTimer: { cancel: () => void } | undefined
  let turn = 0
  let turnStartedAt = 0
  // Hasta cuándo se deja quieta la frase del cangrejo, para que una opinión no se pise enseguida.
  let quipHeldUntil = 0
  // Cómo cerró cada pedido, para dibujar su fila en el hilo. No sobrevive a una recarga.
  const closings = new Map<string, { ms: number; steps: number; fails: number }>()

  on('session.start', async ($, e, next) => {
    // Los comandos llevan nombre en el idioma elegido; /cyber se llama igual en los dos.
    if (lang === 'es') {
      await $.command.register({ name: 'cangrejo', description: 'Abre el panel con los pasos de Claude' })
      await $.command.register({ name: 'cangrejo-ropa', description: 'Le cambia la pilcha al cangrejo' })
      await $.command.register({
        name: 'cangrejo-opina',
        description: 'El cangrejo comenta cada tarea terminada (gasta una consulta chica por tarea)',
      })
      await $.command.register({ name: 'cyber-sonido', description: 'Prende o apaga el tunga-tunga al terminar una tarea' })
      await $.command.register({
        name: 'cyber',
        description: 'Prende o apaga los colores Neo-Córdoba y la ciudad de neón de fondo',
      })
    } else {
      await $.command.register({ name: 'crab', description: "Opens the panel with Claude's steps" })
      await $.command.register({ name: 'crab-outfit', description: "Changes the crab's outfit" })
      await $.command.register({
        name: 'crab-talk',
        description: 'The crab comments on each finished task (one small model call per task)',
      })
      await $.command.register({ name: 'cyber-sound', description: 'Turns the end-of-task tunga-tunga on or off' })
      await $.command.register({
        name: 'cyber',
        description: 'Turns the Neo-Córdoba colors and the neon city backdrop on or off',
      })
    }
    if ((await read($, backdrop)) !== false) {
      // Sólo se ve en el escritorio y el teléfono; en la terminal no hay tema y no pasa nada.
      void applyLook($).catch(() => undefined)
    }
    await update($, quip, q => q || pickQuip(lang, 'idle'))
    // cada 12 segundos el cangrejo tira una frase nueva según su humor
    quipTimer?.cancel()
    quipTimer = await $.clock.every(12000, async () => {
      if ((await $.clock.now()) < quipHeldUntil) return
      const m = await read($, mood)
      await update($, quip, q => pickQuip(lang, m, q))
    })
    // cada 5 minutos se cambia de pilcha solo
    outfitTimer?.cancel()
    outfitTimer = $.clock.every(OUTFIT_EVERY_MS, async () => {
      const i = await update($, outfit, o => pickOutfit(o))
      await update($, quip, () => S.cmd.outfitAuto(outfitName(i) ?? S.cmd.outfitFallback))
    })
    void $.ui.open({ id: PANE, title: S.title, backgroundColor: P.s0 })
    return next(e)
  })

  // Cada comando responde por sus dos nombres, el castellano y el inglés.
  on('command.run', { command: 'cangrejo' }, $ => openPane($, S))
  on('command.run', { command: 'crab' }, $ => openPane($, S))
  on('command.run', { command: 'cangrejo-opina' }, $ => toggleOpinion($, S))
  on('command.run', { command: 'crab-talk' }, $ => toggleOpinion($, S))
  on('command.run', { command: 'cyber-sonido' }, $ => toggleSound($, S))
  on('command.run', { command: 'cyber-sound' }, $ => toggleSound($, S))
  on('command.run', { command: 'cangrejo-ropa' }, $ => changeOutfit($, S, lang))
  on('command.run', { command: 'crab-outfit' }, $ => changeOutfit($, S, lang))

  on('command.run', { command: 'cyber' }, async $ => {
    const on_ = await update($, backdrop, v => !(v ?? true))
    if (on_) {
      const r = await applyLook($)
      return { text: r.isDrawn ? S.cmd.cyberOn : S.cmd.cyberOnUnseen }
    }
    await $.theme.clear()
    return { text: S.cmd.cyberOff }
  })

  // El fondo: sólo dibuja el propio, y deja en paz el de cualquier otro mod.
  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.plugin !== 'tokyo-crab' || e.props.scene !== BACKDROP) return next(e)
    const els = $.ui.resolve(e)
    const { Box } = els
    const Svg = 'Svg' in els ? els.Svg : undefined
    if (!Svg) return next(e)
    return (
      <Box width="100%" height="100%" backgroundColor={P.void}>
        <Svg source={backdropSvg()} alt={S.alt.backdrop} />
      </Box>
    )
  })

  on('prompt.submit', async ($, e, next) => {
    turn += 1
    turnStartedAt = await $.clock.now()
    quipHeldUntil = 0
    await update($, stats, s => ({ ...(s ?? NO_STATS), prompts: (s ?? NO_STATS).prompts + 1 }))
    restTimer?.cancel()
    await update($, steps, () => [])
    // los subagentes que siguen corriendo (en segundo plano) se quedan
    await update($, agents, l => l.filter(a => a.status === 'running'))
    await update($, mood, () => 'working' as Mood)
    await update($, quip, q => pickQuip(lang, 'working', q))
    return next(e)
  }).catch(($, e, next) => next(e))

  // Un subagente nace: lo anotamos con su descripción y tipo.
  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    if (r.agentId !== undefined) {
      const agent: SubAgent = {
        id: r.agentId,
        // completa: la fila del subagente la envuelve en renglones, no la corta
        description: clip(e.description || e.subagentType, 160),
        type: e.subagentType,
        status: 'running',
        startedAt: await $.clock.now(),
        tools: 0,
      }
      await update($, agents, l => [...l.filter(a => a.id !== agent.id), agent].slice(-20))
    }
    return r
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) {
      const id = e.agentId
      await update($, agents, l =>
        l.map(a => (a.id === id ? { ...a, status: 'running' as AgentStatus, ms: undefined } : a)),
      )
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId !== undefined) {
      const id = e.agentId
      const now = await $.clock.now()
      const failed = (e as { reason?: string }).reason === 'error'
      await update($, agents, l =>
        l.map(a =>
          a.id === id
            ? { ...a, status: (failed ? 'error' : 'done') as AgentStatus, ms: now - a.startedAt }
            : a,
        ),
      )
    } else {
      const list = await read($, steps)
      const failed = list.some(s => s.status === 'error')
      await update($, steps, l =>
        l.map(s => (s.status === 'running' ? { ...s, status: 'done' as StepStatus } : s)),
      )
      await update($, mood, () => (failed ? 'error' : 'done') as Mood)
      await update($, quip, q => pickQuip(lang, failed ? 'error' : 'done', q))
      const worked = turnStartedAt > 0 ? (await $.clock.now()) - turnStartedAt : 0
      await update($, stats, s => ({ ...(s ?? NO_STATS), workMs: (s ?? NO_STATS).workMs + worked }))
      // Sólo si hubo trabajo de verdad: una charla no merece ni fila ni música.
      if (list.length > 0) {
        const id = `cierre-${turn}`
        closings.set(id, { ms: worked, steps: list.length, fails: list.filter(s => s.status === 'error').length })
        if ((await read($, backdrop)) !== false) void $.ui.place({ id }).catch(() => undefined)
        if ((await read($, sound)) !== false) void playTunga($)
        if ((await read($, chatty)) === true) {
          const did = groupSteps(list)
            .slice(-12)
            .map(s => `- ${s.label}${s.status === 'error' ? S.pane.failedMark : ''}`)
            .join('\n')
          void $.model
            .complete({ model: 'haiku', system: S.opinionRules, prompt: did, maxTokens: 80, timeoutMs: 10_000 })
            .then(async r => {
              if (!r.isAnswered || r.text.trim() === '') return
              quipHeldUntil = (await $.clock.now()) + OPINION_HOLD_MS
              await update($, quip, () => clip(r.text.replace(/^["«]|["»]$/g, ''), 150))
            })
            .catch(() => undefined)
        }
      }
      restTimer?.cancel()
      restTimer = await $.clock.after(6000, async () => {
        await update($, mood, () => 'idle' as Mood)
        if ((await $.clock.now()) < quipHeldUntil) return
        await update($, quip, q => pickQuip(lang, 'idle', q))
      })
    }
    return r
  })

  on('tool.call', async ($, e, next) => {
    const input = e as unknown as Record<string, unknown>
    // Las herramientas de plan alimentan el plan del cangrejo, no la lista de pasos.
    if (isPlanTool(e.tool)) {
      await update($, plan, p => applyPlan(p, input))
      return next(e)
    }
    if (isWrapTool(e.tool)) {
      await update($, plan, p => p.map(it => ({ ...it, status: 'completed' as PlanStatus })))
      return next(e)
    }
    const agentId = (e as { agentId?: string }).agentId
    // Lo que hace un subagente va a su fila, abajo, no a la lista principal.
    if (agentId !== undefined) {
      const label = labelFor(e.tool, input, lang)
      await update($, agents, l =>
        l.map(a =>
          a.id === agentId
            ? { ...a, tools: a.tools + 1, last: label, status: 'running' as AgentStatus }
            : a,
        ),
      )
      return next(e)
    }
    const startedAt = await $.clock.now()
    const step: Step = {
      id: e.tool_use_id,
      tool: e.tool,
      label: labelFor(e.tool, input, lang),
      status: 'running',
      startedAt,
      isSub: false,
    }
    await update($, steps, list => [...list.filter(s => s.id !== step.id), step].slice(-80))
    await update($, mood, m => (m === 'error' ? m : ('working' as Mood)))

    const ran = await next(e)
    const ms = (await $.clock.now()) - startedAt
    const status: StepStatus =
      ran.deny !== undefined ? 'denied' : ran.isError === true ? 'error' : 'done'
    await update($, steps, list =>
      list.map(s => (s.id === step.id ? { ...s, status, ms } : s)),
    )
    await update($, stats, s => ({
      ...(s ?? NO_STATS),
      steps: (s ?? NO_STATS).steps + 1,
      fails: (s ?? NO_STATS).fails + (status === 'error' ? 1 : 0),
    }))
    return ran
  }).catch(($, e, next) => next(e))

  // La línea de espera habla en cyber-cordobés mientras piensa, pide o responde.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if ((await read($, backdrop)) === false || e.props.message !== null) return next(e)
    const word = waitingWord(e.props.mode, turn, lang)
    return word === undefined ? next(e) : next({ ...e, props: { ...e.props, word } })
  })

  // Una franja fina de visor sobre el cuadro de texto.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey || (await read($, backdrop)) === false) return below
    const { Box, Text } = $.ui.resolve(e)
    const st = bandState(await read($, mood), e.props.isWorking, lang)
    const now = (await read($, steps)).filter(s => s.status === 'running')
    const current = now[now.length - 1]
    const helpers = (await read($, agents)).filter(a => a.status === 'running').length
    return (
      <Box flexDirection="column">
        {below}
        <Box flexDirection="row" gap={1}>
          <Text color={P.magenta} bold>
            ◢
          </Text>
          <Text color={P.muted}>NEO-CBA // SECTOR 7</Text>
          <Text color={st.dot}>●</Text>
          <Text color={st.color}>{st.text}</Text>
          {current !== undefined && (
            <Text color={P.text} wrap="truncate-end">
              ▸ {current.label}
            </Text>
          )}
          {helpers > 0 && (
            <Text color={P.cyan}>{S.pane.helpers(helpers)}</Text>
          )}
        </Box>
      </Box>
    )
  })

  // La fila que cierra cada pedido dentro del hilo.
  on('ui.render', { component: 'Placed' }, async ($, e, next) => {
    const c = e.props.plugin === 'tokyo-crab' ? closings.get(e.props.id) : undefined
    if (c === undefined || (await read($, backdrop)) === false) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" gap={1}>
        <Text color={P.magenta}>▰▰▰</Text>
        <Text color={c.fails > 0 ? P.red : P.green} bold>
          {c.fails > 0 ? S.closing.failed : S.closing.ok}
        </Text>
        <Text color={P.muted} tabular>
          · {fmtWork(c.ms)} · {S.closing.steps(c.steps)}
          {c.fails > 0 ? ` · ${S.closing.fails(c.fails)}` : ''}
        </Text>
        <Text color={P.cyan}>▰▰▰</Text>
      </Box>
    )
  })

  // Los mensajes propios llevan su etiqueta; el mensaje en sí lo sigue dibujando la app.
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const row = await next(e)
    if (e.props.origin?.kind !== 'composer' || (await read($, backdrop)) === false) return row
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="flex-end">
          <Text color={P.cyan} bold>
            ▸ {who}
          </Text>
        </Box>
        {row}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text } = els
    const Svg = 'Svg' in els ? els.Svg : undefined
    const list = await read($, steps)
    const m = await read($, mood)
    const p = await read($, plan)
    const progress = progressOf(p)
    const pDone = p.filter(it => it.status === 'completed').length
    const ag = await read($, agents)
    const rows = e.viewport?.rows ?? 40
    const agRunning = ag.filter(a => a.status === 'running').length
    const agSorted = [...ag].sort(
      (a, b) => Number(b.status === 'running') - Number(a.status === 'running') || b.startedAt - a.startedAt,
    )
    // La caja de subagentes ocupa lo que necesita: vacía, un par de renglones.
    const agShown = agSorted.slice(0, MAX_AGENTS)
    const agHidden = agSorted.length - agShown.length
    const agRows = ag.length === 0 ? 4 : 3 + agShown.length * 4 + (agHidden > 0 ? 1 : 0)
    const room = Math.max(3, rows - agRows - 18 - (p.length ? p.length + 3 : 0))
    const st = (await read($, stats)) ?? NO_STATS
    const done = list.filter(s => s.status === 'done').length
    const running = list.filter(s => s.status === 'running').length
    const moodText = S.mood[m]
    const moodColor = MOOD_COLOR[m]
    const q = await read($, quip)
    const o = await read($, outfit)
    const wearing = outfitName(o)

    return (
      <Box flexDirection="column" backgroundColor={P.s0} height="100%">
        {/* ── mitad de arriba: Claude, su plan y sus pasos ── */}
        <Box flexDirection="column" padding={1} gap={1} flexGrow={1} flexShrink={1} minHeight={0} overflow="hidden">
          <Box flexDirection="column" backgroundColor={P.void}>
            {Svg ? (
              <Svg
                source={crabSvg(m, progress, o)}
                alt={S.alt.crab(moodText)}
                isInteractive
              />
            ) : (
              <Text color={m === 'error' ? P.red : P.crab}>
                {m === 'working' ? ' (\\/)(°,,,°)(\\/) ' : m === 'idle' ? ' (\\/)(-,,,-)(\\/) zZ' : ' \\(\\/)(^,,,^)(\\/)/ '}
              </Text>
            )}
          </Box>

          {q !== '' && (
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor={P.magenta}
              backgroundColor={P.s1}
              paddingX={1}
              minWidth={0}
            >
              <Text color={P.text} italic>
                «{q}»
              </Text>
              {wearing && (
                <Text color={P.muted} wrap="truncate-end">
                  {S.pane.wearing(wearing)}
                </Text>
              )}
            </Box>
          )}

          {/* barra de estado, tipo visor */}
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            <Text color={P.magenta} bold>
              ◢ CLAUDE
            </Text>
            <Text color={P.muted}>//</Text>
            <Text color={moodColor} bold>
              {moodText}
            </Text>
            <Text color={P.muted} tabular>
              {S.pane.counter(String(done).padStart(2, '0'), running)}
            </Text>
          </Box>

          {p.length > 0 && (
            <Box flexDirection="column" backgroundColor={P.s1} padding={1}>
              <Box flexDirection="row" gap={1}>
                <Text color={P.magenta} bold>
                  ▍
                </Text>
                <Text color={P.text} bold>
                  {S.pane.plan}
                </Text>
                <Text color={pDone === p.length ? P.green : P.cyan} tabular>
                  {'▰'.repeat(Math.round((progress ?? 0) * 10))}
                  {'▱'.repeat(10 - Math.round((progress ?? 0) * 10))} {pDone}/{p.length}
                </Text>
              </Box>
              {p.map(it => (
                <Box flexDirection="row" gap={1}>
                  <Text
                    color={
                      it.status === 'completed' ? P.green : it.status === 'in_progress' ? P.cyan : P.muted
                    }
                  >
                    {it.status === 'completed' ? '✓' : it.status === 'in_progress' ? '▶' : '○'}
                  </Text>
                  <Text
                    color={
                      it.status === 'completed' ? P.muted : it.status === 'in_progress' ? P.text : P.dim
                    }
                    bold={it.status === 'in_progress'}
                    wrap="wrap"
                  >
                    {it.content}
                  </Text>
                </Box>
              ))}
            </Box>
          )}

          <Box flexDirection="column">
            {list.length === 0 && (
              <Text color={P.muted} italic>
                {S.pane.empty}
              </Text>
            )}
            {/* lo más nuevo arriba: si no entra, se corta lo viejo */}
            {groupSteps(list)
              .slice(-room)
              .reverse()
              .map(s => (
                <Box flexDirection="row" gap={1}>
                  <Text color={ICON[s.status].color}>{ICON[s.status].glyph}</Text>
                  {/* el paso en curso se lee entero; los ya hechos, en un renglón */}
                  <Text
                    color={s.status === 'running' ? P.text : s.status === 'done' ? P.dim : ICON[s.status].color}
                    bold={s.status === 'running'}
                    wrap={s.status === 'running' ? 'wrap' : 'truncate-end'}
                  >
                    {s.label}
                  </Text>
                  <Text color={P.muted} tabular>
                    {fmtMs(s.ms)}
                  </Text>
                </Box>
              ))}
          </Box>
        </Box>

        {/* ── abajo: los subagentes; la caja mide lo que necesita ── */}
        <Box
          flexDirection="column"
          flexShrink={0}
          borderStyle="round"
          borderColor={agRunning ? P.cyan : P.line}
          backgroundColor={P.s1}
          paddingX={1}
          gap={1}
        >
          <Box flexDirection="row" gap={1}>
            <Text color={P.magenta} bold>
              ▍
            </Text>
            <Text color={P.text} bold>
              {S.pane.subagents}
            </Text>
            <Text color={P.muted}>
              {agRunning ? S.pane.agentsLive(agRunning) : ag.length ? S.pane.agentsDone : S.pane.agentsNone}
            </Text>
          </Box>
          {agShown.map(a => (
            <Box flexDirection="row" gap={1} alignItems="flex-start" width="100%">
              <Box flexShrink={0}>
                {Svg ? (
                  <Svg
                    source={miniCrabSvg(a.status, hashIndex(a.id, OUTFITS.length))}
                    alt={S.alt.agent(S.agent[a.status])}
                    width={42}
                    height={36}
                    isInteractive
                  />
                ) : (
                  <Text color={AGENT_COLOR[a.status]}>(\/)</Text>
                )}
              </Box>
              {/* minWidth 0 deja que la columna se achique; el texto baja de renglón, no se corta */}
              <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
                <Text color={a.status === 'running' ? P.text : P.dim} bold wrap="wrap">
                  {a.description}
                </Text>
                <Box flexDirection="row" gap={1} flexWrap="wrap">
                  <Text color={AGENT_COLOR[a.status]}>{S.agent[a.status]}</Text>
                  <Text color={P.muted}>
                    · {a.type} · {S.pane.tools(a.tools)}
                    {a.status === 'running' ? '' : ` · ${fmtMs(a.ms)}`}
                  </Text>
                </Box>
                {a.status === 'running' && a.last !== undefined && (
                  <Text color={P.muted} italic wrap="wrap">
                    {a.last}
                  </Text>
                )}
              </Box>
            </Box>
          ))}
          {agHidden > 0 && (
            <Text color={P.muted} italic>
              {S.pane.more(agHidden)}
            </Text>
          )}
        </Box>

        {/* ── el marcador de la sesión ── */}
        <Box
          flexDirection="column"
          flexShrink={0}
          borderStyle="round"
          borderColor={P.line}
          backgroundColor={P.s1}
          paddingX={1}
        >
          <Box flexDirection="row" gap={1}>
            <Text color={P.magenta} bold>
              ▍
            </Text>
            <Text color={P.text} bold>
              {S.pane.score}
            </Text>
            <Text color={P.muted}>{S.pane.session}</Text>
          </Box>
          {/* el ecualizador late mientras hay laburo y descansa cuando no */}
          {Svg && <Svg source={eqSvg(m === 'working')} alt={S.alt.eq} height={26} isInteractive />}
          <Box flexDirection="row" gap={2} flexWrap="wrap">
            {[
              { n: String(st.prompts), label: S.pane.cells.prompts, color: P.cyan },
              { n: String(st.steps), label: S.pane.cells.steps, color: P.green },
              { n: String(st.fails), label: S.pane.cells.fails, color: st.fails > 0 ? P.red : P.muted },
              { n: fmtWork(st.workMs), label: S.pane.cells.work, color: P.crab },
            ].map(cell => (
              <Box flexDirection="column">
                <Text color={cell.color} bold tabular>
                  {cell.n}
                </Text>
                <Text color={P.muted}>{cell.label}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    )
  })
}
