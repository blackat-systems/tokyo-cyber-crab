# Tokyo Cyber Crab

![A pixel crab walking through a neon city in the rain, with a progress track under its feet](docs/hero.png)

A mod for Claude Code that puts a pixel crab from Córdoba, Argentina, next to your chat. A side panel shows what Claude is doing, step by step, while the crab walks its neon city: it works when Claude works, jumps when the task lands, glitches when something breaks, and sleeps the siesta in between. In the desktop app the whole window takes the same night-and-neon look.

[En español](README.md)

## What it does

- **A live panel of Claude's steps.** Every tool call shows as one line with its file or command, how long it took, and whether it worked. Runs of the same step fold into one line.
- **A menu of cards.** “What Claude is doing”, “Task list”, “Other Claudes helping” and “Session summary”: each card says in one line what it holds and unfolds when you tap it. Several can be open at once.
- **The crab walks your plan.** When Claude keeps a task list, the crab crosses a progress track toward a flag as items get done.
- **A context meter.** How much of the window the session has used, as a percentage and in tokens, with a neon bar in the panel and the percentage on the strip above the prompt box. It turns yellow at 70% and red at 90%.
- **Subagents get their own crabs.** Each one shows what it is working on, how many tools it has used, and how it ended.
- **A session scoreboard.** Prompts, steps, failures and time worked, under a neon equalizer that moves while Claude works.
- **A visor strip above the prompt box,** a closing line under each finished request, and a waiting line that says things like "Asking La Mona for a song" instead of "Thinking".
- **A look for the app.** Night-blue surfaces, neon accents, and a city skyline behind the conversation, with the crab on a rooftop.
- **Twelve outfits,** changed every five minutes or on demand, and a crab that comments on the work in the voice of a Córdoba street corner.
- **A short cuarteto riff,** the tunga-tunga, when a task with real work finishes. One command turns it off.

![The four moods of the crab: asleep, working in the rain, celebrating with fireworks, and glitching in red](docs/moods.en.png)

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install tokyo-crab --marketplace blackat-systems/tokyo-cyber-crab
```

From a shell:

```
claude plugin install tokyo-crab --marketplace blackat-systems/tokyo-cyber-crab
```

In the desktop app, click + next to the prompt box, then Plugins, then Add marketplace with `blackat-systems/tokyo-cyber-crab`, then Add plugin.

Installed at the user scope, the mod loads in every session after that, the desktop app included.

The crab speaks Spanish out of the box. For English, choose `en` when the installer asks for the language, or set it later as shown under Options.

## Where it shows

| | Desktop app | Terminal |
| --- | --- | --- |
| Panel, visor strip, closing line, waiting line | Yes, with the animated crab | Yes, with a text crab |
| App colors and city backdrop | Yes | No: the terminal draws no looks |

For the terminal there is a matching color theme in `themes/neo-cordoba.json`. Copy it to `~/.claude/themes/` and set `"theme": "custom:neo-cordoba"` in `~/.claude/settings.json`.

## Commands

| With `language: en` | Out of the box | What it does |
| --- | --- | --- |
| `/crab` | `/cangrejo` | Opens the panel. It also opens by itself when a session starts. |
| `/crab-outfit` | `/cangrejo-ropa` | Changes the crab's outfit. |
| `/crab-talk` | `/cangrejo-opina` | The crab comments on each finished task. Off by default, because each comment is one small model call. |
| `/cyber-sound` | `/cyber-sonido` | Turns the end-of-task sound on or off. |
| `/cyber` | `/cyber` | Turns the app colors, backdrop, visor strip and waiting line on or off. The panel stays. |

## Options

| Option | Values | Default |
| --- | --- | --- |
| `language` | `es`, the Spanish of Córdoba the crab was born speaking, or `en` | `es` |
| `name` | The tag above your own messages | empty, which shows `YOU` (`VOS` in Spanish) |

The installer asks for them. To change them later, edit `~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "tokyo-crab@tokyo-crab": {
      "options": { "language": "en", "name": "Joa" }
    }
  }
}
```

## The wardrobe

![The crab in each of its twelve outfits](docs/outfits.en.png)

## The palette

One palette, in [`hooks/palette.ts`](hooks/palette.ts), colors the app, the panel and the city. Each neon means one thing.

| Color | Hex | Means |
| --- | --- | --- |
| Magenta | `#ff4fd8` | The brand: section marks, the sign, the flag |
| Cyan | `#00e5ff` | Alive: whatever is running now |
| Green | `#39ff9a` | It worked |
| Red | `#ff3d71` | It failed |
| Orange | `#ff9e64` | The crab |

Text sits on night-blue surfaces from `#14141f` to `#1f2030`. Every text color keeps at least 4.7:1 contrast on all of them, and the dimmest label color keeps 5.3:1.

![The city backdrop: a skyline under a striped sun, with a neon grid below](docs/backdrop.png)

## Limits

- Built and tested on Windows, in the desktop app, against Claude Code 2.1.325. The mod API is early access and may change between releases.
- On a Claude Code build that does not take app colors yet, the mod falls back to the backdrop alone.
- The end-of-task sound plays through PowerShell on Windows and through Claude Code's own player on macOS. It has not been tried on macOS or Linux, and a Linux terminal has no player, so expect silence there.
- The look is dark only. The city has no daytime.

## Development

```
claude plugin validate .
claude plugin test .
node tools/preview.mjs
```

The last one writes `tools/preview.html` with all the art: the palette, every mood and outfit, the subagent crabs, the equalizer and the backdrop. It needs Node 22.15 or newer.

The art is plain SVG built in [`hooks/scene.ts`](hooks/scene.ts), and the crab's lines and outfits are in [`hooks/fun.ts`](hooks/fun.ts). Code comments are in Spanish.

## Credits

The night is in the spirit of [Tokyo Night](https://github.com/tokyo-night/tokyo-night-vscode-theme) by enkia. `hooks/make-colors.js` is the color generator from Claude Code's plugin authoring kit, copied in as that kit instructs. The sound is generated by `sounds/make_tunga.py`. The sign on the tower reads カニ, "kani", Japanese for crab.

This is an independent mod and is not affiliated with or endorsed by Anthropic.

MIT licensed. See [LICENSE](LICENSE).
