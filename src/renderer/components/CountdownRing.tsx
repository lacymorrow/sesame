import { motion } from 'framer-motion'

interface CountdownRingProps {
  remaining: number
  total?: number
  size?: number
}

export function CountdownRing({ remaining, total = 30, size = 32 }: CountdownRingProps) {
  const radius = (size - 4) / 2
  const circumference = 2 * Math.PI * radius
  const progress = remaining / total
  const offset = circumference * (1 - progress)

  const color =
    remaining <= 5
      ? 'text-red-400'
      : remaining <= 10
        ? 'text-amber-400'
        : 'text-emerald-400'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="-rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-zinc-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={color}
        />
      </svg>
      <motion.span
        className={`absolute inset-0 flex items-center justify-center text-[10px] font-medium ${
          remaining <= 5 ? 'text-red-400' : 'text-zinc-400'
        }`}
        animate={remaining <= 5 ? { scale: [1, 1.15, 1] } : {}}
        transition={remaining <= 5 ? { duration: 0.5, repeat: Infinity } : {}}
      >
        {remaining}
      </motion.span>
    </div>
  )
}
