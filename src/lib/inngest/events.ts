// Event payload definitions shared between the Next.js app (producer)
// and the worker (consumer). When adding a new event, add it here first
// and mirror the change to worker/src/inngest/events.ts.

export type InngestEvents = {
  'metros/ping.requested': {
    data: {
      metroId: string
      userId: string
    }
  }
}
