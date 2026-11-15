export type StepStatus = 'running' | 'done' | 'error' | 'denied'
export type Step = {
  id: string
  tool: string
  label: string
  status: StepStatus
  startedAt: number
  ms?: number
  isSub: boolean
}
export type Mood = 'idle' | 'working' | 'done' | 'error'
export type PlanStatus = 'pending' | 'in_progress' | 'completed'
export type PlanItem = { content: string; status: PlanStatus }
export type AgentStatus = 'running' | 'done' | 'error'
export type SubAgent = {
  id: string
  description: string
  type: string
  status: AgentStatus
  startedAt: number
  ms?: number
  tools: number
  last?: string
}

/** Lo acumulado en la sesión, para el marcador del panel. */
export type Stats = { prompts: number; steps: number; fails: number; workMs: number }

declare module 'claude-code' {
  interface PluginState {
    'tokyo-crab': {
      steps: Shaped<Step[]>
      mood: Shaped<Mood>
      plan: Shaped<PlanItem[]>
      agents: Shaped<SubAgent[]>
      quip: Shaped<string>
      outfit: Shaped<number>
      backdrop: Shaped<boolean>
      stats: Shaped<Stats>
      sound: Shaped<boolean>
      chatty: Shaped<boolean>
    }
  }
}
