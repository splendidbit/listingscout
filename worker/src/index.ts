import Fastify from 'fastify'
import inngestFastify from 'inngest/fastify'
import { env } from './lib/env.js'
import { registerHealthRoute } from './routes/health.js'
import { inngest } from './inngest/client.js'
import { functions } from './inngest/functions/index.js'

async function main() {
  const app = Fastify({
    logger: { level: 'info' },
  })

  await registerHealthRoute(app)

  // Inngest fastify plugin (v4: default export is the plugin; `serve` is a handler)
  await app.register(inngestFastify, {
    client: inngest,
    functions,
  })

  await app.listen({ host: '0.0.0.0', port: env.PORT })
  app.log.info(`listingscout-worker listening on :${env.PORT}`)
}

main().catch((err) => {
  console.error('worker failed to start', err)
  process.exit(1)
})
