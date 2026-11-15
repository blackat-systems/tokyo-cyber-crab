import type { ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { P } from './palette'

// El nombre de la escena: la ciudad de neón que dibuja el hook de Backdrop.
export const BACKDROP = 'neo-cba'
// Vidrio ahumado sobre la ciudad: primero que se lea, después que se luzca.
// Con 0.8 y 12 la ciudad quedaba en una mancha; con 0.5 se distinguen los edificios
// pero el sol peleaba con las letras. 0.55 con el tinte de la página deja el texto
// en 6:1 aun en lo más claro del sol, y la ciudad se sigue viendo.
export const GLASS = { blur: 4, tint: P.s0, opacity: 0.55 } as const

// Los colores de toda la app salen de la misma paleta que el panel y la ciudad:
// magenta de acento, cian y violeta de neón sobre el azul noche de Tokyo Night.
// Es un look sólo de noche: la ciudad no tiene versión de día.
const made = makeColors({
  label: 'Neo-Córdoba',
  only: 'dark',
  roles: { accent: P.magenta, danger: P.red, success: P.green, warning: P.yellow, pro: P.violet },
  dark: {
    gray: {
      anchors: {
        'surface-0': P.s0,
        'surface-1': P.s1,
        'surface-2': P.s2,
        // Si se aclara más, el texto apagado deja de leerse en los menús.
        'surface-3': P.s3,
        'text-primary': P.text,
        'text-secondary': P.dim,
        'text-muted': P.muted,
      },
    },
    git: { added: P.green, removed: P.red, modified: P.yellow, merged: P.violet },
  },
  codeTheme: { dark: 'tokyo-night' },
})

/** Lo que el generador objeta. Si una línea empieza con "Desktop won't paint", la app ignora todo el tema. */
export const LOOK_PROBLEMS: readonly string[] = made.problems

/** El look entero. `$.theme.set` nombra el tema completo, así que va todo junto en una llamada. */
export const LOOK: ThemeSetArgs = {
  colors: made.theme,
  backdrop: { scene: BACKDROP, glass: GLASS },
  overrideColorScheme: 'dark',
}
