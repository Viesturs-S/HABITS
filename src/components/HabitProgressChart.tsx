import { useMemo, useState } from 'react'

type HabitProgressChartProps = {
  dailyTotals: number[]
  maxHabits: number
  periodLabel: string
}

export function HabitProgressChart({
  dailyTotals,
  maxHabits,
  periodLabel,
}: HabitProgressChartProps) {
  const [hover, setHover] = useState<number | null>(null)

  const n = dailyTotals.length
  const maxVal = Math.max(1, maxHabits, ...dailyTotals)

  const vbW = 440
  const vbH = 200
  const padL = 46
  const padR = 14
  const padT = 22
  const padB = 40
  const innerW = vbW - padL - padR
  const innerH = vbH - padT - padB

  const yTicks = useMemo(() => {
    if (maxVal <= 1) return [0, 1]
    if (maxVal <= 4) return Array.from({ length: maxVal + 1 }, (_, i) => i)
    const mid = Math.round(maxVal / 2)
    return [...new Set([0, mid, maxVal])].sort((a, b) => a - b)
  }, [maxVal])

  const baselineY = padT + innerH
  const slotW = n > 0 ? innerW / n : 0
  const barPad = n > 0 ? Math.min(2.5, slotW * 0.1) : 0
  const barW = Math.max(1, slotW - barPad * 2)

  const xCenter = (i: number) => padL + i * slotW + slotW / 2

  const xLabelEvery = n <= 12 ? 2 : n <= 20 ? 3 : n <= 28 ? 4 : 5

  return (
    <div className="w-full">
      <div className="mb-1 space-y-1 text-center">
        <p className="text-sm font-semibold text-stone-800">Daily completion</p>
        <p className="text-xs leading-snug text-stone-600">
          <span className="font-medium text-stone-700">{periodLabel}.</span> Each bar is one calendar day.
          Height shows how many habits you marked done that day (out of {maxHabits || '—'} tracked
          {maxHabits ? '' : '; add habits in the grid below'}). Hover a bar for the exact count.
        </p>
      </div>

      <div className="relative pt-1">
        {hover !== null && n > 0 ? (
          <p
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-[min(100%,22rem)] -translate-x-1/2 rounded-lg border border-teal-200/80 bg-teal-50/95 px-3 py-2 text-center text-xs font-medium text-teal-950 shadow-md backdrop-blur-[2px]"
            role="status"
          >
            Day {hover + 1}: {dailyTotals[hover]} habit{dailyTotals[hover] === 1 ? '' : 's'} completed
            {maxHabits ? ` (of ${maxHabits} tracked)` : ''}
          </p>
        ) : null}
        <svg
          className="relative z-0 w-full text-teal-800/90"
          viewBox={`0 0 ${vbW} ${vbH}`}
          role="img"
          aria-label={`Bar chart of habits completed each day in ${periodLabel}`}
        >
        <title>Habits completed per day</title>

        {yTicks.map((tv) => {
          const gy = padT + (1 - tv / maxVal) * innerH
          return (
            <g key={tv}>
              <line
                x1={padL}
                y1={gy}
                x2={vbW - padR}
                y2={gy}
                stroke="currentColor"
                strokeOpacity={tv === 0 ? 0.22 : 0.1}
                strokeDasharray={tv === 0 ? undefined : '3 4'}
                strokeWidth={1}
              />
              <text x={padL - 8} y={gy + 3} textAnchor="end" className="fill-stone-500" fontSize="9">
                {tv}
              </text>
            </g>
          )
        })}

        {n > 0 &&
          dailyTotals.map((_, i) => {
            const x = padL + i * slotW + barPad
            const v = dailyTotals[i]
            const bh = (v / maxVal) * innerH
            const y = baselineY - bh
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={padT}
                  width={barW}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
                <rect
                  x={x}
                  y={v === 0 ? baselineY - 1 : y}
                  width={barW}
                  height={v === 0 ? 1 : Math.max(bh, 2)}
                  rx={2}
                  className={
                    hover === i
                      ? 'fill-teal-600 stroke-teal-800/40'
                      : 'fill-teal-500/88 stroke-teal-800/25'
                  }
                  strokeWidth={1}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            )
          })}

        {n > 0 &&
          dailyTotals.map((_, i) =>
            i % xLabelEvery === 0 || i === n - 1 ? (
              <text
                key={`d-${i}`}
                x={xCenter(i)}
                y={vbH - 8}
                textAnchor="middle"
                className="fill-stone-500"
                fontSize="9"
              >
                {i + 1}
              </text>
            ) : null,
          )}

        {n === 0 ? (
          <text
            x={vbW / 2}
            y={padT + innerH / 2}
            textAnchor="middle"
            className="fill-stone-400"
            fontSize="11"
          >
            No days in range
          </text>
        ) : null}
      </svg>
      </div>
    </div>
  )
}
