import { expect, test } from 'claude-code/testing'

import { OUTFITS, QUIPS } from '../hooks/fun'
import { STRINGS } from '../hooks/i18n'
import { LOOK, LOOK_PROBLEMS } from '../hooks/look'
import { checkColors } from '../hooks/make-colors.js'
import { gaugeSvg } from '../hooks/scene'
import { bandState, contextBar, contextColor, fmtTokens, fmtWork, groupSteps, waitingWord } from '../hooks/register'

// El mod sale en castellano, el idioma en que nació. Estos tests lo piden igual a propósito:
// así no dependen de cuál sea el valor de fábrica. Los de inglés piden `en`.
const ES = { options: { language: 'es' } } as const
const EN = { options: { language: 'en' } } as const

const pane = (title: string) =>
  ({
    plugin: 'tokyo-crab',
    component: 'Pane',
    requestId: 'tokyo-crab',
    props: {
      title,
      isFocused: false,
      bodyColumns: 40,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 30 },
      view: {},
    },
  }) as const
const PANE = pane('Pasos de Claude')
const PANE_EN = pane("Claude's steps")

// El panel muestra todas sus secciones desplegadas, siempre: no hay nada que tocar para abrirlas
// y se recorre con la ruedita. Cada sección lleva su título y, en el renglón de abajo, un resumen
// de lo que tiene. Estos ayudantes leen eso, en el orden en que aparece.
type Card = { id: string; title: string; summary: string }
type Drawing = {
  findAll: (q: { type: 'Text' | 'Button' }) => Promise<readonly { text: string; props: Record<string, unknown> }[]>
}
const SECTIONS = ['plan', 'steps', 'agents', 'score'] as const
const menu = async (ui: unknown, lang: 'es' | 'en' = 'es'): Promise<Card[]> => {
  const texts = (await (ui as Drawing).findAll({ type: 'Text' })).map(t => t.text)
  const titles = STRINGS[lang].pane.tabs
  return SECTIONS.map(id => ({ id, at: texts.indexOf(titles[id]) }))
    .filter(s => s.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(s => ({ id: s.id, title: texts[s.at]!, summary: texts[s.at + 1] ?? '' }))
}
const card = async (ui: unknown, id: string, lang: 'es' | 'en' = 'es') => (await menu(ui, lang)).find(c => c.id === id)
const shown = async (ui: unknown, lang: 'es' | 'en' = 'es') => (await menu(ui, lang)).map(c => c.title)
const buttons = async (ui: unknown) => (ui as Drawing).findAll({ type: 'Button' })

test('lista los pasos con etiqueta en español y el cangrejo trabaja', ES, async ($, on) => {
  on('command.register', () => ({ value: { command: 'cangrejo' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => e as never)
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: 'C:/x/src/app.ts' })

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const row = await ui.find({ type: 'Text', text: /Leyendo/ })
    expect(row?.text).toBe('Leyendo · app.ts')
    await ui.unmount()
  }
})

test('vacío muestra el cartel', ES, async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Acá aparece/ }))?.text).toBe(
    'Acá aparece cada cosa que hace Claude: los archivos que lee, lo que cambia y los comandos que corre. Lo más nuevo, arriba.',
  )
  await ui.unmount()
})

test('el plan del cangrejo se completa con update_plan', ES, async ($, on) => {
  on('tool.call', () => ({ result: {} }))
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  const PLAN = 'mcp__ccd_turn__update_plan'

  await $.tool.call({
    tool: PLAN,
    items: [
      { content: 'Leer el código', status: 'in_progress' },
      { content: 'Escribir el mod', status: 'pending' },
    ],
  } as never)
  await $.tool.call({ tool: PLAN, advance: true } as never)

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await card(ui, 'plan'))?.summary).toBe('1 de 2 tareas terminadas')
    expect((await ui.find({ type: 'Text', text: /^▶$/ }))?.text).toBe('▶')
    // las llamadas de plan no aparecen como pasos
    expect(await ui.find({ type: 'Text', text: /update_plan/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('los subagentes van a la mitad de abajo, no a la lista principal', ES, async ($, on) => {
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('agent.spawn', () => ({ model: 'haiku', agentId: 'ag-1' }))
  on('tool.call', () => ({ result: {} }))

  await $.agent.spawn({
    tool_use_id: 'tu-1',
    prompt: 'buscá cosas',
    description: 'Explorar el repo',
    subagentType: 'Explore',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'opus',
  } as never)
  await $.tool.call({ tool: 'Grep', pattern: 'TODO', agentId: 'ag-1' } as never)

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    // la lista de pasos sigue vacía: lo que hace el subagente no se anota ahí
    expect((await ui.find({ type: 'Text', text: /Acá aparece/ }))?.text).toBeDefined()
    expect((await card(ui, 'steps'))?.summary).toBe('Todavía nada en este pedido')
    // la sección de subagentes lo cuenta entero, con su última acción en su propio renglón
    expect((await card(ui, 'agents'))?.title).toBe('Otros Claude ayudando')
    expect((await card(ui, 'agents'))?.summary).toBe('1 trabajando ahora')
    expect((await ui.find({ type: 'Text', text: /Explorar el repo/ }))?.text).toBe('Explorar el repo')
    expect((await ui.find({ type: 'Text', text: /1 herr\./ }))?.text).toContain('Explore')
    expect((await ui.find({ type: 'Text', text: /Buscando · TODO/ }))?.text).toBe('Buscando · TODO')
    await ui.unmount()
  }
})

test('la descripción larga de un subagente se muestra entera, sin puntos suspensivos', ES, async ($, on) => {
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('agent.spawn', () => ({ model: 'haiku', agentId: 'ag-largo' }))
  const largo = 'Revisar de forma independiente el cambio de Copias con las tres opciones del aviso'
  expect(largo.length).toBeGreaterThan(50)

  await $.agent.spawn({
    tool_use_id: 'tu-2',
    prompt: 'revisá',
    description: largo,
    subagentType: 'ecc:kotlin-reviewer',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'opus',
  } as never)

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Revisar de forma/ }))?.text).toBe(largo)
    await ui.unmount()
  }
})

test('sin subagentes la pestaña lo dice', ES, async $ => {
  const vacio = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await card(vacio, 'agents'))?.summary).toBe('Ninguno por ahora')
  expect((await vacio.find({ type: 'Text', text: /reparte un trabajo/ }))?.text).toContain('otros Claude')
  await vacio.unmount()
})

test('con muchos subagentes, la pestaña dibuja cuatro y cuenta los que no entran', ES, async ($, on) => {
  let t = 1000
  let n = 0
  on('clock.now', () => ({ value: (t += 250) }))
  on('agent.spawn', () => ({ model: 'haiku', agentId: `ag-${(n += 1)}` }))
  for (let i = 1; i <= 6; i += 1) {
    await $.agent.spawn({
      tool_use_id: `tu-m${i}`,
      prompt: 'x',
      description: `Tarea ${i}`,
      subagentType: 'Explore',
      provider: { plugin: 'engine', tier: 'core' },
      parentModel: 'opus',
    } as never)
  }
  const lleno = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await card(lleno, 'agents'))?.summary).toBe('6 trabajando ahora')
  expect((await lleno.findAll({ type: 'Text', text: /^Tarea \d$/ })).length).toBe(4)
  expect((await lleno.find({ type: 'Text', text: /más$/ }))?.text).toBe('+ 2 más')
  await lleno.unmount()
})

test('los comandos pierden el cd del principio', ES, async ($, on) => {
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('tool.call', () => ({ result: {} }))
  await $.tool.call({ tool: 'Bash', command: 'cd "/c/Users/User/Desktop/Proj" && git status' } as never)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Ejecutando/ }))?.text).toBe('Ejecutando · git status')
  await ui.unmount()
})

test('el cangrejo cambia de pilcha y habla en cordobés', ES, async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const r = await $.command.run({ command: 'cangrejo-ropa' } as never)
  expect(JSON.stringify(r)).toContain('El cangrejo ahora tiene puesto')

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /culiau/ }))?.text).toContain('¿Cómo me queda?')
  // dice qué tiene puesto y nada más: cada cuánto se cambia estaba de más
  const pilcha = (await ui.find({ type: 'Text', text: /hoy viene con/ }))?.text ?? ''
  expect(pilcha).toMatch(/^hoy viene con \S/)
  expect(pilcha).not.toContain('cada')
  await ui.unmount()
})

test('cada 5 minutos se cambia la pilcha solo', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  const timers: { ms: number; fn: () => unknown }[] = []
  on('clock.every', (_, e) => {
    const t = e as unknown as { ms: number; fn: () => unknown }
    timers.push(t)
    return { value: { cancel: () => {} } } as never
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(timers.some(t => t.ms === 300000)).toBe(true)
})

const BACKDROP = (plugin: string, scene: string) =>
  ({
    plugin: 'tokyo-crab',
    component: 'Backdrop',
    requestId: 'backdrop',
    props: { scene, plugin, glass: { blur: 12, opacity: 0.8 }, overrideColorScheme: 'dark' },
  }) as const

test('el look se pide con la forma que la app entiende y con colores que va a pintar', async () => {
  // la forma vieja ({ id, colorScheme }) la app la rechaza sin avisar
  expect(LOOK.backdrop).toEqual({ scene: 'neo-cba', glass: { blur: 6, tint: '#14141f', opacity: 0.62 } })
  expect(LOOK.overrideColorScheme).toBe('dark')
  expect(LOOK.colors?.label).toBe('Neo-Córdoba')
  expect(Object.keys(LOOK.colors?.inputs ?? {})).toEqual(['dark'])
  // una sola de estas líneas y el escritorio ignora el tema entero
  expect(LOOK_PROBLEMS.filter(p => p.startsWith("Desktop won't paint"))).toEqual([])
  expect(checkColors(LOOK.colors).filter(p => p.startsWith("Desktop won't paint"))).toEqual([])
})

test('al arrancar pide la ciudad de fondo y /cyber la apaga y la vuelve a prender', ES, async ($, on) => {
  const sets: unknown[] = []
  let clears = 0
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('theme.clear', () => {
    clears += 1
    return { value: { isDrawn: false, reason: 'cleared' } }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(JSON.stringify(sets[0])).toContain('"scene":"neo-cba"')
  // los colores viajan en la misma llamada: un set nombra el tema entero
  expect(JSON.stringify(sets[0])).toContain('Neo-Córdoba')

  expect(JSON.stringify(await $.command.run({ command: 'cyber' } as never))).toContain('Modo cyber apagado')
  expect(clears).toBe(1)
  expect(JSON.stringify(await $.command.run({ command: 'cyber' } as never))).toContain('con Neo-Córdoba de fondo')
  expect(sets.length).toBe(2)
})

test('si la app todavía no entiende colores, /cyber pide sólo la ciudad de fondo', EN, async ($, on) => {
  const sets: Record<string, unknown>[] = []
  on('theme.set', (_, e) => {
    sets.push(e as Record<string, unknown>)
    if ('colors' in e) throw new Error('theme.set does not know the attribute "colors"')
    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('theme.clear', () => ({ value: { isDrawn: false, reason: 'cleared' } }))
  await $.command.run({ command: 'cyber' } as never)
  const said = JSON.stringify(await $.command.run({ command: 'cyber' } as never))
  expect(said).toContain('Cyber mode on')
  // primero lo intenta entero; rechazado, vuelve sin colores
  expect(sets.length).toBe(2)
  expect('colors' in sets[1]!).toBe(false)
  expect(JSON.stringify(sets[1])).toContain('"scene":"neo-cba"')
})

test('dibuja su propio fondo y deja en paz el de otro mod', async ($, on) => {
  on('ui.render', ($$, e) => {
    const { Text } = $$.ui.resolve(e)
    return <Text>fondo ajeno</Text>
  })
  const own = await $.ui.mount({ ...BACKDROP('tokyo-crab', 'neo-cba'), surface: 'desktop' })
  expect(await own.find({ type: 'Svg' })).toBeDefined()
  expect(await own.find({ type: 'Text', text: /fondo ajeno/ })).toBeUndefined()
  await own.unmount()

  const other = await $.ui.mount({ ...BACKDROP('otro-mod', 'playa'), surface: 'desktop' })
  expect(await other.find({ type: 'Text', text: /fondo ajeno/ })).toBeDefined()
  await other.unmount()
})

const SPINNER = (mode: 'thinking' | 'tool-use', word = 'Working', message: string | null = null) =>
  ({
    plugin: 'tokyo-crab',
    component: 'Spinner',
    requestId: 'spinner',
    props: { word, message, suffix: '…', mode },
  }) as const

test('la línea de espera habla en cyber mientras piensa y no pisa el paso de una herramienta', ES, async ($, on) => {
  on('ui.render', ($$, e) => {
    const { Text } = $$.ui.resolve(e)
    return <Text>{String((e.props as { word?: string }).word)}</Text>
  })
  const thinking = await $.ui.mount({ ...SPINNER('thinking'), surface: 'desktop' })
  expect((await thinking.find({ type: 'Text' }))?.text).toBe('Pidiéndole un tema a la Mona')
  await thinking.unmount()

  const tool = await $.ui.mount({ ...SPINNER('tool-use', 'Creating notes.md'), surface: 'desktop' })
  expect((await tool.find({ type: 'Text' }))?.text).toBe('Creating notes.md')
  await tool.unmount()
})

test('si la app no dibuja fondos, /cyber lo dice en castellano y sin tecnicismos', ES, async ($, on) => {
  on('theme.set', () => ({ value: { isDrawn: false, reason: 'no attached desktop or mobile client says it draws backdrops' } }))
  on('theme.clear', () => ({ value: { isDrawn: false, reason: 'cleared' } }))
  await $.command.run({ command: 'cyber' } as never)
  const said = JSON.stringify(await $.command.run({ command: 'cyber' } as never))
  expect(said).toContain('todavía no se ve')
  expect(said).not.toContain('attached')
})

const BAND = {
  plugin: 'tokyo-crab',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: true, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 9 }, view: {} },
} as const

test('la franja de visor aparece sobre el cuadro de texto y cede ante una encuesta', ES, async ($, on) => {
  on('ui.render', ($$, e) => {
    const { Text } = $$.ui.resolve(e)
    return <Text>lo de abajo</Text>
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /transmitiendo/ }))?.text).toBe('transmitiendo')
  expect(await ui.find({ type: 'Text', text: /lo de abajo/ })).toBeDefined()
  // sin el cartel de ciudad: la franja dice el estado y nada de relleno
  expect(await ui.find({ type: 'Text', text: /NEO-CBA|SECTOR/ })).toBeUndefined()
  await ui.unmount()

  const survey = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'desktop' })
  expect(await survey.find({ type: 'Text', text: /transmitiendo/ })).toBeUndefined()
  await survey.unmount()
})

const step = (id: string, label: string, status: 'running' | 'done' | 'error' = 'done', ms = 100) =>
  ({ id, tool: 'Bash', label, status, startedAt: 0, ms, isSub: false }) as const

test('tres pasos seguidos del mismo tipo se cuentan en un renglón y los demás quedan como estaban', async () => {
  const list = [
    step('1', 'Leyendo · a.ts'),
    step('2', 'Ejecutando · git status'),
    step('3', 'Ejecutando · npm test'),
    step('4', 'Ejecutando · git diff', 'done', 250),
    step('5', 'Editando · b.ts'),
    step('6', 'Editando · c.ts'),
    step('7', 'Ejecutando · build', 'running'),
  ]
  const grouped = groupSteps([...list])
  expect(grouped.map(s => s.label)).toEqual([
    'Leyendo · a.ts',
    'Ejecutando ×3 · git diff',
    'Editando · b.ts',
    'Editando · c.ts',
    'Ejecutando · build',
  ])
  expect(grouped[1]?.ms).toBe(450)
  // un paso que falló corta la corrida: no se esconde dentro de un grupo
  const withError = groupSteps([step('1', 'Ejecutando · a'), step('2', 'Ejecutando · b', 'error'), step('3', 'Ejecutando · c'), step('4', 'Ejecutando · d')])
  expect(withError.length).toBe(4)
})

test('la franja dice cómo está el turno y los tiempos se leen cortos', async () => {
  expect(bandState('idle', false, 'es').text).toBe('en línea')
  expect(bandState('working', false, 'es').text).toBe('transmitiendo')
  expect(bandState('idle', true, 'es').text).toBe('transmitiendo')
  expect(bandState('done', false, 'es').text).toBe('listo el pollo')
  expect(bandState('error', false, 'es').text).toBe('interferencia')
  expect(fmtWork(45_000)).toBe('45s')
  expect(fmtWork(261_000)).toBe('4m 21s')
  expect(fmtWork(3_900_000)).toBe('1h 05m')
})

test('el marcador suma pedidos, pasos y fallas de la sesión', ES, async ($, on) => {
  let t = 1000
  on('clock.now', () => ({ value: (t += 500) }))
  on('prompt.submit', (_, e) => e as never)
  let n = 0
  on('tool.call', () => ((n += 1) === 2 ? { result: {}, isError: true } : { result: {} }))
  await $.prompt.submit({ text: 'hola' } as never)
  await $.tool.call({ tool: 'Read', file_path: 'a.ts' })
  await $.tool.call({ tool: 'Bash', command: 'false' } as never)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  // el resumen de la sesión está siempre a la vista: las cifras grandes con su rótulo
  expect((await ui.find({ type: 'Text', text: /^PEDIDOS$/ }))?.text).toBe('PEDIDOS')
  expect((await ui.find({ type: 'Text', text: /^FALLAS$/ }))?.text).toBe('FALLAS')
  const numbers = (await ui.findAll({ type: 'Text', text: /^\d+$/ })).map(x => x.text)
  expect(numbers).toContain('1')
  expect(numbers).toContain('2')
  await ui.unmount()
})

const userRow = (kind: string) => ({
  plugin: 'tokyo-crab',
  component: 'UserMessage',
  requestId: 'u1',
  props: { text: 'hola', origin: { kind }, isExpanded: true },
})

test(
  'tus mensajes llevan tu nombre y los avisos de tareas no',
  { options: { language: 'es', name: 'Joa' } },
  async ($, on) => {
    on('ui.render', ($$, e) => {
      const { Text } = $$.ui.resolve(e)
      return <Text>el mensaje</Text>
    })
    const mine = await $.ui.mount({ ...userRow('composer'), surface: 'desktop' } as never)
    expect((await mine.find({ type: 'Text', text: /▸/ }))?.text).toBe('▸ JOA')
    expect(await mine.find({ type: 'Text', text: /el mensaje/ })).toBeDefined()
    await mine.unmount()

    const task = await $.ui.mount({ ...userRow('task-notification'), surface: 'desktop' } as never)
    expect(await task.find({ type: 'Text', text: /JOA/ })).toBeUndefined()
    expect(await task.find({ type: 'Text', text: /el mensaje/ })).toBeDefined()
    await task.unmount()
  },
)

test('de fábrica, sin tocar ninguna opción, la etiqueta dice VOS', async ($, on) => {
  on('ui.render', ($$, e) => {
    const { Text } = $$.ui.resolve(e)
    return <Text>el mensaje</Text>
  })
  const mine = await $.ui.mount({ ...userRow('composer'), surface: 'desktop' } as never)
  expect((await mine.find({ type: 'Text', text: /▸/ }))?.text).toBe('▸ VOS')
  await mine.unmount()
})

test('in English your messages are tagged YOU', EN, async ($, on) => {
  on('ui.render', ($$, e) => {
    const { Text } = $$.ui.resolve(e)
    return <Text>the message</Text>
  })
  const mine = await $.ui.mount({ ...userRow('composer'), surface: 'desktop' } as never)
  expect((await mine.find({ type: 'Text', text: /▸/ }))?.text).toBe('▸ YOU')
  await mine.unmount()
})

test('/cyber-sonido apaga y prende el tunga-tunga; en Windows lo toca el sistema', ES, async ($, on) => {
  const ran: unknown[] = []
  on('env.get', () => ({ value: 'Windows_NT' }))
  on('process.run', (_, e) => {
    ran.push(e)
    return { value: { exitCode: 0, stdout: '', stderr: '' } } as never
  })
  expect(JSON.stringify(await $.command.run({ command: 'cyber-sonido' } as never))).toContain('apagado')
  expect(ran.length).toBe(0)
  expect(JSON.stringify(await $.command.run({ command: 'cyber-sonido' } as never))).toContain('prendido')
  expect(JSON.stringify(ran[0])).toContain('tunga.wav')
  // nada atado a una máquina: busca el archivo donde esté instalado el mod
  expect(JSON.stringify(ran[0])).not.toContain('Users')
})

test('outside Windows the tunga-tunga plays through the engine, from the mod own file', EN, async ($, on) => {
  const played: unknown[] = []
  let ran = 0
  on('env.get', () => ({ value: undefined }))
  on('process.run', () => {
    ran += 1
    return { value: { exitCode: 0, stdout: '', stderr: '' } } as never
  })
  on('audio.play', (_, e) => {
    played.push(e)
    return { value: undefined } as never
  })
  await $.command.run({ command: 'cyber-sound' } as never)
  expect(JSON.stringify(await $.command.run({ command: 'cyber-sound' } as never))).toContain('Tunga-tunga on')
  expect(JSON.stringify(played[0])).toContain('sounds/tunga.wav')
  expect(ran).toBe(0)
})

test('el cangrejo no opina solo: hay que prenderlo y avisa que gasta', ES, async $ => {
  const on_ = JSON.stringify(await $.command.run({ command: 'cangrejo-opina' } as never))
  expect(on_).toContain('opina')
  expect(on_).toContain('consulta')
  expect(JSON.stringify(await $.command.run({ command: 'cangrejo-opina' } as never))).toContain('sin gastar')
})

// ---------- In English, the option ----------

test('set to English, the panel speaks English', EN, async ($, on) => {
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('tool.call', () => ({ result: {} }))
  await $.tool.call({ tool: 'Read', file_path: 'C:/x/src/app.ts' })
  await $.tool.call({ tool: 'Bash', command: 'cd /repo && npm test' } as never)

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE_EN, surface })
    expect((await ui.find({ type: 'Text', text: /Reading/ }))?.text).toBe('Reading · app.ts')
    expect((await ui.find({ type: 'Text', text: /Running/ }))?.text).toBe('Running · npm test')
    expect(await shown(ui, 'en')).toEqual(['What Claude is doing', 'Other Claudes helping', 'Session summary'])
    expect((await card(ui, 'steps', 'en'))?.summary).toBe('2 actions done')
    // nothing left behind in Spanish
    expect(await ui.find({ type: 'Text', text: /Leyendo|hechas|Acá aparece/ })).toBeUndefined()
    expect((await ui.find({ type: 'Text', text: /splits a big job/ }))?.text).toContain('other Claudes')
    expect(await ui.find({ type: 'Text', text: /^PROMPTS$|^REQUESTS$/ })).toBeDefined()
    await ui.unmount()
  }
})

test('the commands are named in the chosen language', EN, async ($, on) => {
  const names: string[] = []
  on('command.register', (_, e) => {
    names.push((e as { name: string }).name)
    return { value: { command: (e as { name: string }).name } }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect([...names].sort()).toEqual(['crab', 'crab-outfit', 'crab-talk', 'cyber', 'cyber-sound'])
  expect(JSON.stringify(await $.command.run({ command: 'crab-outfit' } as never))).toContain('The crab is now wearing')
})

test('en castellano los comandos conservan sus nombres de siempre', ES, async ($, on) => {
  const names: string[] = []
  on('command.register', (_, e) => {
    names.push((e as { name: string }).name)
    return { value: { command: (e as { name: string }).name } }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect([...names].sort()).toEqual(['cangrejo', 'cangrejo-opina', 'cangrejo-ropa', 'cyber', 'cyber-sonido'])
})

test('the visor strip and the waiting line speak English too', EN, async ($, on) => {
  on('ui.render', ($$, e) => {
    const { Text } = $$.ui.resolve(e)
    return <Text>below</Text>
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /on air/ }))?.text).toBe('on air')
  await ui.unmount()
  expect(waitingWord('thinking', 0, 'en')).toBe('Asking La Mona for a song')
  // sin decir idioma, castellano
  expect(waitingWord('thinking', 0)).toBe('Pidiéndole un tema a la Mona')
  expect(waitingWord('tool-use', 0)).toBeUndefined()
  expect(bandState('done', false, 'en').text).toBe('nailed it')
  expect(bandState('done', false).text).toBe('listo el pollo')
})

test('de fábrica, sin tocar ninguna opción, el mod habla castellano', async ($, on) => {
  const names: string[] = []
  on('command.register', (_, e) => {
    names.push((e as { name: string }).name)
    return { value: { command: (e as { name: string }).name } }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: 'C:/x/src/app.ts' })
  expect(names).toContain('cangrejo')
  expect(names).not.toContain('crab')

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Leyendo/ }))?.text).toBe('Leyendo · app.ts')
  expect((await card(ui, 'score'))?.title).toBe('Resumen de la sesión')
  await ui.unmount()
})

test('los dos idiomas dicen lo mismo: ni una clave ni una frase de menos', async () => {
  expect(Object.keys(STRINGS.en.verbs).sort()).toEqual(Object.keys(STRINGS.es.verbs).sort())
  for (const mode of ['thinking', 'requesting', 'responding'] as const) {
    expect(STRINGS.en.waiting[mode].length).toBe(STRINGS.es.waiting[mode].length)
  }
  for (const mood of ['idle', 'working', 'done', 'error'] as const) {
    expect(QUIPS.en[mood].length).toBe(QUIPS.es[mood].length)
    // el cangrejo opinando entra en su globo: 150 caracteres como mucho
    for (const q of [...QUIPS.en[mood], ...QUIPS.es[mood]]) expect(q.length).toBeLessThan(150)
  }
  for (const o of OUTFITS) {
    expect(o.name.en.length).toBeGreaterThan(0)
    expect(o.name.es.length).toBeGreaterThan(0)
  }
})

// ---------- El medidor de contexto ----------

const usageOf = (context: { tokens?: number; window: number; percent?: number }) => ({
  value: { startedAt: 0, context, rateLimits: [] },
})

test('los tokens se leen cortos y el medidor cambia de color al llenarse', async () => {
  expect(fmtTokens(461_900)).toBe('461.9k')
  expect(fmtTokens(1_000_000)).toBe('1M')
  expect(fmtTokens(200_000)).toBe('200k')
  expect(fmtTokens(850)).toBe('850')
  // tranquilo hasta 69, «ojo» desde 70, «se acaba» desde 90
  expect(contextColor(46)).toBe(contextColor(69))
  expect(contextColor(70)).not.toBe(contextColor(69))
  expect(contextColor(90)).not.toBe(contextColor(89))
  expect(contextBar(0)).toBe('▱'.repeat(12))
  expect(contextBar(50)).toBe('▰'.repeat(6) + '▱'.repeat(6))
  expect(contextBar(100)).toBe('▰'.repeat(12))
  // con algo usado nunca queda vacía
  expect(contextBar(1)).toBe('▰' + '▱'.repeat(11))
})

test('el panel y la franja muestran cuánto contexto va usado', ES, async ($, on) => {
  on('session.usage', () => usageOf({ tokens: 461_900, window: 1_000_000, percent: 46 }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($$, e) => {
    const { Text } = $$.ui.resolve(e)
    return <Text>lo de abajo</Text>
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /^CONTEXTO$/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /46%/ }))?.text).toContain('46%')
    expect((await ui.find({ type: 'Text', text: /quedan/ }))?.text).toBe('461.9k de 1M · quedan 538.1k')
    await ui.unmount()
  }
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await band.find({ type: 'Text', text: /contexto/ }))?.text).toContain('contexto 46%')
  await band.unmount()
})

test('antes de la primera respuesta el medidor dice que no midió, en vez de inventar un cero', ES, async ($, on) => {
  on('session.usage', () => usageOf({ window: 200_000 }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /sin medir/ }))?.text).toBe('ventana de 200k · todavía sin medir')
  expect(await ui.find({ type: 'Text', text: /0%/ })).toBeUndefined()
  await ui.unmount()
})

test('si la app no informa el contexto, el medidor no se dibuja', ES, async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /^CONTEXTO$/ })).toBeUndefined()
  await ui.unmount()
})

test('dentro de un turno, cada paso vuelve a leer el contexto', ES, async ($, on) => {
  let percent = 10
  on('session.usage', () => usageOf({ tokens: percent * 2_000, window: 200_000, percent }) as never)
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('tool.call', () => ({ result: {} }))
  await $.tool.call({ tool: 'Read', file_path: 'a.ts' })
  percent = 91
  await $.tool.call({ tool: 'Read', file_path: 'b.ts' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /91%/ }))?.text).toContain('91%')
  await ui.unmount()
})

test('in English the meter reads CONTEXT', EN, async ($, on) => {
  on('session.usage', () => usageOf({ tokens: 50_000, window: 200_000, percent: 25 }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE_EN, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /^CONTEXT$/ })).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /left$/ }))?.text).toBe('50k of 200k · 150k left')
  await ui.unmount()
})

// ---------- Las secciones ----------

test('todas las secciones se ven desplegadas a la vez, con la lista de tareas arriba y entera', ES, async ($, on) => {
  on('tool.call', () => ({ result: {} }))
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [
      { content: 'Leer el código', status: 'completed' },
      { content: 'Escribir el mod', status: 'in_progress' },
      { content: 'Probarlo', status: 'pending' },
      { content: 'Publicarlo', status: 'pending' },
    ],
  } as never)

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    // las tareas van primero: es lo que se mira para saber cómo viene el pedido
    expect(await shown(ui)).toEqual(['Lista de tareas', 'Qué está haciendo Claude', 'Otros Claude ayudando', 'Resumen de la sesión'])
    expect((await card(ui, 'plan'))?.summary).toBe('1 de 4 tareas terminadas')
    // la lista entera, sin tocar nada; la tarea en curso figura una sola vez, no repetida sobre los pasos
    for (const tarea of ['Leer el código', 'Escribir el mod', 'Probarlo', 'Publicarlo']) {
      expect((await ui.findAll({ type: 'Text', text: new RegExp(`^${tarea}$`) })).length).toBe(1)
    }
    // y las demás secciones muestran lo suyo al mismo tiempo
    expect(await ui.find({ type: 'Text', text: /Acá aparece/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /reparte un trabajo/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^PEDIDOS$/ })).toBeDefined()
    // no hay nada que tocar para verlas: ni botones ni flechitas
    expect((await buttons(ui)).length).toBe(0)
    await ui.unmount()
  }
})

test('los pasos van lo más nuevo arriba y el título cuenta cuántos van', ES, async ($, on) => {
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('tool.call', () => ({ result: {} }))
  for (let i = 1; i <= 14; i += 1) {
    await $.tool.call({ tool: i % 2 ? 'Read' : 'Edit', file_path: `f${i}.ts` } as never)
  }
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await card(ui, 'steps'))?.title).toBe('Qué está haciendo Claude')
  expect((await card(ui, 'steps'))?.summary).toBe('14 acciones hechas')
  // lo más nuevo arriba
  const labels = (await ui.findAll({ type: 'Text', text: /f\d+\.ts/ })).map(x => x.text)
  expect(labels[0]).toContain('f14.ts')
  // entran los diez últimos; los viejos se cuentan, no desaparecen sin aviso
  expect(labels.length).toBe(10)
  expect((await ui.find({ type: 'Text', text: /anterior/ }))?.text).toBe('+ 4 pasos anteriores')
  await ui.unmount()
})

test('sin plan no hay sección de tareas; las demás siempre están', ES, async ($, on) => {
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('tool.call', () => ({ result: {} }))
  await $.tool.call({ tool: 'Read', file_path: 'a.ts' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await shown(ui)).toEqual(['Qué está haciendo Claude', 'Otros Claude ayudando', 'Resumen de la sesión'])
  await ui.unmount()
})

test('si el plan se vacía, su sección se va y las demás siguen', ES, async ($, on) => {
  on('tool.call', () => ({ result: {} }))
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  await $.tool.call({ tool: 'TodoWrite', todos: [{ content: 'Algo', status: 'in_progress' }] } as never)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await shown(ui)).toEqual(['Lista de tareas', 'Qué está haciendo Claude', 'Otros Claude ayudando', 'Resumen de la sesión'])
  await ui.unmount()
  await $.tool.call({ tool: 'TodoWrite', todos: [] } as never)
  const vacio = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await shown(vacio)).toEqual(['Qué está haciendo Claude', 'Otros Claude ayudando', 'Resumen de la sesión'])
  expect(await vacio.find({ type: 'Text', text: /Acá aparece/ })).toBeDefined()
  await vacio.unmount()
})

test('la barra del contexto se dibuja de neón, con las marcas de aviso', ES, async ($, on) => {
  on('session.usage', () => usageOf({ tokens: 140_000, window: 200_000, percent: 70 }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const desk = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const svgs = JSON.stringify(await desk.findAll({ type: 'Svg' }))
  expect(svgs).toContain('CONTEXTO 70%')
  expect(await desk.find({ type: 'Text', text: /▰/ })).toBeUndefined()
  await desk.unmount()
  // las marcas del «ojo» y del «se acaba» van sobre la pista
  expect(gaugeSvg(0.7, '#fff', [0.7, 0.9]).match(/width="2"/g)?.length).toBe(2)
  // con algo usado nunca queda apagada; sin dato, ningún segmento encendido
  expect(gaugeSvg(0.001, '#fff')).toContain('opacity=".16"')
  expect(gaugeSvg(undefined, '#fff')).not.toContain('opacity=".16"')
})

test('un paso largo se lee entero, sin cortar el texto', ES, async ($, on) => {
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('tool.call', () => ({ result: {} }))
  const largo = 'Ver si algo cambió en el proyecto durante la pausa y anotarlo'
  await $.tool.call({ tool: 'Bash', command: 'git status', description: largo } as never)
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const row = await ui.find({ type: 'Text', text: /Ver si algo/ })
    expect(row?.text).toBe(`Ejecutando · ${largo}`)
    // baja de renglón en una columna angosta; no termina en puntos suspensivos
    expect(JSON.stringify(row)).toContain('"wrap":"wrap"')
    await ui.unmount()
  }
})

test('cada sección dice arriba qué es y, en un renglón, qué tiene', ES, async ($, on) => {
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('tool.call', () => ({ result: {} }))
  await $.tool.call({ tool: 'Read', file_path: 'a.ts' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await card(ui, 'steps')).toEqual({ id: 'steps', title: 'Qué está haciendo Claude', summary: '1 acción hecha' })
  expect(await card(ui, 'agents')).toEqual({ id: 'agents', title: 'Otros Claude ayudando', summary: 'Ninguno por ahora' })
  expect(await card(ui, 'score')).toEqual({ id: 'score', title: 'Resumen de la sesión', summary: '0 pedidos · 0s de laburo' })
  await ui.unmount()
})

test('el panel crece con lo que tiene para que se pueda recorrer con la ruedita, en vez de apretarse', ES, async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const root = ((await ui.find({ type: 'Box' })) as { props: Record<string, unknown> } | undefined)?.props
  // alto mínimo, no alto fijo: un alto fijo aplasta o corta lo que no entra y no deja nada que recorrer
  expect(root?.minHeight).toBe('100%')
  expect(root?.height).toBeUndefined()
  await ui.unmount()
})

// ---------- Que no se quede clavado ----------

test('si una herramienta se corta por la mitad, su paso no queda girando para siempre', ES, async ($, on) => {
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  // la persona frena a Claude con Esc: la herramienta no llega a contestar
  on('tool.call', () => {
    throw new Error('interrumpido')
  })
  await $.tool.call({ tool: 'Bash', command: 'npm test' } as never).catch(() => undefined)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /npm test/ }))?.text).toBe('Ejecutando · npm test')
  expect(await ui.find({ type: 'Text', text: /^◐$/ })).toBeUndefined()
  expect((await ui.find({ type: 'Text', text: /^⊘$/ }))?.text).toBe('⊘')
  expect((await card(ui, 'steps'))?.summary).not.toContain('en curso')
  await ui.unmount()
})

test('al reabrir la app el plan se recupera de la conversación, y los avances vuelven a moverlo', ES, async ($, on) => {
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  const PLAN = 'mcp__ccd_turn__update_plan'
  // lo que quedó escrito en la conversación antes de cerrar: la lista, y un avance
  on('session.messages', () => ({
    value: [
      { role: 'user', text: 'arreglá el panel', toolUses: [] },
      {
        role: 'assistant',
        text: '',
        toolUses: [
          {
            tool_use_id: 'p1',
            tool: PLAN,
            input: {
              scope: 'first_task',
              items: [
                { content: 'Leer el código', status: 'in_progress' },
                { content: 'Arreglarlo', status: 'pending' },
                { content: 'Probarlo', status: 'pending' },
              ],
            },
          },
          { tool_use_id: 'r1', tool: 'Read', input: { file_path: 'a.ts' } },
        ],
      },
      { role: 'assistant', text: '', toolUses: [{ tool_use_id: 'p2', tool: PLAN, input: { advance: true } }] },
    ],
  }) as never)

  // la app arranca de nuevo: el mod no tiene nada guardado de esta conversación
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const antes = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await card(antes, 'plan'))?.summary).toBe('1 de 3 tareas terminadas')
  expect(await antes.find({ type: 'Text', text: /^Arreglarlo$/ })).toBeDefined()
  await antes.unmount()

  // Claude sigue y sólo avisa «terminé este, voy al siguiente», sin repetir la lista
  await $.tool.call({ tool: PLAN, advance: true } as never)
  const despues = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await card(despues, 'plan'))?.summary).toBe('2 de 3 tareas terminadas')
  await despues.unmount()
})

test('la lista de tareas de un subagente no pisa la del pedido', ES, async ($, on) => {
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('agent.spawn', () => ({ model: 'haiku', agentId: 'ag-1' }))
  on('tool.call', () => ({ result: {} }))
  await $.tool.call({
    tool: 'mcp__ccd_turn__update_plan',
    items: [
      { content: 'Lo que pidió Joa', status: 'in_progress' },
      { content: 'Probarlo', status: 'pending' },
    ],
  } as never)
  await $.agent.spawn({
    tool_use_id: 'tu-1',
    prompt: 'buscá cosas',
    description: 'Explorar el repo',
    subagentType: 'Explore',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'opus',
  } as never)
  // el subagente lleva su propia lista mientras trabaja
  await $.tool.call({ tool: 'TodoWrite', todos: [{ content: 'Cosa interna del subagente', status: 'in_progress' }], agentId: 'ag-1' } as never)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await card(ui, 'plan'))?.summary).toBe('0 de 2 tareas terminadas')
  expect(await ui.find({ type: 'Text', text: /^Lo que pidió Joa$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Cosa interna/ })).toBeUndefined()
  await ui.unmount()
})

test('un plan que ya está en memoria no se pisa con el de la conversación', ES, async ($, on) => {
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('session.messages', () => ({
    value: [
      {
        role: 'assistant',
        text: '',
        toolUses: [{ tool_use_id: 'v1', tool: 'TodoWrite', input: { todos: [{ content: 'Viejo', status: 'pending' }] } }],
      },
    ],
  }) as never)
  await $.tool.call({ tool: 'TodoWrite', todos: [{ content: 'Nuevo', status: 'in_progress' }] } as never)
  // una recarga del mod vuelve a pasar por el arranque
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /^Nuevo$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Viejo$/ })).toBeUndefined()
  await ui.unmount()
})
