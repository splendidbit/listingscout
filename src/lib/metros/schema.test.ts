import { describe, it, expect } from 'vitest'
import { metroFormSchema } from './schema'

describe('metroFormSchema', () => {
  const validInput = {
    name: 'Scottsdale',
    slug: 'scottsdale-az',
    state: 'AZ',
    country: 'US',
    airroi_market_id: null,
    airdna_market_id: null,
    crawl_enabled: true,
    crawl_cron: '0 7 * * *',
    airbnb_search_config: { bbox: [1, 2, 3, 4] },
  }

  it('accepts a valid input', () => {
    const result = metroFormSchema.parse(validInput)
    expect(result.name).toBe('Scottsdale')
    expect(result.slug).toBe('scottsdale-az')
    expect(result.state).toBe('AZ')
  })

  it('uppercases the state code', () => {
    const result = metroFormSchema.parse({ ...validInput, state: 'az' })
    expect(result.state).toBe('AZ')
  })

  it('rejects slugs with uppercase letters', () => {
    expect(() =>
      metroFormSchema.parse({ ...validInput, slug: 'Scottsdale-AZ' })
    ).toThrow()
  })

  it('rejects empty names', () => {
    expect(() =>
      metroFormSchema.parse({ ...validInput, name: '' })
    ).toThrow()
  })

  it('defaults country to US when omitted', () => {
    const { country: _c, ...rest } = validInput
    const result = metroFormSchema.parse(rest)
    expect(result.country).toBe('US')
  })
})
