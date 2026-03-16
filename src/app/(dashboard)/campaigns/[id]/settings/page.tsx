'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings, 
  MapPin, 
  Home, 
  BarChart3, 
  User, 
  Scale,
  Link2,
  Save,
  Trash2,
  Plus,
  X
} from 'lucide-react'
import { updateCampaign, deleteCampaign } from '@/lib/actions/campaigns'
import { 
  CampaignCriteria, 
  DEFAULT_CRITERIA,
  PROPERTY_TYPES,
  AMENITIES,
} from '@/lib/types/criteria'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Database } from '@/types/database'

type CampaignDbRow = Database['public']['Tables']['campaigns']['Row']

export default function CampaignSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [campaign, setCampaign] = useState<{
    id: string
    name: string
    description: string | null
    status: string
    criteria: CampaignCriteria
    google_sheet_id: string | null
    sheets_sync_enabled: boolean
  } | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'draft' | 'active' | 'paused' | 'completed' | 'archived'>('active')
  const [criteria, setCriteria] = useState<CampaignCriteria>(DEFAULT_CRITERIA)
  const [googleSheetId, setGoogleSheetId] = useState('')
  const [sheetsSyncEnabled, setSheetsSyncEnabled] = useState(false)

  // Input states for adding items
  const [marketInput, setMarketInput] = useState('')
  const [neighborhoodInput, setNeighborhoodInput] = useState('')

  useEffect(() => {
    async function loadCampaign() {
      const supabase = createClient()
      const { data: rawData, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !rawData) {
        toast.error('Campaign not found')
        router.push('/campaigns')
        return
      }

      const data = rawData as unknown as CampaignDbRow
      setCampaign({
        id: data.id,
        name: data.name,
        description: data.description,
        status: data.status,
        criteria: data.criteria as unknown as CampaignCriteria,
        google_sheet_id: data.google_sheet_id,
        sheets_sync_enabled: data.sheets_sync_enabled,
      })
      setName(data.name)
      setDescription(data.description || '')
      setStatus(data.status)
      setCriteria(data.criteria as unknown as CampaignCriteria || DEFAULT_CRITERIA)
      setGoogleSheetId(data.google_sheet_id || '')
      setSheetsSyncEnabled(data.sheets_sync_enabled || false)
      setLoading(false)
    }

    loadCampaign()
  }, [id, router])

  const updateCriteriaField = <K extends keyof CampaignCriteria>(
    key: K,
    value: CampaignCriteria[K]
  ) => {
    setCriteria(prev => ({ ...prev, [key]: value }))
  }

  const addToList = (
    category: 'location',
    field: 'target_markets' | 'neighborhoods' | 'exclude_areas',
    value: string,
    setter: (v: string) => void
  ) => {
    if (!value.trim()) return
    const current = criteria[category][field]
    if (!current.includes(value.trim())) {
      updateCriteriaField(category, {
        ...criteria[category],
        [field]: [...current, value.trim()],
      })
    }
    setter('')
  }

  const removeFromList = (
    category: 'location',
    field: 'target_markets' | 'neighborhoods' | 'exclude_areas',
    value: string
  ) => {
    const current = criteria[category][field]
    updateCriteriaField(category, {
      ...criteria[category],
      [field]: current.filter(v => v !== value),
    })
  }

  const toggleAmenity = (
    field: 'required_amenities' | 'preferred_amenities',
    value: string
  ) => {
    const current = criteria.property[field]
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    updateCriteriaField('property', {
      ...criteria.property,
      [field]: updated,
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateCampaign({
        id,
        name,
        description: description || undefined,
        status,
        criteria,
        google_sheet_id: googleSheetId || null,
        sheets_sync_enabled: sheetsSyncEnabled,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Campaign updated')
      }
    } catch (error) {
      toast.error('Failed to update campaign')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return
    }

    try {
      const result = await deleteCampaign(id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Campaign deleted')
        router.push('/campaigns')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete campaign')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#c4c5d6]">Loading...</div>
      </div>
    )
  }

  const weights = criteria.scoring_weights
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen">
      <Header
        title={`${name} — Settings`}
        description="Configure campaign criteria and integrations"
      />

      <div className="p-6 space-y-6">
        {/* Back link */}
        <Link
          href={`/campaigns/${id}`}
          className="text-sm text-[#6366F1] hover:text-[#818CF8]"
        >
          ← Back to campaign
        </Link>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-[#1c1d2b] border border-[#363a4f]">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="property">Property</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="host">Host</TabsTrigger>
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card className="bg-[#13141c] border-[#363a4f]">
              <CardHeader>
                <CardTitle className="text-[#f0f0f6] flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger className="bg-[#1c1d2b] border-[#363a4f]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location">
            <Card className="bg-[#13141c] border-[#363a4f]">
              <CardHeader>
                <CardTitle className="text-[#f0f0f6] flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Criteria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Target Markets</Label>
                  <div className="flex gap-2">
                    <Input
                      value={marketInput}
                      onChange={e => setMarketInput(e.target.value)}
                      placeholder="e.g., Austin, TX"
                      className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addToList('location', 'target_markets', marketInput, setMarketInput)
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addToList('location', 'target_markets', marketInput, setMarketInput)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {criteria.location.target_markets.map(market => (
                      <Badge key={market} variant="secondary" className="bg-[#6366F1]/10 text-[#6366F1]">
                        {market}
                        <button
                          type="button"
                          onClick={() => removeFromList('location', 'target_markets', market)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Neighborhoods</Label>
                  <div className="flex gap-2">
                    <Input
                      value={neighborhoodInput}
                      onChange={e => setNeighborhoodInput(e.target.value)}
                      placeholder="e.g., Downtown"
                      className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addToList('location', 'neighborhoods', neighborhoodInput, setNeighborhoodInput)
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addToList('location', 'neighborhoods', neighborhoodInput, setNeighborhoodInput)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {criteria.location.neighborhoods.map(n => (
                      <Badge key={n} variant="secondary" className="bg-[#22C55E]/10 text-[#22C55E]">
                        {n}
                        <button
                          type="button"
                          onClick={() => removeFromList('location', 'neighborhoods', n)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Search Radius (miles)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[criteria.location.radius_miles]}
                      onValueChange={(vals) => updateCriteriaField('location', { ...criteria.location, radius_miles: Array.isArray(vals) ? vals[0] : vals })}
                      min={1}
                      max={50}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono text-[#f0f0f6] w-12">
                      {criteria.location.radius_miles} mi
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Property Tab */}
          <TabsContent value="property">
            <Card className="bg-[#13141c] border-[#363a4f]">
              <CardHeader>
                <CardTitle className="text-[#f0f0f6] flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Property Criteria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Property Types</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {PROPERTY_TYPES.map(type => (
                      <label
                        key={type.value}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          criteria.property.types.includes(type.value)
                            ? 'border-[#6366F1] bg-[#6366F1]/10'
                            : 'border-[#363a4f] bg-[#1c1d2b] hover:border-[#4a4d65]'
                        }`}
                      >
                        <Checkbox
                          checked={criteria.property.types.includes(type.value)}
                          onCheckedChange={checked => {
                            const current = criteria.property.types
                            const updated = checked
                              ? [...current, type.value]
                              : current.filter(v => v !== type.value)
                            updateCriteriaField('property', { ...criteria.property, types: updated })
                          }}
                        />
                        <span className="text-sm text-[#f0f0f6]">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Min Bedrooms</Label>
                    <Select
                      value={String(criteria.property.min_bedrooms)}
                      onValueChange={v => updateCriteriaField('property', { ...criteria.property, min_bedrooms: parseInt(v || "0") })}
                    >
                      <SelectTrigger className="bg-[#1c1d2b] border-[#363a4f]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}+</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Min Bathrooms</Label>
                    <Select
                      value={String(criteria.property.min_bathrooms)}
                      onValueChange={v => updateCriteriaField('property', { ...criteria.property, min_bathrooms: parseFloat(v || "0") })}
                    >
                      <SelectTrigger className="bg-[#1c1d2b] border-[#363a4f]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}+</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Min Guests</Label>
                    <Select
                      value={String(criteria.property.min_guests)}
                      onValueChange={v => updateCriteriaField('property', { ...criteria.property, min_guests: parseInt(v || "0") })}
                    >
                      <SelectTrigger className="bg-[#1c1d2b] border-[#363a4f]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 4, 6, 8, 10, 12, 16].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}+</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Required Amenities</Label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {AMENITIES.map(amenity => (
                      <label
                        key={amenity.value}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          criteria.property.required_amenities.includes(amenity.value)
                            ? 'border-[#6366F1] bg-[#6366F1]/10'
                            : 'border-[#363a4f] bg-[#1c1d2b] hover:border-[#4a4d65]'
                        }`}
                      >
                        <Checkbox
                          checked={criteria.property.required_amenities.includes(amenity.value)}
                          onCheckedChange={() => toggleAmenity('required_amenities', amenity.value)}
                        />
                        <span className="text-xs text-[#f0f0f6]">{amenity.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <Card className="bg-[#13141c] border-[#363a4f]">
              <CardHeader>
                <CardTitle className="text-[#f0f0f6] flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Criteria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Maximum Reviews</Label>
                    <p className="text-xs text-[#c4c5d6]">Target hosts still gaining traction (sweet spot: under 80)</p>
                    <Input
                      type="number"
                      value={criteria.performance.min_reviews}
                      onChange={e => updateCriteriaField('performance', { ...criteria.performance, min_reviews: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 80"
                      className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Rating</Label>
                    <p className="text-xs text-[#c4c5d6]">Hosts below 4.8 have room to improve</p>
                    <Select
                      value={String(criteria.performance.min_rating)}
                      onValueChange={v => updateCriteriaField('performance', { ...criteria.performance, min_rating: parseFloat(v || "0") })}
                    >
                      <SelectTrigger className="bg-[#1c1d2b] border-[#363a4f]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[4.9, 4.8, 4.7, 4.5, 4.2, 4.0, 3.5, 3.0].map(n => (
                          <SelectItem key={n} value={String(n)}>Under {n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nightly Rate Range ($)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      value={criteria.performance.nightly_rate_min}
                      onChange={e => updateCriteriaField('performance', { ...criteria.performance, nightly_rate_min: parseInt(e.target.value) || 0 })}
                      placeholder="Min"
                      className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
                    />
                    <Input
                      type="number"
                      value={criteria.performance.nightly_rate_max}
                      onChange={e => updateCriteriaField('performance', { ...criteria.performance, nightly_rate_max: parseInt(e.target.value) || 0 })}
                      placeholder="Max"
                      className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Host Tab */}
          <TabsContent value="host">
            <Card className="bg-[#13141c] border-[#363a4f]">
              <CardHeader>
                <CardTitle className="text-[#f0f0f6] flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Host Criteria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Host Type Preference</Label>
                  <Select
                    value={criteria.host.preferred_type}
                    onValueChange={v => updateCriteriaField('host', { ...criteria.host, preferred_type: v as 'individual' | 'business' | 'any' })}
                  >
                    <SelectTrigger className="bg-[#1c1d2b] border-[#363a4f]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={criteria.host.superhost_required}
                      onCheckedChange={checked => updateCriteriaField('host', { ...criteria.host, superhost_required: !!checked })}
                    />
                    <span className="text-sm text-[#f0f0f6]">Superhost required</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={criteria.host.superhost_preferred}
                      onCheckedChange={checked => updateCriteriaField('host', { ...criteria.host, superhost_preferred: !!checked })}
                    />
                    <span className="text-sm text-[#f0f0f6]">Superhost preferred (bonus points)</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Listings</Label>
                    <Input
                      type="number"
                      value={criteria.host.min_listings}
                      onChange={e => updateCriteriaField('host', { ...criteria.host, min_listings: parseInt(e.target.value) || 1 })}
                      className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Listings</Label>
                    <Input
                      type="number"
                      value={criteria.host.max_listings}
                      onChange={e => updateCriteriaField('host', { ...criteria.host, max_listings: parseInt(e.target.value) || 50 })}
                      className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scoring Tab */}
          <TabsContent value="scoring">
            <Card className="bg-[#13141c] border-[#363a4f]">
              <CardHeader>
                <CardTitle className="text-[#f0f0f6] flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Scoring Weights
                </CardTitle>
                <CardDescription>
                  Adjust how each category contributes to the overall score
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(weights).map(([key, value]) => {
                  const numValue = typeof value === 'number' ? value : 0
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="capitalize">{key}</Label>
                        <span className="text-sm font-mono text-[#f0f0f6]">{numValue}%</span>
                      </div>
                      <Slider
                        value={[numValue]}
                        onValueChange={(vals) => {
                          updateCriteriaField('scoring_weights', { ...weights, [key]: Array.isArray(vals) ? vals[0] : vals })
                        }}
                        min={0}
                        max={50}
                        step={5}
                      />
                    </div>
                  )
                })}

                <div className={`p-3 rounded-lg ${totalWeight === 100 ? 'bg-[#22C55E]/10' : 'bg-[#F59E0B]/10'}`}>
                  <p className={`text-sm font-medium ${totalWeight === 100 ? 'text-[#22C55E]' : 'text-[#F59E0B]'}`}>
                    Total: {totalWeight}% {totalWeight !== 100 && '(should be 100%)'}
                  </p>
                </div>

                <div className="border-t border-[#363a4f] pt-6 space-y-4">
                  <h4 className="font-medium text-[#f0f0f6]">Tier Thresholds</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Strong Lead Minimum</Label>
                      <Input
                        type="number"
                        value={criteria.tier_thresholds.strong_min}
                        onChange={e => updateCriteriaField('tier_thresholds', { ...criteria.tier_thresholds, strong_min: parseInt(e.target.value) || 70 })}
                        className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weak Lead Maximum</Label>
                      <Input
                        type="number"
                        value={criteria.tier_thresholds.weak_max}
                        onChange={e => updateCriteriaField('tier_thresholds', { ...criteria.tier_thresholds, weak_max: parseInt(e.target.value) || 39 })}
                        className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <Card className="bg-[#13141c] border-[#363a4f]">
              <CardHeader>
                <CardTitle className="text-[#f0f0f6] flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Integrations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-[#f0f0f6]">Google Sheets</h4>
                  <div className="space-y-2">
                    <Label>Sheet ID</Label>
                    <Input
                      value={googleSheetId}
                      onChange={e => setGoogleSheetId(e.target.value)}
                      placeholder="Enter Google Sheet ID"
                      className="bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6]"
                    />
                    <p className="text-xs text-[#c4c5d6]">
                      Find the Sheet ID in the URL: docs.google.com/spreadsheets/d/<strong>[SHEET_ID]</strong>/edit
                    </p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={sheetsSyncEnabled}
                      onCheckedChange={checked => setSheetsSyncEnabled(!!checked)}
                    />
                    <span className="text-sm text-[#f0f0f6]">Enable automatic sync</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save / Delete Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-[#363a4f]">
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Campaign
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#6366F1] hover:bg-[#818CF8]"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
