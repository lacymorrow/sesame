import Fastify, { FastifyInstance } from 'fastify'
import { VaultStore, getConfig } from './store'
import { generateCode, getTimeRemaining } from './totp'
import { createHash } from 'node:crypto'

let server: FastifyInstance | null = null

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function startApiServer(store: VaultStore, key: Buffer): Promise<FastifyInstance> {
  if (server) return server

  const config = getConfig()
  const fastify = Fastify({ logger: false })

  // Optional bearer token auth
  if (config.apiTokenHash) {
    fastify.addHook('onRequest', async (request, reply) => {
      if (request.url === '/health') return
      const auth = request.headers.authorization
      if (!auth || !auth.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'Missing or invalid authorization header' })
        return
      }
      const token = auth.slice(7)
      if (hashToken(token) !== config.apiTokenHash) {
        reply.code(403).send({ error: 'Invalid token' })
        return
      }
    })
  }

  fastify.get('/health', async () => ({ status: 'ok', version: '0.1.0' }))

  fastify.get('/accounts', async () => {
    const accounts = store.listAccounts()
    return accounts.map((a) => ({ name: a.name, issuer: a.issuer, created_at: a.created_at }))
  })

  fastify.get<{ Params: { account: string } }>('/codes/:account', async (request, reply) => {
    const { account } = request.params
    const secret = store.getDecryptedSecret(account, key)
    if (!secret) {
      reply.code(404).send({ error: `Account "${account}" not found` })
      return
    }
    store.logAccess(account, 'api')
    const code = generateCode(secret)
    const remaining = getTimeRemaining()
    return { code, remaining }
  })

  await fastify.listen({ port: config.port, host: '127.0.0.1' })
  server = fastify
  return fastify
}

export async function stopApiServer() {
  if (server) {
    await server.close()
    server = null
  }
}
