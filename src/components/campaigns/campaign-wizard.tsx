'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ChevronLeft, 
  ChevronRight, 
  Check,
  MapPin,
  Home,
  BarChart3,
  User,
  Scale,
  FileText,
  X,
  Plus
} from 'lucide-react'
import { createCampaign } from '@/lib/actions/campaigns'
import { 
  CampaignCriteria, 
  DEFAULT_CRITERIA,
  PROPERTY_TYPES,
  AMENITIES,
} from '@/lib/types/criteria'
import { toast } from 'sonner'

const STEPS = [
  { id: 'basics', title: 'Basics', icon: FileText, description: 'Name your campaign' },
  { id: 'location', title: 'Location', icon: MapPin, description: 'Target markets' },
  { id: 'property', title: 'Property', icon: Home, description: 'Property criteria' },
  { id: 'performance', title: 'Performance', icon: BarChart3, description: 'Performance metrics' },
  { id: 'host', title: 'Host', icon: User, description: 'Host preferences' },
  { id: 'scoring', title: 'Scoring', icon: Scale, description: 'Weight categories' },
  { id: 'review', title: 'Review', icon: Check, description: 'Final review' },
]

interface WizardState {
  name: string
  description: string
  criteria: CampaignCriteria
}

export function CampaignWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [state, setState] = useState<WizardState>({
    name: '',
    description: '',
    criteria: DEFAULT_CRITERIA,
  })
  const [marketInput, setMarketInput] = useState('')
  const [neighborhoodInput, setNeighborhoodInput] = useState('')
  const [excludeInput, setExcludeInput] = useState('')

  const updateCriteria = <K extends keyof CampaignCriteria>(
    key: K,
    value: CampaignCriteria[K]
  ) => {
    setState(prev => ({
      ...prev,
      criteria: { ...prev.criteria, [key]: value },
    }))
  }

  const addToList = (
    category: 'location',
    field: 'target_markets' | 'neighborhoods' | 'exclude_areas',
    value: string,
    setter: (v: string) => void
  ) => {
    if (!value.trim()) return
    const current = state.criteria[category][field]
    if (!current.includes(value.trim())) {
      updateCriteria(category, {
        ...state.criteria[category],
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
    const current = state.criteria[category][field]
    updateCriteria(category, {
      ...state.criteria[category],
      [field]: current.filter(v => v !== value),
    })
  }

  const toggleAmenity = (
    field: 'required_amenities' | 'preferred_amenities',
    value: string
  ) => {
    const current = state.criteria.property[field]
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    updateCriteria('property', {
      ...state.criteria.property,
      [field]: updated,
    })
  }

  const handleNext = () => {
    if (currentStep === 0 && !state.name.trim()) {
      toast.error('Please enter a campaign name')
      return
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!state.name.trim()) {
      toast.error('Please enter a campaign name')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createCampaign({
        name: state.name,
        description: state.description || undefined,
        criteria: state.criteria,
      })

      if (result?.error) {
        toast.error(result.error)
      } else if (result?.campaignId) {
        toast.success('Campaign created!')
        router.push(`/campaigns/${result.campaignId}`)
        return
      }
    } catch (error) {
      console.error('Campaign creation error:', error)
      toast.error('Failed to create campaign. Check console for details.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderBasicsStep = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Campaign Name *</Label>
        <Input
          id="name"
          value={state.name}
          onChange={e => setState(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Austin STR Acquisitions Q1"
          className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={state.description}
          onChange={e => setState(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe your campaign objectives..."
          rows={3}
          className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
        />
      </div>
    </div>
  )

  const renderLocationStep = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Target Markets</Label>
        <div className="flex gap-2">
          <Input
            value={marketInput}
            onChange={e => setMarketInput(e.target.value)}
            placeholder="e.g., Austin, TX"
            className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
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
          {state.criteria.location.target_markets.map(market => (
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
        <Label>Neighborhoods (optional)</Label>
        <div className="flex gap-2">
          <Input
            value={neighborhoodInput}
            onChange={e => setNeighborhoodInput(e.target.value)}
            placeholder="e.g., Downtown, East Austin"
            className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
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
          {state.criteria.location.neighborhoods.map(n => (
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
        <Label>Exclude Areas (optional)</Label>
        <div className="flex gap-2">
          <Input
            value={excludeInput}
            onChange={e => setExcludeInput(e.target.value)}
            placeholder="e.g., Rural areas"
            className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addToList('location', 'exclude_areas', excludeInput, setExcludeInput)
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => addToList('location', 'exclude_areas', excludeInput, setExcludeInput)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {state.criteria.location.exclude_areas.map(area => (
            <Badge key={area} variant="secondary" className="bg-[#EF4444]/10 text-[#EF4444]">
              {area}
              <button
                type="button"
                onClick={() => removeFromList('location', 'exclude_areas', area)}
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
            value={[state.criteria.location.radius_miles]}
            onValueChange={(vals) => { const v = Array.isArray(vals) ? vals[0] : vals; updateCriteria('location', { ...state.criteria.location, radius_miles: v }); }}
            min={1}
            max={50}
            step={1}
            className="flex-1"
          />
          <span className="text-sm font-mono text-[#F0F0F5] w-12">
            {state.criteria.location.radius_miles} mi
          </span>
        </div>
      </div>
    </div>
  )

  const renderPropertyStep = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Property Types</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PROPERTY_TYPES.map(type => (
            <label
              key={type.value}
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                state.criteria.property.types.includes(type.value)
                  ? 'border-[#6366F1] bg-[#6366F1]/10'
                  : 'border-[#2A2A3C] bg-[#1A1A26] hover:border-[#3A3A52]'
              }`}
            >
              <Checkbox
                checked={state.criteria.property.types.includes(type.value)}
                onCheckedChange={checked => {
                  const current = state.criteria.property.types
                  const updated = checked
                    ? [...current, type.value]
                    : current.filter(v => v !== type.value)
                  updateCriteria('property', { ...state.criteria.property, types: updated })
                }}
              />
              <span className="text-sm text-[#F0F0F5]">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Min Bedrooms</Label>
          <Select
            value={String(state.criteria.property.min_bedrooms)}
            onValueChange={v => updateCriteria('property', { ...state.criteria.property, min_bedrooms: parseInt(v || "0") })}
          >
            <SelectTrigger className="bg-[#1A1A26] border-[#2A2A3C]">
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
            value={String(state.criteria.property.min_bathrooms)}
            onValueChange={v => updateCriteria('property', { ...state.criteria.property, min_bathrooms: parseFloat(v || "0") })}
          >
            <SelectTrigger className="bg-[#1A1A26] border-[#2A2A3C]">
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
            value={String(state.criteria.property.min_guests)}
            onValueChange={v => updateCriteria('property', { ...state.criteria.property, min_guests: parseInt(v || "0") })}
          >
            <SelectTrigger className="bg-[#1A1A26] border-[#2A2A3C]">
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
                state.criteria.property.required_amenities.includes(amenity.value)
                  ? 'border-[#6366F1] bg-[#6366F1]/10'
                  : 'border-[#2A2A3C] bg-[#1A1A26] hover:border-[#3A3A52]'
              }`}
            >
              <Checkbox
                checked={state.criteria.property.required_amenities.includes(amenity.value)}
                onCheckedChange={() => toggleAmenity('required_amenities', amenity.value)}
              />
              <span className="text-xs text-[#F0F0F5]">{amenity.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preferred Amenities (bonus points)</Label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {AMENITIES.map(amenity => (
            <label
              key={amenity.value}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                state.criteria.property.preferred_amenities.includes(amenity.value)
                  ? 'border-[#22C55E] bg-[#22C55E]/10'
                  : 'border-[#2A2A3C] bg-[#1A1A26] hover:border-[#3A3A52]'
              }`}
            >
              <Checkbox
                checked={state.criteria.property.preferred_amenities.includes(amenity.value)}
                onCheckedChange={() => toggleAmenity('preferred_amenities', amenity.value)}
              />
              <span className="text-xs text-[#F0F0F5]">{amenity.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderPerformanceStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Maximum Reviews</Label>
          <p className="text-xs text-[#9494A8]">Target hosts still gaining traction (sweet spot: under 80)</p>
          <Input
            type="number"
            value={state.criteria.performance.min_reviews}
            onChange={e => updateCriteria('performance', { ...state.criteria.performance, min_reviews: parseInt(e.target.value) || 0 })}
            placeholder="e.g. 80"
            className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
          />
        </div>
        <div className="space-y-2">
          <Label>Maximum Rating</Label>
          <p className="text-xs text-[#9494A8]">Hosts below 4.8 have room to improve (sweet spot: 4.4–4.8)</p>
          <Select
            value={String(state.criteria.performance.min_rating)}
            onValueChange={v => updateCriteria('performance', { ...state.criteria.performance, min_rating: parseFloat(v || "0") })}
          >
            <SelectTrigger className="bg-[#1A1A26] border-[#2A2A3C]">
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
            value={state.criteria.performance.nightly_rate_min}
            onChange={e => updateCriteria('performance', { ...state.criteria.performance, nightly_rate_min: parseInt(e.target.value) || 0 })}
            placeholder="Min"
            className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
          />
          <Input
            type="number"
            value={state.criteria.performance.nightly_rate_max}
            onChange={e => updateCriteria('performance', { ...state.criteria.performance, nightly_rate_max: parseInt(e.target.value) || 0 })}
            placeholder="Max"
            className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Minimum Occupancy % (optional)</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[state.criteria.performance.min_occupancy_pct]}
            onValueChange={(vals) => { const v = Array.isArray(vals) ? vals[0] : vals; updateCriteria('performance', { ...state.criteria.performance, min_occupancy_pct: v }); }}
            min={0}
            max={100}
            step={5}
            className="flex-1"
          />
          <span className="text-sm font-mono text-[#F0F0F5] w-12">
            {state.criteria.performance.min_occupancy_pct}%
          </span>
        </div>
      </div>
    </div>
  )

  const renderHostStep = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Host Type Preference</Label>
        <Select
          value={state.criteria.host.preferred_type}
          onValueChange={v => updateCriteria('host', { ...state.criteria.host, preferred_type: v as 'individual' | 'business' | 'any' })}
        >
          <SelectTrigger className="bg-[#1A1A26] border-[#2A2A3C]">
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
            checked={state.criteria.host.superhost_required}
            onCheckedChange={checked => updateCriteria('host', { ...state.criteria.host, superhost_required: !!checked })}
          />
          <span className="text-sm text-[#F0F0F5]">Superhost required</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={state.criteria.host.superhost_preferred}
            onCheckedChange={checked => updateCriteria('host', { ...state.criteria.host, superhost_preferred: !!checked })}
          />
          <span className="text-sm text-[#F0F0F5]">Superhost preferred (bonus points)</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Min Listings</Label>
          <Input
            type="number"
            value={state.criteria.host.min_listings}
            onChange={e => updateCriteria('host', { ...state.criteria.host, min_listings: parseInt(e.target.value) || 1 })}
            className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
          />
        </div>
        <div className="space-y-2">
          <Label>Max Listings</Label>
          <Input
            type="number"
            value={state.criteria.host.max_listings}
            onChange={e => updateCriteria('host', { ...state.criteria.host, max_listings: parseInt(e.target.value) || 50 })}
            className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Minimum Years Hosting</Label>
        <Select
          value={String(state.criteria.host.min_years_hosting)}
          onValueChange={v => updateCriteria('host', { ...state.criteria.host, min_years_hosting: parseInt(v || "0") })}
        >
          <SelectTrigger className="bg-[#1A1A26] border-[#2A2A3C]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3, 4, 5].map(n => (
              <SelectItem key={n} value={String(n)}>{n === 0 ? 'Any' : `${n}+ years`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Deal Objective</Label>
        <Select
          value={state.criteria.deal.objective}
          onValueChange={v => updateCriteria('deal', { ...state.criteria.deal, objective: v as 'acquisition' | 'partnership' | 'research' })}
        >
          <SelectTrigger className="bg-[#1A1A26] border-[#2A2A3C]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="research">Research / Monitoring</SelectItem>
            <SelectItem value="acquisition">Acquisition</SelectItem>
            <SelectItem value="partnership">Partnership</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {state.criteria.deal.objective === 'acquisition' && (
        <div className="space-y-2">
          <Label>Budget Range ($)</Label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              value={state.criteria.deal.budget_min}
              onChange={e => updateCriteria('deal', { ...state.criteria.deal, budget_min: parseInt(e.target.value) || 0 })}
              placeholder="Min"
              className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
            />
            <Input
              type="number"
              value={state.criteria.deal.budget_max}
              onChange={e => updateCriteria('deal', { ...state.criteria.deal, budget_max: parseInt(e.target.value) || 0 })}
              placeholder="Max"
              className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
            />
          </div>
        </div>
      )}
    </div>
  )

  const renderScoringStep = () => {
    const weights = state.criteria.scoring_weights
    const total = Object.values(weights).reduce((a, b) => a + b, 0)

    return (
      <div className="space-y-6">
        <p className="text-sm text-[#9494A8]">
          Adjust the weight of each category in the overall score. Weights should total 100%.
        </p>

        {Object.entries(weights).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="capitalize">{key}</Label>
              <span className="text-sm font-mono text-[#F0F0F5]">{value}%</span>
            </div>
            <Slider
              value={[value]}
              onValueChange={(vals) => {
                const v = Array.isArray(vals) ? vals[0] : vals
                updateCriteria('scoring_weights', { ...weights, [key]: v })
              }}
              min={0}
              max={50}
              step={5}
            />
          </div>
        ))}

        <div className={`p-3 rounded-lg ${total === 100 ? 'bg-[#22C55E]/10' : 'bg-[#F59E0B]/10'}`}>
          <p className={`text-sm font-medium ${total === 100 ? 'text-[#22C55E]' : 'text-[#F59E0B]'}`}>
            Total: {total}% {total !== 100 && '(should be 100%)'}
          </p>
        </div>

        <div className="border-t border-[#2A2A3C] pt-6 space-y-4">
          <h4 className="font-medium text-[#F0F0F5]">Tier Thresholds</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Strong Lead Minimum</Label>
              <Input
                type="number"
                value={state.criteria.tier_thresholds.strong_min}
                onChange={e => updateCriteria('tier_thresholds', { ...state.criteria.tier_thresholds, strong_min: parseInt(e.target.value) || 70 })}
                className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
              />
            </div>
            <div className="space-y-2">
              <Label>Weak Lead Maximum</Label>
              <Input
                type="number"
                value={state.criteria.tier_thresholds.weak_max}
                onChange={e => updateCriteria('tier_thresholds', { ...state.criteria.tier_thresholds, weak_max: parseInt(e.target.value) || 39 })}
                className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="bg-[#1A1A26] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#9494A8] mb-1">Campaign Name</h4>
          <p className="text-[#F0F0F5]">{state.name || '—'}</p>
        </div>

        {state.description && (
          <div className="bg-[#1A1A26] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#9494A8] mb-1">Description</h4>
            <p className="text-[#F0F0F5]">{state.description}</p>
          </div>
        )}

        <div className="bg-[#1A1A26] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#9494A8] mb-2">Location</h4>
          <div className="flex flex-wrap gap-2">
            {state.criteria.location.target_markets.length > 0 ? (
              state.criteria.location.target_markets.map(m => (
                <Badge key={m} variant="secondary" className="bg-[#6366F1]/10 text-[#6366F1]">{m}</Badge>
              ))
            ) : (
              <span className="text-[#5C5C72]">No target markets set</span>
            )}
          </div>
        </div>

        <div className="bg-[#1A1A26] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#9494A8] mb-2">Property</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-[#5C5C72]">Types:</span>
              <p className="text-[#F0F0F5]">{state.criteria.property.types.join(', ') || 'Any'}</p>
            </div>
            <div>
              <span className="text-[#5C5C72]">Min Beds:</span>
              <p className="text-[#F0F0F5]">{state.criteria.property.min_bedrooms}+</p>
            </div>
            <div>
              <span className="text-[#5C5C72]">Min Guests:</span>
              <p className="text-[#F0F0F5]">{state.criteria.property.min_guests}+</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A26] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#9494A8] mb-2">Performance</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-[#5C5C72]">Max Reviews:</span>
              <p className="text-[#F0F0F5]">Under {state.criteria.performance.min_reviews || '—'}</p>
            </div>
            <div>
              <span className="text-[#5C5C72]">Max Rating:</span>
              <p className="text-[#F0F0F5]">Under {state.criteria.performance.min_rating || '—'}</p>
            </div>
            <div>
              <span className="text-[#5C5C72]">Rate Range:</span>
              <p className="text-[#F0F0F5]">
                ${state.criteria.performance.nightly_rate_min} - ${state.criteria.performance.nightly_rate_max}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A26] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#9494A8] mb-2">Scoring Weights</h4>
          <div className="flex items-center gap-1">
            {Object.entries(state.criteria.scoring_weights).map(([key, value]) => (
              <div
                key={key}
                className="flex-1 text-center py-2 rounded text-xs"
                style={{
                  backgroundColor: `hsla(${key === 'location' ? 240 : key === 'property' ? 260 : key === 'performance' ? 280 : key === 'host' ? 300 : key === 'contact' ? 320 : 340}, 70%, 50%, 0.2)`,
                }}
              >
                <span className="text-[#F0F0F5] font-medium">{value}%</span>
                <p className="text-[#9494A8] capitalize">{key}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderBasicsStep()
      case 1: return renderLocationStep()
      case 2: return renderPropertyStep()
      case 3: return renderPerformanceStep()
      case 4: return renderHostStep()
      case 5: return renderScoringStep()
      case 6: return renderReviewStep()
      default: return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep

            return (
              <div key={step.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => index <= currentStep && setCurrentStep(index)}
                  className={`flex flex-col items-center ${
                    index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-[#22C55E] text-white'
                        : isActive
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-[#1A1A26] text-[#5C5C72]'
                    }`}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs mt-2 hidden md:block ${
                    isActive ? 'text-[#F0F0F5]' : 'text-[#5C5C72]'
                  }`}>
                    {step.title}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-[#22C55E]' : 'bg-[#2A2A3C]'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="bg-[#12121A] border-[#2A2A3C]">
        <CardHeader>
          <CardTitle className="text-[#F0F0F5]">{STEPS[currentStep].title}</CardTitle>
          <CardDescription className="text-[#9494A8]">
            {STEPS[currentStep].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="text-[#9494A8] hover:text-[#F0F0F5]"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {currentStep === STEPS.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !state.name.trim()}
            className="bg-[#6366F1] hover:bg-[#818CF8] text-white"
          >
            {isSubmitting ? 'Creating...' : 'Create Campaign'}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            className="bg-[#6366F1] hover:bg-[#818CF8] text-white"
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
