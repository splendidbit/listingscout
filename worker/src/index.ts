import Fastify from 'fastify'
import { env } from './lib/env.js'
import { registerHealthRoute } from './routes/health.js'

async function main() {
  const app = Fastify({
    logger: { level: 'info' },
  })

  await registerHealthRoute(app)

  await app.listen({ host: '0.0.0.0', port: env.PORT })
  app.log.info(`listingscout-worker listening on :${env.PORT}`)
}

main().catch((err) => {
  console.error('worker failed to start', err)
  process.exit(1)
})
