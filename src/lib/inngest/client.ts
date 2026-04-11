import { Inngest } from 'inngest'
import type { InngestEvents } from './events'

export const inngest = new Inngest({
  id: 'listingscout',
})

// Typed send helper — preferred over calling inngest.send directly from app code.
export async function sendEvent<K extends keyof InngestEvents>(
  name: K,
  data: InngestEvents[K]['data']
): Promise<void> {
  await inngest.send({ name: name as string, data })
}
