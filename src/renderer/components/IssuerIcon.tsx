import {
  Github,
  Cloud,
  Mail,
  Shield,
  Key,
  Globe,
  Database,
  Server,
  Code,
  type LucideIcon,
} from 'lucide-react'

const issuerIcons: Record<string, LucideIcon> = {
  github: Github,
  google: Mail,
  aws: Cloud,
  amazon: Cloud,
  cloudflare: Shield,
  digitalocean: Database,
  heroku: Server,
  gitlab: Code,
  bitbucket: Code,
  microsoft: Globe,
  azure: Cloud,
  discord: Globe,
  slack: Globe,
  twitter: Globe,
  npm: Code,
  docker: Database,
  vercel: Globe,
  netlify: Globe,
  stripe: Key,
  twilio: Globe,
}

const issuerColors: Record<string, string> = {
  github: 'bg-zinc-800 text-white',
  google: 'bg-blue-600 text-white',
  aws: 'bg-orange-500 text-white',
  amazon: 'bg-orange-500 text-white',
  cloudflare: 'bg-orange-400 text-white',
  digitalocean: 'bg-blue-500 text-white',
  gitlab: 'bg-orange-600 text-white',
  discord: 'bg-indigo-500 text-white',
  slack: 'bg-purple-600 text-white',
  microsoft: 'bg-blue-500 text-white',
  stripe: 'bg-violet-600 text-white',
  vercel: 'bg-zinc-800 text-white',
}

function getIssuerKey(issuer: string, name: string): string {
  const combined = `${issuer} ${name}`.toLowerCase()
  for (const key of Object.keys(issuerIcons)) {
    if (combined.includes(key)) return key
  }
  return ''
}

export function IssuerIcon({
  issuer,
  name,
  size = 'md',
}: {
  issuer: string
  name: string
  size?: 'sm' | 'md'
}) {
  const key = getIssuerKey(issuer, name)
  const Icon = key ? issuerIcons[key] : null
  const colorClass = key ? issuerColors[key] || 'bg-zinc-700 text-zinc-300' : ''
  const dim = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'
  const iconSize = size === 'sm' ? 14 : 18

  if (Icon) {
    return (
      <div
        className={`${dim} rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}
      >
        <Icon size={iconSize} />
      </div>
    )
  }

  // Letter fallback
  const letter = (issuer || name || '?').charAt(0).toUpperCase()
  const hue = (letter.charCodeAt(0) * 37) % 360
  return (
    <div
      className={`${dim} rounded-lg flex items-center justify-center shrink-0 text-white font-semibold`}
      style={{
        backgroundColor: `hsl(${hue}, 50%, 35%)`,
        fontSize: size === 'sm' ? 12 : 14,
      }}
    >
      {letter}
    </div>
  )
}
