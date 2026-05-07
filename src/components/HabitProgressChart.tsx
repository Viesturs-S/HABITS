type HabitProgressChartProps = {
  dailyTotals: number[]
  maxHabits: number
}

export function HabitProgressChart({ dailyTotals, maxHabits }: HabitProgressChartProps) {
  const n = dailyTotals.length
  const maxVal = Math.max(1, maxHabits, ...dailyTotals)
  const vbW = 400
  const vbH = 112
  const padL = 32
  const padR = 10
  const padT = 14
  const padB = 26
  const innerW = vbW - padL - padR
  const innerH = vbH - padT - padB

  const xs = n <= 1 ? [padL + innerW / 2] : dailyTotals.map((_, i) => padL + (i / (n - 1)) * innerW)
  const ys = dailyTotals.map((v) => padT + (1 - v / maxVal) * innerH)

  const points = xs.map((x, i) => `${x},${ys[i]}`).join(' ')
  const area =
    n === 0
      ? ''
      : `M ${xs[0]},${padT + innerH} L ${points.replace(/ /g, ' L ')} L ${xs[xs.length - 1]},${padT + innerH} Z`

  const xLabelEvery = n <= 14 ? 2 : n <= 22 ? 3 : 5

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-xs font-medium text-stone-500">
        Habits completed per day this month
      </p>
      <svg
        className="w-full text-teal-800/90"
        viewBox={`0 0 ${vbW} ${vbH}`}
        role="img"
        aria-label="Line chart of total habits completed each day"
      >
        <title>Daily completion totals</title>

        <line
          x1={padL}
          y1={padT + innerH}
          x2={vbW - padR}
          y2={padT + innerH}
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={1}
        />
        <text
          x={padL - 6}
          y={padT + 4}
          textAnchor="end"
          className="fill-stone-500"
          fontSize="10"
        >
          {maxVal}
        </text>
        <text x={padL - 6} y={padT + innerH} textAnchor="end" className="fill-stone-500" fontSize="10">
          0
        </text>

        {area && n >= 2 ? <path d={area} className="fill-teal-500/15" stroke="none" /> : null}

        {n >= 2 ? (
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
        ) : null}

        {dailyTotals.map((_, i) => (
          <circle key={i} cx={xs[i]} cy={ys[i]} r={3.5} className="fill-teal-600" />
        ))}

        {dailyTotals.map((_, i) =>
          i % xLabelEvery === 0 || i === n - 1 ? (
            <text
              key={`d-${i}`}
              x={xs[i]}
              y={vbH - 6}
              textAnchor="middle"
              className="fill-stone-500"
              fontSize="9"
            >
              {i + 1}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}
