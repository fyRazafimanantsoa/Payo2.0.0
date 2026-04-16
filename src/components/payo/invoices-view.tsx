'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileText,
  Plus,
  Upload,
  Search,
  MoreHorizontal,
  Send,
  CheckCircle2,
  Ban,
  PauseCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  Check,
  X,
  AlertCircle,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { usePayoStore } from '@/lib/store'
import { InvoiceFormDialog } from './invoice-form-dialog'
import { InvoiceDetailsDialog } from './invoice-details-dialog'
import { CsvImportDialog } from './csv-import-dialog'
import { formatCurrency } from '@/lib/utils'

interface Invoice {
  id: string
  invoiceNumber: string
  amountDue: number
  currency: string
  issueDate: string
  dueDate: string
  currentStatus: string
  lastReminderStatus: string | null
  reminderCount: number
  notes: string
  clientId: string
  client: { id: string; name: string; primaryEmail: string }
  clientName: string
  clientEmail: string
  deliveryBadge: {
    status: string
    label: string
    lastSent: string | null
  }
  daysOverdue: number
}

interface ClientOption {
  id: string
  name: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue_1', label: 'Overdue' },
  { value: 'overdue_2', label: 'Very Overdue' },
  { value: 'pending_confirmation', label: 'Awaiting Confirmation' },
  { value: 'paid', label: 'Paid' },
  { value: 'uncollectible', label: 'Uncollectible' },
]

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-primary/5 text-primary/80 border-primary/10' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue_1: { label: 'Overdue', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  overdue_2: { label: 'Very Overdue', className: 'bg-red-50 text-red-700 border-red-200' },
  pending_confirmation: { label: 'Confirming', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  paid: { label: 'Paid', className: 'bg-secondary text-secondary-foreground border-secondary/50' },
  uncollectible: { label: 'Uncollectible', className: 'bg-muted text-muted-foreground border-border' },
}

const DELIVERY_CONFIG: Record<string, { icon: React.ElementType; className: string }> = {
  delivered: { icon: Check, className: 'text-secondary-foreground bg-secondary/30' },
  sent: { icon: Check, className: 'text-secondary-foreground bg-secondary/30' },
  failed: { icon: X, className: 'text-red-600 bg-red-50' },
  bounced: { icon: AlertCircle, className: 'text-orange-600 bg-orange-50' },
  not_sent: { icon: X, className: 'text-muted-foreground bg-muted' },
}

function DeliveryBadge({ delivery }: { delivery: { status: string; label: string; lastSent: string | null } }) {
  const config = DELIVERY_CONFIG[delivery?.status] || DELIVERY_CONFIG.not_sent
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`text-xs gap-1 ${config.className} border-current/20`}>
      <Icon className="w-3 h-3" />
      <span className="hidden sm:inline">{delivery?.label || 'Not sent'}</span>
    </Badge>
  )
}

export function InvoicesView() {
  const { selectedInvoiceId, setSelectedInvoiceId } = usePayoStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [detailsInvoiceId, setDetailsInvoiceId] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<{ subject: string; body: string; id: string; clientName: string } | null>(null)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const limit = 20

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
      if (statusFilter) params.set('status', statusFilter)
      if (clientFilter) params.set('client_id', clientFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/invoices?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const fetchedInvoices = data.data || data.invoices || []
        setInvoices(fetchedInvoices)
        const meta = data.pagination || data.meta || {}
        setTotalPages(meta.totalPages || meta.lastPage || 1)

        // Check if we need to open a specific invoice
        if (selectedInvoiceId) {
          setDetailsInvoiceId(selectedInvoiceId)
          setDetailDialogOpen(true)
          setSelectedInvoiceId(null)
        }
      }
    } catch {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, clientFilter, search, selectedInvoiceId, setSelectedInvoiceId])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleStatusChange = async (invoiceId: string, status: string) => {
    setActionLoading(invoiceId)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        toast.success('Status updated')
        fetchInvoices()
      } else {
        const data = await res.json()
        toast.error('Failed to update status', { description: data.error })
      }
    } catch {
      toast.error('Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendReminder = async (invoiceId: string, force: boolean = false) => {
    setActionLoading(invoiceId)
    try {
      // 1. Fetch preview and check skipReview
      const previewRes = await fetch(`/api/invoices/${invoiceId}/preview`)
      if (!previewRes.ok) {
        toast.error('Could not generate preview')
        setActionLoading(null)
        return
      }
      const preview = await previewRes.json()

      if (!force && !preview.skipReview) {
        setPreviewData({ ...preview, id: invoiceId })
        setActionLoading(null)
        return
      }

      // 2. Send the reminder
      const res = await fetch(`/api/invoices/${invoiceId}/send-reminder`, { method: 'POST' })
      if (res.ok) {
        toast.success('Reminder sent successfully')
        setPreviewData(null)
        fetchInvoices()
      } else {
        const data = await res.json()
        toast.error('Failed to send reminder', { description: data.error })
      }
    } catch {
      toast.error('Failed to send reminder')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSkipReviewToggle = async (invoiceId: string) => {
    try {
      const inv = invoices.find(i => i.id === invoiceId)
      if (!inv) return

      const res = await fetch(`/api/clients/${inv.client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipReminderReview: true }),
      })
      
      if (res.ok) {
        toast.info('Auto-send enabled for this client')
      }
    } catch {
      // silent
    }
  }

  const isTerminalState = (status: string) => status === 'paid' || status === 'uncollectible'

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-serif italic text-primary leading-tight">Invoice Ledger</h2>
          <p className="text-muted-foreground mt-2 font-sans text-sm font-medium uppercase tracking-widest">
            Managing {invoices.length} active wealth statements
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setInvoiceDialogOpen(true)} 
            className="btn-primary px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Create New Invoice
          </button>
        </div>
      </div>

      {/* Sophisticated Table Section */}
      <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-border/20">
        <div className="p-8 border-b border-border/10 flex flex-col md:flex-row justify-between items-center gap-6 bg-muted/5">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
            <input 
              className="w-full pl-12 pr-4 py-3 bg-white border border-border/30 rounded-full text-sm font-sans focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all" 
              placeholder="Search by client or invoice number..." 
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Select value={statusFilter || '_all'} onValueChange={(val) => { setStatusFilter(val); setPage(1) }}>
              <SelectTrigger className="w-full md:w-44 h-11 rounded-full border-border/30 bg-white font-sans text-xs font-bold uppercase tracking-widest">
                <SelectValue placeholder="STATUS" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value || '_all'} className="text-xs font-bold uppercase tracking-widest">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter || '_all'} onValueChange={(val) => { setClientFilter(val); setPage(1) }}>
              <SelectTrigger className="w-full md:w-44 h-11 rounded-full border-border/30 bg-white font-sans text-xs font-bold uppercase tracking-widest">
                <SelectValue placeholder="CLIENT" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="_all" className="text-xs font-bold uppercase tracking-widest">ALL CLIENTS</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <FileText className="w-16 h-16 mb-4 opacity-10 text-primary" />
              <p className="font-serif italic text-xl">The ledger is currently silent.</p>
              <p className="font-sans text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">No transactions found</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/5">
                  <th className="px-10 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Client</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Statement ID</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] text-right">Amount</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Due Date</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                  <th className="px-10 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {invoices.map((inv) => {
                  const statusCfg = STATUS_CONFIG[inv.currentStatus] || STATUS_CONFIG.pending
                  const isActionLoading = actionLoading === inv.id
                  const terminal = isTerminalState(inv.currentStatus)

                  return (
                    <tr 
                      key={inv.id} 
                      className={`hover:bg-muted/10 transition-colors group cursor-pointer ${terminal ? 'opacity-60' : ''}`}
                      onClick={() => {
                        setDetailsInvoiceId(inv.id)
                        setDetailDialogOpen(true)
                      }}
                    >
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif font-bold text-sm border border-primary/20">
                            {inv.clientName?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <p className="font-sans text-sm font-bold text-foreground">{inv.clientName || inv.client?.name || 'Private Client'}</p>
                            <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{inv.clientEmail || inv.client?.primaryEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 font-mono text-xs text-muted-foreground">{inv.invoiceNumber}</td>
                      <td className="px-6 py-6 text-right font-serif text-lg text-foreground">
                        {formatCurrency(inv.amountDue, inv.currency)}
                      </td>
                      <td className="px-6 py-6 text-xs font-bold text-muted-foreground font-sans uppercase tracking-widest">
                        {inv.dueDate ? format(new Date(inv.dueDate), 'MMM d, yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${statusCfg.className.split(' ').slice(0, 2).join(' ')}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.className.includes('secondary') ? 'bg-secondary-foreground' : statusCfg.className.includes('red') ? 'bg-destructive' : 'bg-primary'}`}></span> 
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted transition-all">
                              {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-5 h-5 text-muted-foreground" />}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-border/30 backdrop-blur-xl bg-background/95">
                            <DropdownMenuItem className="rounded-lg h-10 gap-3 cursor-pointer" onClick={() => { setDetailsInvoiceId(inv.id); setDetailDialogOpen(true) }}>
                              <FileText className="w-4 h-4" /> <span className="font-sans">View Statement</span>
                            </DropdownMenuItem>
                            {!terminal && (
                              <>
                                <DropdownMenuSeparator className="my-2 opacity-30" />
                                <DropdownMenuItem className="rounded-lg h-10 gap-3 cursor-pointer text-secondary-foreground" onClick={() => handleStatusChange(inv.id, 'paid')}>
                                  <CheckCircle2 className="w-4 h-4" /> <span className="font-sans">Mark as Paid</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg h-10 gap-3 cursor-pointer text-primary" onClick={() => handleSendReminder(inv.id)}>
                                  <Send className="w-4 h-4" /> <span className="font-sans">Send Follow-up</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-2 opacity-30" />
                                <DropdownMenuItem className="rounded-lg h-10 gap-3 cursor-pointer text-destructive" onClick={() => handleStatusChange(inv.id, 'uncollectible')}>
                                  <Ban className="w-4 h-4" /> <span className="font-sans">Write Off</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {!loading && totalPages > 1 && (
          <div className="p-8 bg-muted/5 border-t border-border/10 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <p>Showing {invoices.length} of {totalPages * limit} statements</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(Math.max(1, page - 1))} 
                disabled={page <= 1}
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-border/30 bg-white hover:bg-muted disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPage(Math.min(totalPages, page + 1))} 
                disabled={page >= totalPages}
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-border/30 bg-white hover:bg-muted disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reminder Review Dialog Redesign */}
      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-[2rem] border-border/30 bg-background shadow-2xl">
          <div className="bg-primary/5 p-10 border-b border-border/10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-primary/20 shadow-sm">
                <Send className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-serif text-primary italic">Review Follow-up</h2>
                <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest font-bold">To: {previewData?.clientName}</p>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em]">Subject Line</label>
              <div className="p-4 bg-muted/20 border border-border/20 rounded-2xl font-serif text-lg italic text-foreground">
                {previewData?.subject}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em]">Statement Canvas</label>
              <ScrollArea className="h-[350px] border border-border/20 rounded-3xl bg-white p-8 shadow-inner shadow-muted/5">
                <div 
                  dangerouslySetInnerHTML={{ __html: previewData?.body || '' }} 
                  className="font-serif text-lg leading-relaxed text-foreground prose-p:mb-4" 
                />
              </ScrollArea>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-border/10">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="skip-review"
                  className="w-5 h-5 rounded-lg border-border/50 text-primary focus:ring-primary/20 cursor-pointer"
                  onChange={() => previewData && handleSkipReviewToggle(previewData.id)}
                />
                <label htmlFor="skip-review" className="text-xs font-bold text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">
                  Enable trust-mode for this client
                </label>
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <button onClick={() => setPreviewData(null)} className="flex-1 sm:flex-none px-8 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                  Discard
                </button>
                <button
                  onClick={() => previewData && handleSendReminder(previewData.id, true)}
                  disabled={!!actionLoading}
                  className="flex-1 sm:flex-none btn-primary px-10 py-3 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Confirm & Dispatch
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <InvoiceFormDialog
        open={invoiceDialogOpen}
        onOpenChange={(open) => {
          setInvoiceDialogOpen(open)
          if (!open) setEditingInvoice(null)
        }}
        onSuccess={fetchInvoices}
        editInvoice={editingInvoice}
      />

      <InvoiceDetailsDialog 
        open={detailDialogOpen} 
        onOpenChange={setDetailDialogOpen} 
        invoiceId={detailsInvoiceId}
        onEdit={(inv) => {
          setEditingInvoice(inv)
          setInvoiceDialogOpen(true)
        }}
      />

      <CsvImportDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} onSuccess={fetchInvoices} />
    </div>
  )
}
