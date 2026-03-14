'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  X,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface ImportModalProps {
  campaignId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
}

interface ColumnMapping {
  listing_id: string
  listing_url: string
  listing_title: string
  property_type: string
  city: string
  state: string
  bedrooms: string
  bathrooms: string
  max_guests: string
  nightly_rate: string
  avg_rating: string
  total_reviews: string
  host_name: string
  superhost: string
}

const REQUIRED_FIELDS = ['listing_id', 'listing_url', 'listing_title', 'city', 'state'] as const
const OPTIONAL_FIELDS = [
  'property_type', 'bedrooms', 'bathrooms', 'max_guests', 
  'nightly_rate', 'avg_rating', 'total_reviews', 'host_name', 'superhost'
] as const

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete'

export function ListingImportModal({ 
  campaignId, 
  open, 
  onOpenChange,
  onImportComplete 
}: ImportModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<'csv' | 'json'>('csv')
  const [headers, setHeaders] = useState<string[]>([])
  const [data, setData] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({})
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    errors: string[]
  } | null>(null)

  const resetState = useCallback(() => {
    setStep('upload')
    setFile(null)
    setHeaders([])
    setData([])
    setMapping({})
    setImportResult(null)
  }, [])

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  const parseCSV = (text: string): { headers: string[], rows: Record<string, string>[] } => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row')

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => {
        row[h] = values[i] || ''
      })
      return row
    })

    return { headers, rows }
  }

  const parseJSON = (text: string): { headers: string[], rows: Record<string, string>[] } => {
    const parsed = JSON.parse(text)
    const rows = Array.isArray(parsed) ? parsed : [parsed]
    
    if (rows.length === 0) throw new Error('JSON array is empty')
    
    const headers = Object.keys(rows[0])
    const stringRows = rows.map(row => {
      const stringRow: Record<string, string> = {}
      for (const key of headers) {
        stringRow[key] = String(row[key] ?? '')
      }
      return stringRow
    })

    return { headers, rows: stringRows }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    const extension = uploadedFile.name.split('.').pop()?.toLowerCase()
    const type = extension === 'json' ? 'json' : 'csv'
    setFileType(type)

    try {
      const text = await uploadedFile.text()
      const { headers, rows } = type === 'csv' ? parseCSV(text) : parseJSON(text)
      
      setHeaders(headers)
      setData(rows)

      // Auto-map columns with matching names
      const autoMapping: Partial<ColumnMapping> = {}
      const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]
      
      for (const field of allFields) {
        const matchingHeader = headers.find(h => 
          h.toLowerCase().replace(/[_\s-]/g, '') === field.toLowerCase().replace(/[_\s-]/g, '')
        )
        if (matchingHeader) {
          autoMapping[field] = matchingHeader
        }
      }
      
      setMapping(autoMapping)
      setStep('mapping')
    } catch (error) {
      toast.error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const isRequiredMappingComplete = () => {
    return REQUIRED_FIELDS.every(field => mapping[field])
  }

  const handleImport = async () => {
    if (!isRequiredMappingComplete()) {
      toast.error('Please map all required fields')
      return
    }

    setImporting(true)
    setStep('importing')

    try {
      const mappedData = data.map(row => {
        const mapped: Record<string, string | number | boolean | null> = {}
        for (const [field, header] of Object.entries(mapping)) {
          if (header) {
            let value: string | number | boolean | null = row[header]
            
            // Type conversions
            if (['bedrooms', 'max_guests', 'total_reviews'].includes(field)) {
              value = parseInt(value) || 0
            } else if (['bathrooms', 'nightly_rate', 'avg_rating'].includes(field)) {
              value = parseFloat(value) || null
            } else if (field === 'superhost') {
              value = ['true', '1', 'yes', 'y'].includes(value.toLowerCase())
            }
            
            mapped[field] = value
          }
        }
        return mapped
      })

      const response = await fetch('/api/listings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          listings: mappedData,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      setImportResult(result)
      setStep('complete')
      onImportComplete?.()
    } catch (error) {
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setStep('mapping')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-[#0A0A0F] border-[#2A2A3C]">
        <DialogHeader>
          <DialogTitle className="text-[#F0F0F5]">Import Listings</DialogTitle>
          <DialogDescription className="text-[#9494A8]">
            Upload a CSV or JSON file with your listings data
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-4">
          {(['upload', 'mapping', 'preview', 'complete'] as const).map((s, i) => {
            const stepStr = step as string
            const isActive = step === s || (step === 'importing' && s === 'preview')
            const isCompleted = stepStr === 'complete' || 
              (['upload', 'mapping'].includes(s) && ['mapping', 'preview', 'importing', 'complete'].includes(stepStr)) ||
              (s === 'preview' && stepStr === 'complete')
            
            return (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    isActive
                      ? 'bg-[#6366F1] text-white'
                      : isCompleted
                      ? 'bg-[#22C55E] text-white'
                      : 'bg-[#2A2A3C] text-[#5C5C72]'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 3 && (
                  <ChevronRight className="h-4 w-4 mx-2 text-[#5C5C72]" />
                )}
              </div>
            )
          })}
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-[#2A2A3C] rounded-lg p-8 text-center hover:border-[#6366F1] transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-[#5C5C72] mb-4" />
              <p className="text-[#F0F0F5] font-medium mb-1">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-[#9494A8]">
                Supports CSV and JSON files
              </p>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <div className="bg-[#1A1A26] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[#F0F0F5] mb-2">Required columns:</h4>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_FIELDS.map(field => (
                  <Badge key={field} variant="secondary" className="bg-[#6366F1]/10 text-[#6366F1]">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-[#9494A8]" />
              <span className="text-[#F0F0F5] font-medium">{file?.name}</span>
              <Badge variant="secondary" className="bg-[#2A2A3C] text-[#9494A8]">
                {data.length} rows
              </Badge>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-3">
              {/* Required Fields */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[#F0F0F5]">Required Fields</h4>
                {REQUIRED_FIELDS.map(field => (
                  <div key={field} className="flex items-center gap-3">
                    <Label className="w-32 text-[#9494A8] capitalize">
                      {field.replace(/_/g, ' ')}
                    </Label>
                    <Select
                      value={mapping[field] || ''}
                      onValueChange={v => setMapping(prev => ({ ...prev, [field]: v }))}
                    >
                      <SelectTrigger className="flex-1 bg-[#1A1A26] border-[#2A2A3C]">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping[field] ? (
                      <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-[#EF4444] shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Optional Fields */}
              <div className="space-y-2 pt-4 border-t border-[#2A2A3C]">
                <h4 className="text-sm font-medium text-[#F0F0F5]">Optional Fields</h4>
                {OPTIONAL_FIELDS.map(field => (
                  <div key={field} className="flex items-center gap-3">
                    <Label className="w-32 text-[#9494A8] capitalize">
                      {field.replace(/_/g, ' ')}
                    </Label>
                    <Select
                      value={mapping[field] || ''}
                      onValueChange={v => setMapping(prev => ({ ...prev, [field]: v || undefined }))}
                    >
                      <SelectTrigger className="flex-1 bg-[#1A1A26] border-[#2A2A3C]">
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Skip —</SelectItem>
                        {headers.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping[field] && (
                      <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={resetState}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={!isRequiredMappingComplete()}
                className="bg-[#6366F1] hover:bg-[#818CF8]"
              >
                Import {data.length} Listings
              </Button>
            </div>
          </div>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <div className="py-12 text-center">
            <Loader2 className="h-10 w-10 mx-auto text-[#6366F1] animate-spin mb-4" />
            <p className="text-[#F0F0F5] font-medium">Importing listings...</p>
            <p className="text-sm text-[#9494A8] mt-1">
              Checking for duplicates and validating data
            </p>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && importResult && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 mx-auto text-[#22C55E] mb-4" />
              <h3 className="text-lg font-medium text-[#F0F0F5]">Import Complete</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#22C55E]/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-[#22C55E]">{importResult.imported}</p>
                <p className="text-sm text-[#9494A8]">Imported</p>
              </div>
              <div className="bg-[#F59E0B]/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-[#F59E0B]">{importResult.skipped}</p>
                <p className="text-sm text-[#9494A8]">Skipped (duplicates)</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-[#EF4444]/10 rounded-lg p-4">
                <h4 className="text-sm font-medium text-[#EF4444] mb-2">Errors:</h4>
                <ul className="text-sm text-[#F0F0F5] space-y-1">
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li className="text-[#9494A8]">
                      ... and {importResult.errors.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={handleClose} className="bg-[#6366F1] hover:bg-[#818CF8]">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
