import { Inngest } from 'inngest'
import type { InngestEvents } from './events.js'

export type { InngestEvents }

export const inngest = new Inngest({
  id: 'listingscout',
})
