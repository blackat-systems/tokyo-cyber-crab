"""Genera tunga.wav: base ritmica generica de cuarteto (tunga-tunga), original.
Determinista: semilla fija, sin dependencias externas."""
import math, random, struct, wave, os

SR = 22050
# La elegida por Joa (12/11/2026) es la 'b', con acordeón: es la que sale por defecto.
# Otras para probar: TUNGA_VAR=a (más rápido y seco), c (más cuerpo), p (piano).
V = os.environ.get('TUNGA_VAR', 'b')
BPM = 176 if V == 'a' else 160
BEAT = 60.0 / BPM
TOTAL = 7 * BEAT + 0.53
N = int(SR * TOTAL)
buf = [0.0] * N
rng = random.Random(1234)

def add(t0, samples, gain=1.0):
    i0 = int(t0 * SR)
    for k, v in enumerate(samples):
        if i0 + k < N:
            buf[i0 + k] += v * gain

def tone(freq, dur, decay, harm=(1.0,), tri=False):
    out = []
    for k in range(int(dur * SR)):
        t = k / SR
        v = 0.0
        for h, a in enumerate(harm, start=1):
            # cada armónico se apaga más rápido que el anterior: brillo al
            # golpear y cuerpo después, como una cuerda de piano
            v += a * math.exp(-t / (decay / (1 + 0.45 * (h - 1)))) * math.sin(2 * math.pi * freq * h * t)
        out.append(v * min(1.0, t / 0.003))
    return out

def bass(freq):
    # Cuerda grave pulsada y cortada: suena y deja aire antes de la siguiente,
    # que es lo que arma el "tun-ga". Más armónicos para que se distinga la nota.
    return tone(freq, 0.20, 0.07, (1.0, 0.55, 0.30, 0.15, 0.08))

def kick():
    out, ph = [], 0.0
    for k in range(int(0.16 * SR)):
        t = k / SR
        f = 50 + 70 * math.exp(-t / 0.03)
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.exp(-t / 0.05))
    return out

# 'b': lengüeta de acordeón, con todos los armónicos; si no, tecla de piano
CH_HARM = tuple(1.0 / h for h in range(1, 9)) if V == 'b' else (1.0, 0.7, 0.45, 0.3, 0.18, 0.1)
CH_DUR, CH_DEC = (0.07, 0.03) if V == 'a' else (0.16, 0.09) if V == 'b' else (0.11, 0.045)

def chord(freqs, dur, decay):
    out = [0.0] * int(dur * SR)
    for f in freqs:
        for k, v in enumerate(tone(f, dur, decay, CH_HARM)):
            out[k] += v / len(freqs)
    return out

def shaker():
    out, prev = [], 0.0
    for k in range(int(0.06 * SR)):
        t = k / SR
        n = rng.uniform(-1, 1)
        hp = n - prev  # pasa-altos simple
        prev = n
        out.append(hp * math.exp(-t / 0.015))
    return out

# Rueda de práctica en La menor: Am - G - F - E7, y el remate vuelve a Am.
# Patrón por compás: 1 TUN (izquierda, tónica) · y GA (derecha, acorde) ·
# 2 TUN (izquierda, quinta) · y GA (derecha, acorde).
# Cada entrada: (tónica, quinta, notas del acorde).
Am = (110.00, 82.41, (220.00, 261.63, 329.63))          # La-Mi · La Do Mi
G = (98.00, 73.42, (196.00, 246.94, 293.66))            # Sol-Re · Sol Si Re
F = (174.61, 130.81, (174.61, 220.00, 261.63))          # Fa-Do · Fa La Do
E7 = (164.81, 123.47, (207.65, 246.94, 293.66, 329.63)) # Mi-Si · Sol# Si Re Mi
PROG = [Am, G, F, E7]

for bar, (root, fifth, notes) in enumerate(PROG):
    for beat in range(2):
        t = (bar * 2 + beat) * BEAT
        last = (bar == 3 and beat == 1)
        if last:
            # remate: acorde de tonica largo, con bombo
            add(t, kick(), 0.35)
            add(t, bass(110.0), 0.80)
            add(t, chord((220.00, 261.63, 329.63, 440.00), 0.5, 0.17), 0.40)
            continue
        # El bajo manda; el bombo y el acorde acompañan sin taparlo.
        add(t, kick(), 0.30)
        add(t, bass(root if beat == 0 else fifth), 0.80)
        to = t + BEAT / 2  # contratiempo
        add(to, chord(notes, CH_DUR, CH_DEC), 0.38)
        if V == 'c':
            add(t, kick(), 0.2)
            add(t, bass((root if beat == 0 else fifth) * 2), 0.35)
            add(to, chord([f * 2 for f in notes], CH_DUR, CH_DEC), 0.16)
        add(to, shaker(), 0.08)

# fundidos de 5 ms
fade = int(0.005 * SR)
for i in range(fade):
    g = i / fade
    buf[i] *= g
    buf[N - 1 - i] *= g

peak = max(abs(v) for v in buf)
scale = 0.65 * 32767 / peak
data = b"".join(struct.pack("<h", max(-32767, min(32767, int(round(v * scale))))) for v in buf)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tunga.wav" if V == "b" else "tunga-%s.wav" % V)
with wave.open(out, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(data)
