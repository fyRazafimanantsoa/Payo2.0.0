'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Palette,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Plus,
  Loader2,
  Sparkles,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePayoStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'

interface Template {
  id: string
  type: string
  name: string
  subjectLine: string
  htmlBody: string
  triggerPoint: string
  tone: string
  isActive: boolean
  readOnly: boolean
}

const TRIGGER_POINT_LABELS: Record<string, string> = {
  pre_due_7: '7 Days Before Due',
  pre_due_3: '3 Days Before Due',
  due_today: 'Due Today',
  overdue_3: '3 Days Overdue',
  overdue_7: '7 Days Overdue',
  overdue_14: '14 Days Overdue',
  overdue_21: '21 Days Overdue',
  overdue_30: '30 Days Overdue',
  final_notice: 'Final Notice',
  consolidated_weekly: 'Weekly Summary',
  pending_confirmation: 'Pending Confirmation',
  payment_confirmed: 'Payment Confirmed',
  write_off_notice: 'Write Off Notice',
}

const TONE_CONFIG: Record<string, { label: string; className: string; emoji: string }> = {
  friendly: { label: 'Friendly', className: 'bg-secondary text-secondary-foreground border-secondary/50', emoji: '😊' },
  neutral: { label: 'Neutral', className: 'bg-muted text-muted-foreground border-border', emoji: '💼' },
  firm: { label: 'Firm', className: 'bg-red-50 text-red-700 border-red-200', emoji: '⚡' },
}

const TEMPLATE_VARIABLES = [
  'client_name', 'freelancer_name', 'invoice_number',
  'amount_due', 'currency', 'due_date', 'days_overdue', 'invoice_list',
]

function getCustomTemplateLimit(planType: string): number {
  if (planType === 'trial') return 0
  if (planType === 'starter') return 5
  return 999999 // pro = unlimited
}

export function TemplateStudio() {
  const { user } = usePayoStore()
  const [systemTemplates, setSystemTemplates] = useState<Template[]>([])
  const [customTemplates, setCustomTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState({
    name: '',
    subjectLine: '',
    htmlBody: '',
    triggerPoint: '',
    tone: 'friendly',
    isSource: false,
  })

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value)
    const editor = document.getElementById('visual-editor')
    if (editor) {
      setEditForm(prev => ({ ...prev, htmlBody: editor.innerHTML }))
    }
  }

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const [sysRes, customRes] = await Promise.all([
        fetch('/api/templates?type=system'),
        fetch('/api/templates?type=user_custom'),
      ])

      if (sysRes.ok) {
        const sysData = await sysRes.json()
        setSystemTemplates(Array.isArray(sysData) ? sysData : [])
      }
      if (customRes.ok) {
        const customData = await customRes.json()
        setCustomTemplates(Array.isArray(customData) ? customData : [])
      }
    } catch {
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const renderPreviewHtml = (template: Template) => {
    let html = template.htmlBody
    if (user) {
      html = html.replace(/\{\{client_name\}\}/g, 'Acme Corporation')
      html = html.replace(/\{\{freelancer_name\}\}/g, user.businessName)
      html = html.replace(/\{\{invoice_number\}\}/g, 'INV-2025-001')
      html = html.replace(/\{\{amount_due\}\}/g, formatCurrency(1250, 'USD'))
      html = html.replace(/\{\{currency\}\}/g, 'USD')
      html = html.replace(/\{\{due_date\}\}/g, 'January 15, 2025')
      html = html.replace(/\{\{days_overdue\}\}/g, '7')
      html = html.replace(
        /\{\{invoice_list\}\}/g,
        `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0;font-size:13px;">Invoice</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e2e8f0;font-size:13px;">Amount</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e2e8f0;font-size:13px;">Due</th>
          </tr></thead>
          <tbody>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;">INV-2025-001</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #f1f5f9;font-size:13px;">$1,250.00</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #f1f5f9;font-size:13px;">Jan 15, 2025</td></tr>
            <tr><td style="padding:8px 12px;font-size:13px;">INV-2025-002</td><td style="padding:8px 12px;text-align:right;font-size:13px;">$750.00</td><td style="padding:8px 12px;text-align:right;font-size:13px;">Jan 20, 2025</td></tr>
          </tbody>
        </table>`
      )
    }
    return html
  }

  const handlePreview = (template: Template) => {
    const rendered = renderPreviewHtml(template)
    setPreviewTemplate({ ...template, htmlBody: rendered })
    setPreviewOpen(true)
  }

  const handleClone = async (template: Template) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/templates/${template.id}/clone`, { method: 'POST' })
      if (res.ok) {
        toast.success('Template cloned')
        fetchTemplates()
      } else {
        const data = await res.json()
        toast.error('Failed to clone template', { description: data.error })
      }
    } catch {
      toast.error('Failed to clone template')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateNew = () => {
    setEditingTemplate(null)
    setEditForm({
      name: '',
      subjectLine: 'Invoice Reminder: {{invoice_number}}',
      htmlBody: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color: #884B3A; padding: 28px 32px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Invoice Reminder</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Dear {{client_name}},</p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">This is a reminder that Invoice #{{invoice_number}} for <strong>{{amount_due}} {{currency}}</strong> is due on <strong>{{due_date}}</strong>.</p>
              {{invoice_list}}
              <p style="margin: 0 0 24px; font-size: 16px; color: #334155; line-height: 1.6;">Please proceed with payment as previously agreed.</p>
              <p style="margin: 0; font-size: 16px; color: #334155; line-height: 1.6;">Thank you,<br/><strong>{{freelancer_name}}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f8f9fa; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">Sent via Payo - Automated Invoice Reminders</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      triggerPoint: 'overdue_3',
      tone: user?.defaultReminderTone || 'friendly',
      isSource: false,
    })
    setEditOpen(true)
  }

  const handleEdit = (template: Template) => {
    if (template.readOnly) {
      toast.info('System templates are read-only. Clone to create an editable copy.')
      return
    }
    setEditingTemplate(template)
    setEditForm({
      name: template.name,
      subjectLine: template.subjectLine,
      htmlBody: template.htmlBody,
      triggerPoint: template.triggerPoint,
      tone: template.tone,
      isSource: false,
    })
    setEditOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!editForm.name || !editForm.htmlBody) {
      toast.error('Missing fields', { description: 'Name and HTML body are required.' })
      return
    }

    setSubmitting(true)
    try {
      const isEditing = !!editingTemplate
      const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates'
      const method = editingTemplate ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          subjectLine: editForm.subjectLine,
          htmlBody: editForm.htmlBody,
          triggerPoint: editForm.triggerPoint,
          tone: editForm.tone,
        }),
      })

      if (res.ok) {
        toast.success(isEditing ? 'Template updated' : 'Template created')
        setEditOpen(false)
        fetchTemplates()
      } else {
        const data = await res.json()
        toast.error('Failed to save template', { description: data.error })
      }
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingTemplate) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/templates/${deletingTemplate.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Template deleted')
        setDeleteOpen(false)
        setDeletingTemplate(null)
        fetchTemplates()
      } else {
        const data = await res.json()
        toast.error('Failed to delete template', { description: data.error })
      }
    } catch {
      toast.error('Failed to delete template')
    } finally {
      setSubmitting(false)
    }
  }

  const groupByTone = (templates: Template[]) => {
    const groups: Record<string, Template[]> = {}
    templates.forEach((t) => {
      if (!groups[t.tone]) groups[t.tone] = []
      groups[t.tone].push(t)
    })
    return groups
  }

  const insertVariable = (variable: string) => {
    setEditForm((prev) => ({ ...prev, htmlBody: prev.htmlBody + `{{${variable}}}` }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const systemGroups = groupByTone(systemTemplates)
  const customLimit = getCustomTemplateLimit(user?.planType || 'trial')
  const atLimit = customTemplates.length >= customLimit

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Template Studio</h2>
        <p className="text-sm text-muted-foreground">
          View system templates and create custom reminder emails
        </p>
      </div>

      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system">
            <Sparkles className="w-4 h-4 mr-1.5" />
            System Templates ({systemTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Palette className="w-4 h-4 mr-1.5" />
            My Templates ({customTemplates.length})
          </TabsTrigger>
        </TabsList>

        {/* System Templates Tab */}
        <TabsContent value="system" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">System Templates</CardTitle>
              <CardDescription>
                Pre-built templates for each reminder stage. Read-only — clone them to customize.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" defaultValue={Object.keys(systemGroups)}>
                {Object.entries(systemGroups).map(([tone, templates]) => {
                  const toneConfig = TONE_CONFIG[tone] || TONE_CONFIG.neutral
                  return (
                    <AccordionItem key={tone} value={tone}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{toneConfig.emoji}</span>
                          <span className="font-semibold">{toneConfig.label}</span>
                          <Badge variant="outline" className={`text-xs ${toneConfig.className}`}>
                            {templates.length} templates
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pl-2">
                          {templates.map((template) => (
                            <div
                              key={template.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-white"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900">{template.name}</p>
                                  {template.readOnly && (
                                    <Lock className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {TRIGGER_POINT_LABELS[template.triggerPoint] || template.triggerPoint}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {template.subjectLine}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => handlePreview(template)}>
                                  <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                                </Button>
                                <Button size="sm" onClick={() => handleClone(template)} disabled={submitting} className="btn-primary">
                                  <Copy className="w-3.5 h-3.5 mr-1" /> Clone
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Templates Tab */}
        <TabsContent value="custom" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {customTemplates.length} custom template{customTemplates.length !== 1 ? 's' : ''}
              </p>
              {customLimit < 999999 && (
                <Badge variant="outline" className="text-xs">
                  Limit: {customTemplates.length}/{customLimit}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleCreateNew}
              disabled={atLimit}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {atLimit ? 'Limit Reached' : 'New Template'}
            </Button>
          </div>

          {customLimit === 0 && (
            <Card className="border-0 shadow-sm mb-4">
              <CardContent className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Custom templates require a paid plan</p>
                  <p className="text-xs text-amber-700">Upgrade to Starter (5 templates) or Pro (unlimited) to create custom templates.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {customTemplates.length === 0 && customLimit > 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center py-12">
                <Palette className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-gray-900">No custom templates</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clone a system template or create one from scratch.
                </p>
                <Button size="sm" onClick={handleCreateNew} className="mt-4 btn-primary">
                  <Plus className="w-4 h-4 mr-1.5" /> Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {customTemplates.map((template) => {
                const toneConfig = TONE_CONFIG[template.tone] || TONE_CONFIG.neutral
                return (
                  <Card key={template.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{template.name}</p>
                            <Badge variant="outline" className={`text-xs ${toneConfig.className}`}>
                              {toneConfig.emoji} {toneConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {TRIGGER_POINT_LABELS[template.triggerPoint] || template.triggerPoint}
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate">
                              {template.subjectLine}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={() => handlePreview(template)}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setDeletingTemplate(template); setDeleteOpen(true) }} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Subject: {previewTemplate?.subjectLine}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] overflow-y-auto rounded-lg border bg-white">
            <iframe
              srcDoc={previewTemplate?.htmlBody || ''}
              className="w-full min-h-[300px] border-0"
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </ScrollArea>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Variables:</span>
            {TEMPLATE_VARIABLES.map((v) => (
              <Badge key={v} variant="secondary" className="text-xs font-mono">
                {'{{' + v + '}}'}
              </Badge>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Custom Template'}
            </DialogTitle>
            <DialogDescription>
              Design your custom email template. Use {'{{variables}}'} for dynamic content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editingTemplate?.readOnly && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p>System templates are read-only. <strong>Clone</strong> it to create your own version.</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 border-amber-300 text-amber-900 bg-white hover:bg-amber-100"
                  onClick={() => {
                    handleClone(editingTemplate)
                    setEditOpen(false)
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Clone Now
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  placeholder="My Custom Template"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  placeholder="Invoice Reminder: {{invoice_number}}"
                  value={editForm.subjectLine}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, subjectLine: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Trigger Point</Label>
                <Select value={editForm.triggerPoint} onValueChange={(val) => setEditForm((prev) => ({ ...prev, triggerPoint: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_POINT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={editForm.tone} onValueChange={(val) => setEditForm((prev) => ({ ...prev, tone: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TONE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.emoji} {cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 mb-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Canvas</Label>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={!editForm.isSource ? 'secondary' : 'ghost'}
                    className="h-7 text-[10px] rounded-full"
                    onClick={() => setEditForm(prev => ({ ...prev, isSource: false }))}
                    disabled={editingTemplate?.readOnly}
                  >
                    Visual
                  </Button>
                  <Button
                    size="sm"
                    variant={editForm.isSource ? 'secondary' : 'ghost'}
                    className="h-7 text-[10px] rounded-full"
                    onClick={() => setEditForm(prev => ({ ...prev, isSource: true }))}
                    disabled={editingTemplate?.readOnly}
                  >
                    Source
                  </Button>
                </div>
              </div>

              {!editForm.isSource ? (
                <div className="rounded-3xl border border-border/30 bg-muted/20 min-h-[500px] overflow-hidden flex flex-col shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                  <div className="bg-background/80 backdrop-blur-md border-b border-border/20 p-3 flex flex-wrap gap-2 sticky top-0 z-10">
                    <div className="flex gap-1 border-r border-border/20 pr-3 mr-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted hover:text-primary transition-all rounded-lg" onClick={() => execCommand('bold')} title="Bold"><strong>B</strong></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted hover:text-primary transition-all rounded-lg" onClick={() => execCommand('italic')} title="Italic"><em className="font-serif italic text-base">I</em></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted hover:text-primary transition-all rounded-lg" onClick={() => execCommand('underline')} title="Underline"><u>U</u></Button>
                    </div>
                    <div className="flex gap-1 border-r border-border/20 pr-3 mr-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted hover:text-primary transition-all rounded-lg" onClick={() => execCommand('justifyLeft')} title="Align Left">L</Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted hover:text-primary transition-all rounded-lg" onClick={() => execCommand('justifyCenter')} title="Align Center">C</Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted hover:text-primary transition-all rounded-lg" onClick={() => execCommand('justifyRight')} title="Align Right">R</Button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button variant="ghost" size="sm" className="h-9 text-xs px-3 hover:bg-muted hover:text-primary rounded-lg font-bold" onClick={() => execCommand('insertUnorderedList')}>• List</Button>
                      <Button variant="ghost" size="sm" className="h-9 text-xs px-3 hover:bg-muted hover:text-primary rounded-lg font-bold" onClick={() => execCommand('formatBlock', 'h2')}>H2</Button>
                    </div>
                  </div>
                  
                  {/* The actual canvas */}
                  <div className="flex-1 p-12 bg-[#FDF8F5] relative">
                    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-[0_40px_80px_rgba(136,75,58,0.05)] border border-border/10 overflow-hidden min-h-[400px]">
                      <div className="bg-primary/5 p-8 border-b border-border/10">
                         <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center border border-primary/20 mb-4">
                           <span className="text-primary font-serif font-bold italic text-xl">A</span>
                         </div>
                         <h4 className="font-serif italic text-primary text-xl">Payo Edition</h4>
                      </div>
                      <div
                        id="visual-editor"
                        className="p-10 outline-none font-serif text-lg text-foreground leading-relaxed min-h-[300px] selection:bg-primary/10"
                        contentEditable
                        dangerouslySetInnerHTML={{ __html: editForm.htmlBody }}
                        onInput={(e) => setEditForm(prev => ({ ...prev, htmlBody: e.currentTarget.innerHTML }))}
                      />
                      <div className="p-8 border-t border-border/10 bg-muted/5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Member of Payo • Private Follow-up</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background/80 border-t border-border/20 p-3 px-6 text-[10px] text-muted-foreground flex justify-between select-none">
                    <span className="flex items-center gap-2 font-bold uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-secondary-foreground animate-pulse" /> Visual Payo Canvas</span>
                    <span className="font-bold uppercase tracking-wider">Drafting Mode</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col min-h-[400px] rounded-md border border-slate-900 bg-slate-950 overflow-hidden shadow-lg">
                  <Textarea
                    placeholder="<html>...</html>"
                    value={editForm.htmlBody}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, htmlBody: e.target.value }))}
                    className="flex-1 font-mono text-xs p-5 leading-relaxed resize-none bg-slate-950 text-primary border-0 focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin scrollbar-thumb-slate-800"
                  />
                  <div className="bg-slate-900 border-t border-slate-800 p-2 px-3 text-[10px] text-slate-500 flex justify-between select-none">
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> HTML Source Mode</span>
                    <span>Use carefully for layout changes</span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="text-xs text-muted-foreground">Click to insert:</span>
                {TEMPLATE_VARIABLES.map((v) => (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="text-xs font-mono cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => insertVariable(v)}
                  >
                    {'{{' + v + '}}'}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={submitting || !editForm.name || !editForm.htmlBody}
              className="btn-primary"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingTemplate?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeletingTemplate(null); setDeleteOpen(false) }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
