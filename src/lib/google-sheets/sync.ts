/**
 * Google Sheets Sync Logic for ListingScout
 * 
 * Handles bidirectional sync between Supabase and Google Sheets.
 */

import { GoogleSheetsClient, getListingHeaders, listingToRow } from './client'

export interface SyncResult {
  success: boolean
  tabsUpdated: string[]
  rowsWritten: number
  error?: string
}

export interface SyncConfig {
  spreadsheetId: string
  accessToken: string
  campaignId: string
  campaignName: string
}

/**
 * Sync listings to Google Sheets
 * 
 * Creates/updates three tabs:
 * - Raw Data: All listings
 * - Leads: Strong leads only
 * - Weak: Weak leads only
 */
export async function syncListingsToSheets(
  config: SyncConfig,
  listings: Array<{
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
  }>
): Promise<SyncResult> {
  const client = new GoogleSheetsClient({
    spreadsheetId: config.spreadsheetId,
    accessToken: config.accessToken,
  })

  const tabsUpdated: string[] = []
  let totalRows = 0

  try {
    // Get existing sheets
    const spreadsheet = await client.getSpreadsheet()
    const existingTabs = new Set(spreadsheet.sheets.map(s => s.title))

    const headers = getListingHeaders()

    // Process each tab
    const tabs = [
      { name: 'Raw Data', filter: () => true },
      { name: 'Leads', filter: (l: typeof listings[0]) => l.lead_tier === 'strong' },
      { name: 'Weak', filter: (l: typeof listings[0]) => l.lead_tier === 'weak' },
    ]

    for (const tab of tabs) {
      const tabName = `${config.campaignName} - ${tab.name}`
      const filteredListings = listings.filter(tab.filter)

      // Create tab if it doesn't exist
      if (!existingTabs.has(tabName)) {
        await client.createSheet(tabName)
      }

      // Clear existing data
      await client.clearRange(`'${tabName}'!A:Z`)

      // Write headers and data
      const rows = [
        headers,
        ...filteredListings.map(listingToRow),
      ]

      await client.writeRange(`'${tabName}'!A1`, rows)

      tabsUpdated.push(tabName)
      totalRows += filteredListings.length
    }

    return {
      success: true,
      tabsUpdated,
      rowsWritten: totalRows,
    }
  } catch (error) {
    return {
      success: false,
      tabsUpdated,
      rowsWritten: totalRows,
      error: error instanceof Error ? error.message : 'Sync failed',
    }
  }
}

/**
 * Read changes from Google Sheets (for bidirectional sync)
 * 
 * Looks for new rows added to the Raw Data tab and imports them.
 */
export async function readChangesFromSheets(
  config: SyncConfig
): Promise<{
  success: boolean
  newListings: Array<Record<string, unknown>>
  error?: string
}> {
  const client = new GoogleSheetsClient({
    spreadsheetId: config.spreadsheetId,
    accessToken: config.accessToken,
  })

  try {
    const tabName = `${config.campaignName} - Raw Data`
    const data = await client.readRange(`'${tabName}'!A:S`)

    if (data.length < 2) {
      return { success: true, newListings: [] }
    }

    const headers = data[0] as string[]
    const rows = data.slice(1)

    const listings = rows.map(row => {
      const listing: Record<string, unknown> = {}
      headers.forEach((header, i) => {
        listing[header] = row[i]
      })
      return listing
    })

    // Filter to listings without IDs (new additions)
    const newListings = listings.filter(l => !l['ID'])

    return {
      success: true,
      newListings,
    }
  } catch (error) {
    return {
      success: false,
      newListings: [],
      error: error instanceof Error ? error.message : 'Read failed',
    }
  }
}

/**
 * Get sync status for a campaign
 */
export async function getSyncStatus(
  spreadsheetId: string,
  accessToken: string
): Promise<{
  connected: boolean
  spreadsheetTitle?: string
  lastSync?: string
  error?: string
}> {
  try {
    const client = new GoogleSheetsClient({
      spreadsheetId,
      accessToken,
    })

    const spreadsheet = await client.getSpreadsheet()

    return {
      connected: true,
      spreadsheetTitle: spreadsheet.title,
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}
