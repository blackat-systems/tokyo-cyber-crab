import { expect, test } from 'claude-code/testing'

import { OUTFITS, QUIPS } from '../hooks/fun'
import { STRINGS } from '../hooks/i18n'
import { LOOK, LOOK_PROBLEMS } from '../hooks/look'
import { checkColors } from '../hooks/make-colors.js'
import { bandState, fmtWork, groupSteps, waitingWord } from '../hooks/register'

// El mod sale en inglés. Los tests de siempre corren en castellano, el idioma en que nació.
const ES = { options: { language: 'es' } } as const

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
  expect((await ui.find({ type: 'Text', text: /Todavía/ }))?.text).toBe(
    'Todavía no hay pasos en este pedido.',
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
    expect((await ui.find({ type: 'Text', text: /1\/2/ }))?.text).toContain('1/2')
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
    expect((await ui.find({ type: 'Text', text: /Explorar el repo/ }))?.text).toBe('Explorar el repo')
    expect((await ui.find({ type: 'Text', text: /1 herr\./ }))?.text).toContain('Explore')
    // la última acción va en su propio renglón, entera
    expect((await ui.find({ type: 'Text', text: /Buscando · TODO/ }))?.text).toBe('Buscando · TODO')
    expect((await ui.find({ type: 'Text', text: /Todavía no hay pasos/ }))?.text).toBeDefined()
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

test('sin subagentes la caja lo dice en su título', ES, async $ => {
  const vacio = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await vacio.find({ type: 'Text', text: /ninguno ahora/ })).toBeDefined()
  await vacio.unmount()
})

test('con muchos subagentes dibuja cuatro y cuenta los que no entran', ES, async ($, on) => {
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
  expect(LOOK.backdrop).toEqual({ scene: 'neo-cba', glass: { blur: 4, tint: '#14141f', opacity: 0.55 } })
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

test('si la app todavía no entiende colores, /cyber pide sólo la ciudad de fondo', async ($, on) => {
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
  expect(await ui.find({ type: 'Text', text: /NEO-CBA/ })).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /transmitiendo/ }))?.text).toBe('transmitiendo')
  expect(await ui.find({ type: 'Text', text: /lo de abajo/ })).toBeDefined()
  await ui.unmount()

  const survey = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'desktop' })
  expect(await survey.find({ type: 'Text', text: /NEO-CBA/ })).toBeUndefined()
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
  expect(await ui.find({ type: 'Text', text: /MARCADOR/ })).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /^PEDIDOS$/ }))?.text).toBe('PEDIDOS')
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

test('sin nombre elegido, la etiqueta dice VOS en castellano y YOU en inglés', ES, async ($, on) => {
  on('ui.render', ($$, e) => {
    const { Text } = $$.ui.resolve(e)
    return <Text>el mensaje</Text>
  })
  const mine = await $.ui.mount({ ...userRow('composer'), surface: 'desktop' } as never)
  expect((await mine.find({ type: 'Text', text: /▸/ }))?.text).toBe('▸ VOS')
  await mine.unmount()
})

test('by default your messages are tagged YOU', async ($, on) => {
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

test('outside Windows the tunga-tunga plays through the engine, from the mod own file', async ($, on) => {
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

// ---------- In English, the default ----------

test('out of the box the panel speaks English', async ($, on) => {
  let t = 1000
  on('clock.now', () => ({ value: (t += 250) }))
  on('tool.call', () => ({ result: {} }))
  await $.tool.call({ tool: 'Read', file_path: 'C:/x/src/app.ts' })
  await $.tool.call({ tool: 'Bash', command: 'cd /repo && npm test' } as never)

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE_EN, surface })
    expect((await ui.find({ type: 'Text', text: /Reading/ }))?.text).toBe('Reading · app.ts')
    expect((await ui.find({ type: 'Text', text: /Running/ }))?.text).toBe('Running · npm test')
    expect(await ui.find({ type: 'Text', text: /^SCOREBOARD$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^SUBAGENTS$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /none right now/ })).toBeDefined()
    // nothing left behind in Spanish
    expect(await ui.find({ type: 'Text', text: /MARCADOR|SUBAGENTES|Leyendo|hechos/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('the commands are named in the chosen language', async ($, on) => {
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

test('the visor strip and the waiting line speak English too', async ($, on) => {
  on('ui.render', ($$, e) => {
    const { Text } = $$.ui.resolve(e)
    return <Text>below</Text>
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /on air/ }))?.text).toBe('on air')
  await ui.unmount()
  expect(waitingWord('thinking', 0)).toBe('Asking La Mona for a song')
  expect(waitingWord('thinking', 0, 'es')).toBe('Pidiéndole un tema a la Mona')
  expect(waitingWord('tool-use', 0)).toBeUndefined()
  expect(bandState('done', false).text).toBe('nailed it')
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
