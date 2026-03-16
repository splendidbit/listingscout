'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Key
} from 'lucide-react'
import { toast } from 'sonner'

export default function IntegrationsSettingsPage() {
  const [googleSheetId, setGoogleSheetId] = useState('')
  const [isTestingSheets, setIsTestingSheets] = useState(false)
  const [sheetsStatus, setSheetsStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')

  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')

  const handleTestSheetsConnection = async () => {
    if (!googleSheetId.trim()) {
      toast.error('Please enter a Google Sheet ID')
      return
    }

    setIsTestingSheets(true)
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // In production, this would actually test the connection
    setSheetsStatus('connected')
    toast.success('Google Sheets connection successful')
    setIsTestingSheets(false)
  }

  const handleSaveApiKeys = () => {
    // In production, these would be saved securely
    localStorage.setItem('listingscout_openai_key', openaiKey)
    localStorage.setItem('listingscout_anthropic_key', anthropicKey)
    toast.success('API keys saved')
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Integrations"
        description="Connect external services to enhance ListingScout"
      />

      <div className="p-6 space-y-6">
        {/* Google Sheets */}
        <Card className="bg-[#0F1117] border-[#2A2D42]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#22C55E" fillOpacity="0.2"/>
                    <path d="M3 9H21M9 9V21" stroke="#22C55E" strokeWidth="2"/>
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-[#EEEEF4]">Google Sheets</CardTitle>
                  <CardDescription className="text-[#B0B0C0]">
                    Sync listings bidirectionally with Google Sheets
                  </CardDescription>
                </div>
              </div>
              <Badge 
                className={`border-0 ${
                  sheetsStatus === 'connected' 
                    ? 'bg-[#22C55E]/10 text-[#22C55E]'
                    : sheetsStatus === 'error'
                    ? 'bg-[#EF4444]/10 text-[#EF4444]'
                    : 'bg-[#7A7A90]/10 text-[#B0B0C0]'
                }`}
              >
                {sheetsStatus === 'connected' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {sheetsStatus === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                {sheetsStatus === 'connected' ? 'Connected' : sheetsStatus === 'error' ? 'Error' : 'Not Connected'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Google Sheet ID</Label>
              <div className="flex gap-2">
                <Input
                  value={googleSheetId}
                  onChange={e => setGoogleSheetId(e.target.value)}
                  placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="bg-[#161822] border-[#2A2D42] text-[#EEEEF4]"
                />
                <Button
                  variant="outline"
                  onClick={handleTestSheetsConnection}
                  disabled={isTestingSheets}
                >
                  {isTestingSheets ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </Button>
              </div>
              <p className="text-xs text-[#B0B0C0]">
                Find the ID in the spreadsheet URL between /d/ and /edit
              </p>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <a
                href="https://docs.google.com/spreadsheets"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#6366F1] hover:text-[#818CF8] flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Open Google Sheets
              </a>
              <span className="text-[#7A7A90]">•</span>
              <span className="text-xs text-[#B0B0C0]">
                Requires Google account authorization
              </span>
            </div>
          </CardContent>
        </Card>

        {/* AI API Keys */}
        <Card className="bg-[#0F1117] border-[#2A2D42]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-[#6366F1]" />
              </div>
              <div>
                <CardTitle className="text-[#EEEEF4]">AI Integration</CardTitle>
                <CardDescription className="text-[#B0B0C0]">
                  API keys for AI-powered listing research
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>OpenAI API Key</Label>
              <Input
                type="password"
                value={openaiKey}
                onChange={e => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="bg-[#161822] border-[#2A2D42] text-[#EEEEF4]"
              />
              <p className="text-xs text-[#B0B0C0]">
                Get your key at{' '}
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6366F1]"
                >
                  platform.openai.com
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Anthropic API Key (optional)</Label>
              <Input
                type="password"
                value={anthropicKey}
                onChange={e => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="bg-[#161822] border-[#2A2D42] text-[#EEEEF4]"
              />
              <p className="text-xs text-[#B0B0C0]">
                Get your key at{' '}
                <a 
                  href="https://console.anthropic.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6366F1]"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>

            <Button onClick={handleSaveApiKeys} className="bg-[#6366F1] hover:bg-[#818CF8]">
              Save API Keys
            </Button>

            <p className="text-xs text-[#B0B0C0] bg-[#161822] p-3 rounded-lg">
              ⚠️ API keys are stored locally in your browser. For production use, 
              configure keys in environment variables.
            </p>
          </CardContent>
        </Card>

        {/* Future Integrations */}
        <Card className="bg-[#0F1117] border-[#2A2D42] opacity-60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#7A7A90]/10 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-[#7A7A90]" />
              </div>
              <div>
                <CardTitle className="text-[#B0B0C0]">More Integrations Coming Soon</CardTitle>
                <CardDescription className="text-[#7A7A90]">
                  CRM, email automation, and more
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-[#2A2D42] text-[#7A7A90]">Salesforce</Badge>
              <Badge variant="secondary" className="bg-[#2A2D42] text-[#7A7A90]">HubSpot</Badge>
              <Badge variant="secondary" className="bg-[#2A2D42] text-[#7A7A90]">Mailchimp</Badge>
              <Badge variant="secondary" className="bg-[#2A2D42] text-[#7A7A90]">Zapier</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
