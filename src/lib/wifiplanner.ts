/* Channel Planner — planificación de canales WiFi 2.4/5/6 GHz.
   Todo el modelado es local: solapamiento real de canales 2.4 GHz (ancho 20 MHz,
   separación de 5 MHz/canal), mapa de congestión por canal, grupos de 40/80 MHz
   en 5 GHz con avisos DFS y PSC (Preferred Scanning Channels) de 6 GHz. */

export type Band = '2.4' | '5' | '6'

export interface ApEntry {
  id: string
  ssid: string
  channel: number
  strength: number // 0-100 (potencia relativa de la señal)
}

/* ---------- 2.4 GHz ---------- */

export const CH24_MAX = 13 // España/EU: 1-13

/* Dos canales de 2.4 GHz solapan si |c1-c2| < 4 (20 MHz de ancho, 5 MHz de paso).
   Devuelve el factor de interferencia mutua 0..1 ponderado por la potencia relativa. */
export const overlap24 = (c1: number, c2: number, w1 = 1, w2 = 1): number => {
  if (c1 === c2) return 0.75 * Math.max(w1, w2) // co-canal: se comparten el medio (CSMA), no se destruyen
  const sep = Math.abs(c1 - c2)
  if (sep >= 4) return 0
  return ((4 - sep) / 4) * 0.75 * Math.max(w1, w2) // solape parcial: colisiones reales
}

/* Mapa de congestión por canal 1..13 dada una lista de APs vecinos. */
export const congestion24 = (aps: ApEntry[]): { channel: number; score: number; coChannel: number; partial: number }[] => {
  const out: { channel: number; score: number; coChannel: number; partial: number }[] = []
  for (let ch = 1; ch <= CH24_MAX; ch++) {
    let coChannel = 0
    let partial = 0
    for (const ap of aps) {
      const w = Math.max(0.1, ap.strength / 100)
      const o = overlap24(ch, ap.channel, w, w)
      if (ap.channel === ch) coChannel += w
      else if (o > 0) partial += o
    }
    out.push({ channel: ch, score: Math.min(10, coChannel * 0.6 + partial * 1.4), coChannel, partial })
  }
  return out
}

/* Los 3 canales con menos interferencia total (empates → canal más bajo). */
export const bestChannels24 = (aps: ApEntry[], count = 3): number[] =>
  congestion24(aps)
    .slice()
    .sort((a, b) => a.score - b.score || a.channel - b.channel)
    .slice(0, count)
    .map((c) => c.channel)

/* Plan automático para N APs PROPIOS en 2.4 GHz: 1/6/11 nunca solapan. */
export const plan24 = (count: number): { assignments: { ap: number; channel: number }[]; ok: boolean; note: string } => {
  const base = [1, 6, 11]
  if (count <= 3) {
    return {
      assignments: Array.from({ length: count }, (_, i) => ({ ap: i + 1, channel: base[i] })),
      ok: true,
      note: 'Con ≤3 APs en 2.4 GHz la tríada 1/6/11 es óptima: separación de 4 canales = solape cero.',
    }
  }
  if (count <= 6) {
    // reutiliza la tríada en celdas separadas físicamente
    return {
      assignments: Array.from({ length: count }, (_, i) => ({ ap: i + 1, channel: base[i % 3] })),
      ok: true,
      note: 'Más de 3 APs: reutiliza 1/6/11 alternando, SOLO si los APs con el mismo canal quedan lejos (apagón de señal entre celdas ≥15 dB). Cuenta el solape con los APs VECINOS que no controlas.',
    }
  }
  return {
    assignments: Array.from({ length: count }, (_, i) => ({ ap: i + 1, channel: base[i % 3] })),
    ok: false,
    note: '7+ APs en 2.4 GHz: co-canal garantizado. Pasa los clientes a 5/6 GHz (band steering) y deja 2.4 solo para IoT legacy.',
  }
}

/* ---------- 5 GHz ---------- */

export interface Ch5Info {
  channel: number
  dfs: boolean
  weather?: boolean // radar meteorológico: TPC más estricto
  note?: string
}

export const CH5: Ch5Info[] = [
  { channel: 36, dfs: false }, { channel: 40, dfs: false }, { channel: 44, dfs: false }, { channel: 48, dfs: false },
  { channel: 52, dfs: true, weather: true }, { channel: 56, dfs: true, weather: true }, { channel: 60, dfs: true, weather: true }, { channel: 64, dfs: true, weather: true },
  { channel: 100, dfs: true }, { channel: 104, dfs: true }, { channel: 108, dfs: true }, { channel: 112, dfs: true },
  { channel: 116, dfs: true }, { channel: 120, dfs: true }, { channel: 124, dfs: true }, { channel: 128, dfs: true },
  { channel: 132, dfs: true }, { channel: 136, dfs: true }, { channel: 140, dfs: true }, { channel: 144, dfs: true },
  { channel: 149, dfs: false, note: 'UNII-3: también legal en exteriores' }, { channel: 153, dfs: false }, { channel: 157, dfs: false }, { channel: 161, dfs: false },
  { channel: 165, dfs: false, note: 'solo 20 MHz' },
]

/* Grupos de 80 MHz (canal central) en 5 GHz: un grupo DFS obliga a CAC. */
export const GROUPS80_5G = [
  { center: 42, channels: [36, 40, 44, 48], dfs: false },
  { center: 58, channels: [52, 56, 60, 64], dfs: true, weather: true },
  { center: 106, channels: [100, 104, 108, 112], dfs: true },
  { center: 122, channels: [116, 120, 124, 128], dfs: true },
  { center: 138, channels: [132, 136, 140, 144], dfs: true },
  { center: 155, channels: [149, 153, 157, 161], dfs: false },
]

/* ---------- 6 GHz (WiFi 6E/7) ---------- */

/* PSC: los 15 canales preferidos cada 80 MHz que TODOS los clientes buscan primero. */
export const PSC_6GHZ = [5, 21, 37, 53, 69, 85, 101, 117, 133, 149, 165, 181, 197, 213, 229]

/* ---------- sugerencia por banda ---------- */

export interface PlanSuggestion {
  band: Band
  headline: string
  lines: string[]
  warn?: string
}

export const suggest = (band: Band, apCount: number): PlanSuggestion => {
  if (band === '2.4') {
    const plan = plan24(apCount)
    return {
      band,
      headline: `Plan ${plan.ok ? 'viable' : 'a duras penas'} para ${apCount} AP(s)`,
      lines: [
        `Asignación: ${plan.assignments.map((a) => `AP${a.ap}→canal ${a.channel}`).join(' · ') || '—'}`,
        plan.note,
        'Nunca elijas canales separados 1-3 (ej. 6 y 9): es PEOR que co-canal, porque ni comparten el medio limpio ni evitan colisiones.',
      ],
      warn: plan.ok ? undefined : 'Demasiados APs para 2.4 GHz: migra a 5/6 GHz.',
    }
  }
  if (band === '5') {
    const nonDfs = CH5.filter((c) => !c.dfs)
    return {
      band,
      headline: `5 GHz: ${nonDfs.length} canales sin DFS + ${CH5.filter((c) => c.dfs).length} con DFS (radar)`,
      lines: [
        'UNII-1 (36-48): sin DFS, la elección por defecto para todo.',
        'UNII-3 (149-161): sin DFS y con más potencia permitida: ideal para puentes/largo alcance.',
        'DFS (52-144): menos clientes vecinos y hasta 8 grupos de 80 MHz, pero si el AP oye radar → salto de canal y ~60 s de silencio (CAC).',
        `Plan para ${apCount} AP(s): ${GROUPS80_5G.filter((g) => !g.dfs).slice(0, apCount).map((g) => `AP→${g.channels[0]}/${g.channels[3]} (80 MHz c${g.center})`).join(' · ') || 'usa UNII-1+UNII-3 separando al máximo'}.`,
        'Ancho de canal: 80 MHz solo si hay pocos vecinos; con un aire congestionado 40 MHz rinde igual en distancia.',
      ],
      warn: apCount > 3 ? 'Con muchos APs, DFS 100-144 te da grupos extra sin solaparte: actívalo si tus clientes lo soportan.' : undefined,
    }
  }
  return {
    band: '6',
    headline: '6 GHz (WiFi 6E/7): aire limpio y solo PSC para escanear',
    lines: [
      `PSC: ${PSC_6GHZ.join(', ')}. Los clientes SOLO escanean estos 15 canales primero: si tu AP no está en un PSC, tarda en aparecer (o no aparece).`,
      'Con 1200 MHz de espectro hay sitio para 7 APs con 80 MHz SIN solaparse — el fin del juego de Tetris de 2.4 GHz.',
      'Sin canales DFS y con AFC (Automated Frequency Coordination) solo en la parte de 6 GHz de potencia alta para exteriores.',
      'Ojo: los clientes 6 GHz siguen siendo minoría. Deja un AP en 2.4/5 para el hardware legacy.',
      'PMF (802.11w) es OBLIGATORIO en 6 GHz: ni deauth ni gestión spoofeada, la banda nace blindada.',
    ],
  }
}
