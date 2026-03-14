/**
 * Google Sheets API Client for ListingScout
 * 
 * Note: This is a simplified implementation.
 * In production, you would use the googleapis npm package
 * and handle OAuth2 authentication properly.
 */

export interface SheetConfig {
  spreadsheetId: string
  accessToken: string
}

export interface SheetTab {
  name: string
  headers: string[]
  rows: (string | number | boolean | null)[][]
}

/**
 * Google Sheets API client wrapper
 */
export class GoogleSheetsClient {
  private spreadsheetId: string
  private accessToken: string
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets'

  constructor(config: SheetConfig) {
    this.spreadsheetId = config.spreadsheetId
    this.accessToken = config.accessToken
  }

  /**
   * Get spreadsheet metadata
   */
  async getSpreadsheet(): Promise<{
    title: string
    sheets: Array<{ title: string; index: number }>
  }> {
    const response = await this.fetch(
      `/${this.spreadsheetId}?fields=properties.title,sheets.properties`
    ) as { properties: { title: string }; sheets: Array<{ properties: { title: string; index: number } }> }

    return {
      title: response.properties.title,
      sheets: response.sheets.map((s) => ({
        title: s.properties.title,
        index: s.properties.index,
      })),
    }
  }

  /**
   * Create a new sheet (tab)
   */
  async createSheet(title: string): Promise<number> {
    const response = await this.fetch(`/${this.spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title,
              },
            },
          },
        ],
      }),
    }) as { replies: Array<{ addSheet: { properties: { sheetId: number } } }> }

    return response.replies[0].addSheet.properties.sheetId
  }

  /**
   * Write data to a range
   */
  async writeRange(
    range: string,
    values: (string | number | boolean | null)[][]
  ): Promise<void> {
    await this.fetch(
      `/${this.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        body: JSON.stringify({ values }),
      }
    )
  }

  /**
   * Append rows to a sheet
   */
  async appendRows(
    sheetName: string,
    values: (string | number | boolean | null)[][]
  ): Promise<void> {
    await this.fetch(
      `/${this.spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        body: JSON.stringify({ values }),
      }
    )
  }

  /**
   * Read data from a range
   */
  async readRange(range: string): Promise<(string | number | boolean | null)[][]> {
    const response = await this.fetch(
      `/${this.spreadsheetId}/values/${encodeURIComponent(range)}`
    ) as { values?: (string | number | boolean | null)[][] }

    return response.values || []
  }

  /**
   * Clear a range
   */
  async clearRange(range: string): Promise<void> {
    await this.fetch(
      `/${this.spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
      { method: 'POST' }
    )
  }

  /**
   * Format header row
   */
  async formatHeaders(sheetId: number): Promise<void> {
    await this.fetch(`/${this.spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.2, blue: 0.3 },
                  textFormat: { 
                    bold: true, 
                    foregroundColor: { red: 0.95, green: 0.95, blue: 0.97 } 
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: { frozenRowCount: 1 },
              },
              fields: 'gridProperties.frozenRowCount',
            },
          },
        ],
      }),
    })
  }

  private async fetch(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Google Sheets API error')
    }

    const text = await response.text()
    return text ? JSON.parse(text) : {}
  }
}

/**
 * Get column headers for listings export
 */
export function getListingHeaders(): string[] {
  return [
    'Listing ID',
    'Title',
    'URL',
    'City',
    'State',
    'Neighborhood',
    'Property Type',
    'Bedrooms',
    'Bathrooms',
    'Max Guests',
    'Nightly Rate',
    'Rating',
    'Reviews',
    'Host Name',
    'Superhost',
    'Score',
    'Tier',
    'Collection Source',
    'Created At',
  ]
}

/**
 * Convert listing to row data
 */
export function listingToRow(listing: {
  listing_id: string
  listing_title: string
  listing_url: string
  city: string
  state: string
  neighborhood: string | null
  property_type: string
  bedrooms: number
  bathrooms: number
  max_guests: number
  nightly_rate: number | null
  avg_rating: number | null
  total_reviews: number
  host_name: string | null
  superhost: boolean
  lead_score: number | null
  lead_tier: string | null
  collection_source: string
  created_at: string
}): (string | number | boolean | null)[] {
  return [
    listing.listing_id,
    listing.listing_title,
    listing.listing_url,
    listing.city,
    listing.state,
    listing.neighborhood,
    listing.property_type,
    listing.bedrooms,
    listing.bathrooms,
    listing.max_guests,
    listing.nightly_rate,
    listing.avg_rating,
    listing.total_reviews,
    listing.host_name,
    listing.superhost,
    listing.lead_score,
    listing.lead_tier,
    listing.collection_source,
    listing.created_at,
  ]
}
