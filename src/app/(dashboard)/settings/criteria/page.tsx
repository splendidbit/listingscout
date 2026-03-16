'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Save, 
  Plus, 
  Trash2,
  FileDown,
  FileUp,
  Copy
} from 'lucide-react'
import { toast } from 'sonner'
import { CampaignCriteria, DEFAULT_CRITERIA } from '@/lib/types/criteria'

interface CriteriaTemplate {
  id: string
  name: string
  description: string
  criteria: CampaignCriteria
  createdAt: string
}

export default function CriteriaSettingsPage() {
  const [templates, setTemplates] = useState<CriteriaTemplate[]>([])
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDesc, setNewTemplateDesc] = useState('')

  // Load templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('listingscout_criteria_templates')
    if (saved) {
      try {
        setTemplates(JSON.parse(saved))
      } catch {
        console.error('Failed to parse saved templates')
      }
    }
  }, [])

  // Save templates to localStorage
  const saveTemplates = (newTemplates: CriteriaTemplate[]) => {
    setTemplates(newTemplates)
    localStorage.setItem('listingscout_criteria_templates', JSON.stringify(newTemplates))
  }

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name')
      return
    }

    const newTemplate: CriteriaTemplate = {
      id: crypto.randomUUID(),
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim(),
      criteria: DEFAULT_CRITERIA,
      createdAt: new Date().toISOString(),
    }

    saveTemplates([...templates, newTemplate])
    setNewTemplateName('')
    setNewTemplateDesc('')
    toast.success('Template created')
  }

  const handleDeleteTemplate = (id: string) => {
    saveTemplates(templates.filter(t => t.id !== id))
    toast.success('Template deleted')
  }

  const handleExportTemplate = (template: CriteriaTemplate) => {
    const json = JSON.stringify(template, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_criteria.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportTemplate = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const imported = JSON.parse(text)
        
        // Validate it has the expected structure
        if (!imported.name || !imported.criteria) {
          throw new Error('Invalid template format')
        }

        const newTemplate: CriteriaTemplate = {
          id: crypto.randomUUID(),
          name: imported.name,
          description: imported.description || '',
          criteria: imported.criteria,
          createdAt: new Date().toISOString(),
        }

        saveTemplates([...templates, newTemplate])
        toast.success('Template imported')
      } catch {
        toast.error('Failed to import template')
      }
    }
    input.click()
  }

  const handleCopyToClipboard = async (template: CriteriaTemplate) => {
    await navigator.clipboard.writeText(JSON.stringify(template.criteria, null, 2))
    toast.success('Criteria copied to clipboard')
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Criteria Templates"
        description="Save and reuse search criteria across campaigns"
      />

      <div className="p-6 space-y-6">
        {/* Create New Template */}
        <Card className="bg-[#0F1117] border-[#2A2D42]">
          <CardHeader>
            <CardTitle className="text-[#EEEEF4]">Create New Template</CardTitle>
            <CardDescription className="text-[#B0B0C0]">
              Save current default criteria as a reusable template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Austin STR Criteria"
                  className="bg-[#161822] border-[#2A2D42] text-[#EEEEF4]"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={newTemplateDesc}
                  onChange={e => setNewTemplateDesc(e.target.value)}
                  placeholder="e.g., For 3BR+ homes in Downtown"
                  className="bg-[#161822] border-[#2A2D42] text-[#EEEEF4]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateTemplate} className="bg-[#6366F1] hover:bg-[#818CF8]">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
              <Button variant="outline" onClick={handleImportTemplate}>
                <FileUp className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Saved Templates */}
        <Card className="bg-[#0F1117] border-[#2A2D42]">
          <CardHeader>
            <CardTitle className="text-[#EEEEF4]">Saved Templates</CardTitle>
            <CardDescription className="text-[#B0B0C0]">
              {templates.length} template{templates.length !== 1 ? 's' : ''} saved
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-[#B0B0C0]">
                <Save className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No templates saved yet</p>
                <p className="text-sm mt-1">Create your first template above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 bg-[#161822] rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-[#EEEEF4]">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-[#B0B0C0]">{template.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs bg-[#2A2D42] text-[#B0B0C0]">
                          {template.criteria.location.target_markets.length} markets
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-[#2A2D42] text-[#B0B0C0]">
                          {template.criteria.property.min_bedrooms}+ beds
                        </Badge>
                        <span className="text-xs text-[#7A7A90]">
                          Created {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToClipboard(template)}
                        className="text-[#B0B0C0]"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportTemplate(template)}
                        className="text-[#B0B0C0]"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-[#EF4444] hover:text-[#EF4444]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
