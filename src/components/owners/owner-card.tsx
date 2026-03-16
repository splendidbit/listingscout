'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Mail, 
  Phone, 
  Linkedin, 
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  CheckCircle
} from 'lucide-react'
import { useState } from 'react'

export interface OwnerData {
  id: string
  name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  company_name: string | null
  verification_level: 'verified' | 'probable' | 'unverified'
  verification_sources: string[]
  property_count: number
  notes: string | null
}

interface OwnerCardProps {
  owner: OwnerData
  compact?: boolean
}

export function OwnerCard({ owner, compact = false }: OwnerCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getVerificationBadge = () => {
    switch (owner.verification_level) {
      case 'verified':
        return (
          <Badge className="bg-[#22C55E]/10 text-[#22C55E] border-0">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        )
      case 'probable':
        return (
          <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border-0">
            <AlertCircle className="h-3 w-3 mr-1" />
            Probable
          </Badge>
        )
      default:
        return (
          <Badge className="bg-[#7A7A90]/10 text-[#B0B0C0] border-0">
            Unverified
          </Badge>
        )
    }
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-[#161822] rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#6366F1]/10 flex items-center justify-center">
            <User className="h-5 w-5 text-[#6366F1]" />
          </div>
          <div>
            <p className="font-medium text-[#EEEEF4]">{owner.name}</p>
            <div className="flex items-center gap-2 text-xs text-[#B0B0C0]">
              {owner.email && <Mail className="h-3 w-3" />}
              {owner.phone && <Phone className="h-3 w-3" />}
              {owner.linkedin_url && <Linkedin className="h-3 w-3" />}
              <span>{owner.property_count} properties</span>
            </div>
          </div>
        </div>
        {getVerificationBadge()}
      </div>
    )
  }

  return (
    <Card className="bg-[#0F1117] border-[#2A2D42]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#6366F1]/10 flex items-center justify-center">
              <User className="h-6 w-6 text-[#6366F1]" />
            </div>
            <div>
              <CardTitle className="text-lg text-[#EEEEF4]">{owner.name}</CardTitle>
              {owner.company_name && (
                <div className="flex items-center gap-1 text-sm text-[#B0B0C0]">
                  <Building2 className="h-3 w-3" />
                  {owner.company_name}
                </div>
              )}
            </div>
          </div>
          {getVerificationBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Methods */}
        <div className="space-y-2">
          {owner.email && (
            <div className="flex items-center justify-between p-2 bg-[#161822] rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#B0B0C0]" />
                <span className="text-sm text-[#EEEEF4]">{owner.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => copyToClipboard(owner.email!, 'email')}
              >
                {copiedField === 'email' ? (
                  <CheckCircle className="h-3 w-3 text-[#22C55E]" />
                ) : (
                  <Copy className="h-3 w-3 text-[#7A7A90]" />
                )}
              </Button>
            </div>
          )}

          {owner.phone && (
            <div className="flex items-center justify-between p-2 bg-[#161822] rounded-lg">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#B0B0C0]" />
                <span className="text-sm text-[#EEEEF4]">{owner.phone}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => copyToClipboard(owner.phone!, 'phone')}
              >
                {copiedField === 'phone' ? (
                  <CheckCircle className="h-3 w-3 text-[#22C55E]" />
                ) : (
                  <Copy className="h-3 w-3 text-[#7A7A90]" />
                )}
              </Button>
            </div>
          )}

          {owner.linkedin_url && (
            <div className="flex items-center justify-between p-2 bg-[#161822] rounded-lg">
              <div className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                <span className="text-sm text-[#EEEEF4]">LinkedIn Profile</span>
              </div>
              <a
                href={owner.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-[#7A7A90] hover:text-[#6366F1] transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>

        {/* Verification Sources */}
        {owner.verification_sources.length > 0 && (
          <div>
            <p className="text-xs text-[#B0B0C0] mb-2">Verified via:</p>
            <div className="flex flex-wrap gap-1">
              {owner.verification_sources.map((source) => (
                <Badge 
                  key={source} 
                  variant="secondary" 
                  className="text-xs bg-[#2A2D42] text-[#B0B0C0]"
                >
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-[#2A2D42]">
          <span className="text-sm text-[#B0B0C0]">Properties</span>
          <span className="text-sm font-medium text-[#EEEEF4]">{owner.property_count}</span>
        </div>

        {/* Notes */}
        {owner.notes && (
          <div className="pt-2 border-t border-[#2A2D42]">
            <p className="text-xs text-[#B0B0C0]">{owner.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
