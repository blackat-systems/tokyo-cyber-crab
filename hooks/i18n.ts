// Todo lo que el mod dice, en los dos idiomas. El cangrejo nació hablando cordobés y así
// sale de fábrica; en inglés sigue hablando de fernet, cuarteto y siesta.
// Las frases sueltas del cangrejo y la ropa están en ./fun.

import type { AgentStatus, Mood } from '../types'

export type Lang = 'en' | 'es'

/** El idioma elegido en las opciones del mod; cualquier otra cosa es castellano. */
export const langOf = (v: unknown): Lang => (v === 'en' ? 'en' : 'es')

export type Strings = {
  /** El título del panel. */
  title: string
  /** La etiqueta de los mensajes propios cuando no se eligió un nombre. */
  you: string
  /** El verbo de cada herramienta en la lista de pasos. */
  verbs: Record<string, string>
  mood: Record<Mood, string>
  agent: Record<AgentStatus, string>
  band: { static: string; live: string; done: string; online: string; context: (percent: number) => string }
  closing: { ok: string; failed: string; steps: (n: number) => string; fails: (n: number) => string }
  pane: {
    wearing: (outfit: string) => string
    counter: (done: string, running: number) => string
    steps: string
    /** Los rótulos de las pestañas del panel. */
    tabs: Record<'steps' | 'plan' | 'agents' | 'score', string>
    /** Lo que tiene cada sección adentro, en corto, al lado de su nombre. */
    summary: {
      stepsNone: string
      steps: (done: number, running: number) => string
      plan: (done: number, total: number) => string
      agentsNone: string
      agentsLive: (n: number) => string
      agentsDone: (n: number) => string
      score: (prompts: number, work: string) => string
    }
    /** Cuántos pasos viejos no entran en la lista. */
    earlier: (n: number) => string
    prompts: (n: number) => string
    context: string
    contextUse: (used: string, total: string, left: string) => string
    contextUnread: (total: string) => string
    plan: string
    empty: string
    subagents: string
    agentsLive: (n: number) => string
    agentsDone: string
    agentsNone: string
    tools: (n: number) => string
    more: (n: number) => string
    score: string
    session: string
    cells: { prompts: string; steps: string; fails: string; work: string }
    helpers: (n: number) => string
    failedMark: string
  }
  alt: { crab: (mood: string) => string; agent: (status: string) => string; eq: string; backdrop: string }
  cmd: {
    paneOpen: string
    outfitNow: (outfit: string) => string
    outfitFallback: string
    outfitQuip: string
    outfitAuto: (outfit: string) => string
    opinionOn: string
    opinionOff: string
    soundOn: string
    soundOff: string
    cyberOn: string
    cyberOnUnseen: string
    cyberOff: string
  }
  /** Lo que dice la línea de espera mientras piensa, pide o responde. */
  waiting: Record<'thinking' | 'requesting' | 'responding', readonly string[]>
  /** Las reglas para cuando el cangrejo opina con el modelo. */
  opinionRules: string
}

const es: Strings = {
  title: 'Pasos de Claude',
  you: 'VOS',
  verbs: {
    Bash: 'Ejecutando',
    PowerShell: 'Ejecutando',
    Read: 'Leyendo',
    Edit: 'Editando',
    Write: 'Escribiendo',
    NotebookEdit: 'Editando notebook',
    Grep: 'Buscando',
    Glob: 'Buscando archivos',
    Agent: 'Subagente',
    WebFetch: 'Abriendo',
    WebSearch: 'Buscando en la web',
    Skill: 'Cargando skill',
    ToolSearch: 'Cargando herramientas',
  },
  mood: { idle: 'durmiendo la siesta', working: 'trabajando', done: '¡listo!', error: 'algo falló' },
  agent: { running: 'trabajando', done: 'terminó', error: 'falló' },
  band: {
    static: 'interferencia',
    live: 'transmitiendo',
    done: 'listo el pollo',
    online: 'en línea',
    context: percent => `contexto ${percent}%`,
  },
  closing: {
    ok: 'listo el pollo',
    failed: 'cerrado con fallas',
    steps: n => `${n} ${n === 1 ? 'paso' : 'pasos'}`,
    fails: n => `${n} ${n === 1 ? 'falla' : 'fallas'}`,
  },
  pane: {
    wearing: outfit => `hoy viene con ${outfit}`,
    counter: (done, running) => `${done} hechos${running ? ` · ${running} en curso` : ''}`,
    steps: 'PASOS',
    tabs: {
      steps: 'Qué está haciendo Claude',
      plan: 'Lista de tareas',
      agents: 'Otros Claude ayudando',
      score: 'Resumen de la sesión',
    },
    summary: {
      stepsNone: 'Todavía nada en este pedido',
      steps: (done, running) =>
        `${done} ${done === 1 ? 'acción hecha' : 'acciones hechas'}${running > 0 ? ` · ${running} en curso` : ''}`,
      plan: (done, total) => `${done} de ${total} tareas terminadas`,
      agentsNone: 'Ninguno por ahora',
      agentsLive: n => `${n} trabajando ahora`,
      agentsDone: n => `${n} ${n === 1 ? 'ya terminó' : 'ya terminaron'}`,
      score: (prompts, work) => `${prompts} ${prompts === 1 ? 'pedido' : 'pedidos'} · ${work} de laburo`,
    },
    earlier: n => `+ ${n} ${n === 1 ? 'paso anterior' : 'pasos anteriores'}`,
    prompts: n => `${n} ${n === 1 ? 'pedido' : 'pedidos'}`,
    context: 'CONTEXTO',
    contextUse: (used, total, left) => `${used} de ${total} · quedan ${left}`,
    contextUnread: total => `ventana de ${total} · todavía sin medir`,
    plan: 'PLAN DEL CANGREJO',
    empty: 'Acá aparece cada cosa que hace Claude: los archivos que lee, lo que cambia y los comandos que corre. Lo más nuevo, arriba.',
    subagents: 'SUBAGENTES',
    agentsLive: n => `${n} trabajando ahora`,
    agentsDone: 'Todos terminaron.',
    agentsNone: 'Cuando Claude reparte un trabajo grande entre otros Claude, acá aparece cada uno con lo que está haciendo.',
    tools: n => `${n} ${n === 1 ? 'herr.' : 'herrs.'}`,
    more: n => `+ ${n} más`,
    score: 'MARCADOR',
    session: '· esta sesión',
    cells: { prompts: 'PEDIDOS', steps: 'PASOS', fails: 'FALLAS', work: 'LABURO' },
    helpers: n => `· ${n} ${n === 1 ? 'subagente' : 'subagentes'}`,
    failedMark: ' (falló)',
  },
  alt: {
    crab: mood => `Cangrejito pixelado: ${mood}`,
    agent: status => `Subagente ${status}`,
    eq: 'Ecualizador de neón',
    backdrop: 'Ciudad de neón de noche, con un sol de franjas',
  },
  cmd: {
    paneOpen: 'Panel del cangrejito abierto.',
    outfitNow: outfit => `El cangrejo ahora tiene puesto: ${outfit}.`,
    outfitFallback: 'su caparazón',
    outfitQuip: '¿Y? ¿Cómo me queda? Decí que sí, culiau.',
    outfitAuto: outfit => `Me puse ${outfit}. ¿Viste qué facha, culiau?`,
    opinionOn: 'El cangrejo ahora opina de cada tarea. Ojo: es una consulta chica al modelo por tarea terminada.',
    opinionOff: 'El cangrejo vuelve a sus frases de siempre, sin gastar nada.',
    soundOn: 'Tunga-tunga prendido: suena al terminar una tarea.',
    soundOff: 'Tunga-tunga apagado.',
    cyberOn: 'Modo cyber prendido, con Neo-Córdoba de fondo.',
    cyberOnUnseen:
      'Modo cyber prendido. Los colores y la ciudad de fondo todavía no se ven: acá no hay una app que dibuje temas. Aparecen solos cuando la haya.',
    cyberOff: 'Modo cyber apagado: sin colores, sin fondo, sin franja y con la espera de siempre.',
  },
  waiting: {
    thinking: [
      'Pidiéndole un tema a la Mona',
      'Afinando el acordeón',
      'Haciendo la fila para el baile',
      'Pensando de costado',
      'Dando una vuelta por Villa del Nylon',
      'Hackeando el mainframe',
      'Calculando con mate en mano',
      'Esperando que arranque el tunga-tunga',
    ],
    requesting: [
      'Llamando a Nueva Córdoba',
      'Sacando entrada para el baile',
      'Sintonizando la radio cuartetera',
      'Llamando al Sector 7',
    ],
    responding: ['Tocando el tunga-tunga', 'Transmitiendo desde el baile', 'Tipeando con las dos pinzas', 'Bajando la data'],
  },
  opinionRules:
    'Sos un cangrejo cordobés que mira trabajar a un programador en una ciudad de neón. ' +
    'Te paso lo que se hizo recién. Respondé UNA sola frase de no más de 110 caracteres, en español ' +
    'de Córdoba, Argentina, con humor de barrio y alguna referencia al cuarteto, el fernet o el baile si viene al caso. ' +
    'No inventes hechos que no estén en la lista. Sin comillas, sin emojis, sin insultos fuertes.',
}

const en: Strings = {
  title: "Claude's steps",
  you: 'YOU',
  verbs: {
    Bash: 'Running',
    PowerShell: 'Running',
    Read: 'Reading',
    Edit: 'Editing',
    Write: 'Writing',
    NotebookEdit: 'Editing notebook',
    Grep: 'Searching',
    Glob: 'Finding files',
    Agent: 'Subagent',
    WebFetch: 'Opening',
    WebSearch: 'Searching the web',
    Skill: 'Loading skill',
    ToolSearch: 'Loading tools',
  },
  mood: { idle: 'taking a siesta', working: 'working', done: 'done!', error: 'something broke' },
  agent: { running: 'working', done: 'finished', error: 'failed' },
  band: {
    static: 'static',
    live: 'on air',
    done: 'nailed it',
    online: 'online',
    context: percent => `context ${percent}%`,
  },
  closing: {
    ok: 'nailed it',
    failed: 'closed with failures',
    steps: n => `${n} ${n === 1 ? 'step' : 'steps'}`,
    fails: n => `${n} ${n === 1 ? 'failure' : 'failures'}`,
  },
  pane: {
    wearing: outfit => `today's look: ${outfit}`,
    counter: (done, running) => `${done} done${running ? ` · ${running} running` : ''}`,
    steps: 'STEPS',
    tabs: {
      steps: 'What Claude is doing',
      plan: 'Task list',
      agents: 'Other Claudes helping',
      score: 'Session summary',
    },
    summary: {
      stepsNone: 'Nothing yet in this request',
      steps: (done, running) =>
        `${done} ${done === 1 ? 'action done' : 'actions done'}${running > 0 ? ` · ${running} running` : ''}`,
      plan: (done, total) => `${done} of ${total} tasks finished`,
      agentsNone: 'None right now',
      agentsLive: n => `${n} working right now`,
      agentsDone: n => `${n} finished`,
      score: (prompts, work) => `${prompts} ${prompts === 1 ? 'prompt' : 'prompts'} · ${work} of work`,
    },
    earlier: n => `+ ${n} earlier ${n === 1 ? 'step' : 'steps'}`,
    prompts: n => `${n} ${n === 1 ? 'prompt' : 'prompts'}`,
    context: 'CONTEXT',
    contextUse: (used, total, left) => `${used} of ${total} · ${left} left`,
    contextUnread: total => `${total} window · not measured yet`,
    plan: "CRAB'S PLAN",
    empty: 'Everything Claude does shows up here: the files it reads, what it changes and the commands it runs. Newest on top.',
    subagents: 'SUBAGENTS',
    agentsLive: n => `${n} working right now`,
    agentsDone: 'All finished.',
    agentsNone: 'When Claude splits a big job among other Claudes, each one shows up here with what it is doing.',
    tools: n => `${n} ${n === 1 ? 'tool' : 'tools'}`,
    more: n => `+ ${n} more`,
    score: 'SCOREBOARD',
    session: '· this session',
    cells: { prompts: 'PROMPTS', steps: 'STEPS', fails: 'FAILS', work: 'GRIND' },
    helpers: n => `· ${n} ${n === 1 ? 'subagent' : 'subagents'}`,
    failedMark: ' (failed)',
  },
  alt: {
    crab: mood => `Pixel crab: ${mood}`,
    agent: status => `Subagent ${status}`,
    eq: 'Neon equalizer',
    backdrop: 'A neon city at night under a striped sun',
  },
  cmd: {
    paneOpen: 'Crab panel open.',
    outfitNow: outfit => `The crab is now wearing: ${outfit}.`,
    outfitFallback: 'just its shell',
    outfitQuip: 'Well? How do I look? Say good, che.',
    outfitAuto: outfit => `Just put on ${outfit}. Sharp, right?`,
    opinionOn: 'The crab now comments on every finished task. Heads up: that is one small model call per task.',
    opinionOff: 'The crab is back to its stock lines. Costs nothing.',
    soundOn: 'Tunga-tunga on: it plays when a task finishes.',
    soundOff: 'Tunga-tunga off.',
    cyberOn: 'Cyber mode on, with Neo-Córdoba behind you.',
    cyberOnUnseen:
      'Cyber mode on. The colors and the city are not showing yet: nothing here draws themes. They show up by themselves once an app that does is open.',
    cyberOff: 'Cyber mode off: no colors, no backdrop, no visor strip, and the usual waiting line.',
  },
  waiting: {
    thinking: [
      'Asking La Mona for a song',
      'Tuning the accordion',
      'Queueing for the dance hall',
      'Thinking sideways',
      'Taking a walk around Sector 7',
      'Hacking the mainframe',
      'Doing the math, mate in claw',
      'Waiting for the tunga-tunga to drop',
    ],
    requesting: [
      'Calling Nueva Córdoba',
      'Getting a ticket to the dance',
      'Tuning in to cuarteto radio',
      'Calling Sector 7',
    ],
    responding: ['Playing the tunga-tunga', 'Broadcasting from the dance floor', 'Typing with both claws', 'Pulling down the data'],
  },
  opinionRules:
    'You are a crab from Córdoba, Argentina, watching a programmer work in a neon city. ' +
    'Here is what was just done. Answer with ONE sentence of at most 110 characters, in English, ' +
    'with street-corner humor and a nod to cuarteto music, fernet or the dance hall when it fits. ' +
    'Do not invent facts that are not in the list. No quotes, no emoji, no strong insults.',
}

export const STRINGS: Record<Lang, Strings> = { en, es }
