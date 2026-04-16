'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Mail,
  Search,
  ChevronRight,
  ChevronDown,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

interface Client {
  id: string
  name: string
  primaryEmail: string
  ccEmails: string
  preferredCurrency: string
  locale: string
  emailStatus: string
  notes: string
  assignedTemplateId: string | null
  outstandingAmount: number
  invoiceCount: number
  createdAt: string
}

interface ClientDetail extends Client {
  invoices: Array<{
    id: string
    invoiceNumber: string
    amountDue: number
    currency: string
    dueDate: string
    currentStatus: string
  }>
  templates?: Array<{ id: string; name: string }>
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  overdue_1: { label: 'Overdue', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  overdue_2: { label: 'Very Overdue', className: 'bg-red-100 text-red-700 border-red-200' },
  pending_confirmation: { label: 'Confirming', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  uncollectible: { label: 'Uncollectible', className: 'bg-gray-100 text-gray-500 border-gray-200' },
}

export function ClientsView() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    primaryEmail: '',
    ccEmails: '',
    preferredCurrency: 'USD',
    notes: '',
  })

  const resetForm = () => {
    setForm({ name: '', primaryEmail: '', ccEmails: '', preferredCurrency: 'USD', notes: '' })
    setSelectedClient(null)
  }

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/clients?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setClients(Array.isArray(data) ? data : [])
      }
    } catch {
      toast.error('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const fetchClientDetail = async (clientId: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setClientDetail(data)
      }
    } catch {
      toast.error('Failed to load client details')
    } finally {
      setDetailLoading(false)
    }
  }

  const toggleExpand = (clientId: string) => {
    if (expandedClient === clientId) {
      setExpandedClient(null)
      setClientDetail(null)
    } else {
      setExpandedClient(clientId)
      fetchClientDetail(clientId)
    }
  }

  const handleAddClient = async () => {
    if (!form.name || !form.primaryEmail) {
      toast.error('Missing fields', { description: 'Name and email are required.' })
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, string> = {
        name: form.name,
        primaryEmail: form.primaryEmail,
        preferredCurrency: form.preferredCurrency,
      }
      if (form.ccEmails.trim()) body.ccEmails = form.ccEmails
      if (form.notes.trim()) body.notes = form.notes

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Client added to collection')
        setAddDialogOpen(false)
        resetForm()
        fetchClients()
      } else {
        const data = await res.json()
        toast.error('Failed to add client', { description: data.error })
      }
    } catch {
      toast.error('Failed to add client')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClient = async () => {
    if (!selectedClient) return
    setSubmitting(true)
    try {
      const body: Record<string, string> = {
        name: form.name,
        primaryEmail: form.primaryEmail,
        ccEmails: form.ccEmails,
        preferredCurrency: form.preferredCurrency,
        notes: form.notes,
      }

      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Client record updated')
        setEditDialogOpen(false)
        resetForm()
        fetchClients()
        if (expandedClient === selectedClient.id) {
          fetchClientDetail(selectedClient.id)
        }
      } else {
        const data = await res.json()
        toast.error('Failed to update client', { description: data.error })
      }
    } catch {
      toast.error('Failed to update client')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClient = async () => {
    if (!selectedClient) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Client archived')
        setDeleteDialogOpen(false)
        resetForm()
        fetchClients()
      } else {
        toast.error('Failed to delete client')
      }
    } catch {
      toast.error('Failed to delete client')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (client: Client) => {
    setSelectedClient(client)
    setForm({
      name: client.name,
      primaryEmail: client.primaryEmail,
      ccEmails: client.ccEmails || '',
      preferredCurrency: client.preferredCurrency || 'USD',
      notes: client.notes || '',
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client)
    setDeleteDialogOpen(true)
  }

  const parseCcEmails = (ccEmails: string): string[] => {
    try {
      const parsed = JSON.parse(ccEmails)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return ccEmails ? ccEmails.split(',').map((e) => e.trim()).filter(Boolean) : []
    }
  }

  // Filter clients by search
  const filteredClients = clients.filter((c) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.primaryEmail.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-serif italic text-primary leading-tight">Client Collection</h2>
          <p className="text-muted-foreground mt-2 font-sans text-sm font-medium uppercase tracking-widest">
            Managing {clients.length} private relations
          </p>
        </div>
        <button 
          onClick={() => { resetForm(); setAddDialogOpen(true) }} 
          className="btn-primary px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Register New Client
        </button>
      </div>

      {/* Search */}
      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
        <input 
          className="w-full pl-12 pr-4 py-4 bg-white border border-border/30 rounded-2xl text-sm font-sans focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all shadow-sm" 
          placeholder="Search identity or email..." 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Client List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[2rem]" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-white rounded-[2rem] border border-dashed border-border/50">
          <Users className="w-16 h-16 mb-4 opacity-10 text-primary" />
          <p className="font-serif italic text-xl">The collection is currently empty.</p>
          <p className="font-sans text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">No client records found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => (
            <div key={client.id} className="group">
              <div 
                className={`bg-white rounded-[2rem] border border-border/20 transition-all duration-500 overflow-hidden ${
                  expandedClient === client.id ? 'shadow-xl ring-4 ring-primary/5 border-primary/20' : 'hover:shadow-md hover:border-primary/30'
                }`}
              >
                <div
                  className="flex items-center justify-between p-8 cursor-pointer"
                  onClick={() => toggleExpand(client.id)}
                >
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-full transition-colors duration-500 ${
                      expandedClient === client.id ? 'bg-primary text-white' : 'bg-muted text-primary border border-primary/10'
                    }`}>
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-serif text-2xl text-foreground truncate">{client.name}</p>
                        {client.emailStatus === 'bounced' && (
                          <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Bounced
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-primary/40" /> {client.primaryEmail}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-border/50" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-primary/40" /> {client.invoiceCount} Ledger Items
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="font-serif text-2xl text-foreground">
                          {formatCurrency(client.outstandingAmount || 0)}
                        </p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Outstanding</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted transition-all">
                              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-border/30 backdrop-blur-xl bg-background/95">
                            <DropdownMenuItem className="rounded-lg h-10 gap-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); openEditDialog(client) }}>
                              <Pencil className="w-4 h-4" /> <span className="font-sans">Refine Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-2 opacity-30" />
                            <DropdownMenuItem className="rounded-lg h-10 gap-3 cursor-pointer text-destructive" onClick={(e) => { e.stopPropagation(); openDeleteDialog(client) }}>
                              <Trash2 className="w-4 h-4" /> <span className="font-sans">Archive Record</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className={`transition-transform duration-500 ${expandedClient === client.id ? 'rotate-180' : ''}`}>
                          <ChevronDown className="w-5 h-5 text-primary/40" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Detail */}
                <div className={`grid transition-all duration-500 ease-in-out ${expandedClient === client.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="p-8 pt-0 border-t border-border/10 bg-muted/5">
                      {detailLoading ? (
                        <div className="py-8 space-y-4">
                          <Skeleton className="h-4 w-48 rounded-full" />
                          <Skeleton className="h-32 w-full rounded-3xl" />
                        </div>
                      ) : clientDetail ? (
                        <div className="space-y-8 py-8 animate-in fade-in slide-in-from-top-4 duration-700">
                          {/* Info Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Correspondence</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-border/30 text-[10px] font-bold text-foreground">
                                  {clientDetail.primaryEmail}
                                </span>
                                {parseCcEmails(clientDetail.ccEmails).map((email) => (
                                  <span key={email} className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/5 text-[10px] font-bold text-primary">
                                    CC: {email}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Preferences</p>
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                                CURRENCY: {clientDetail.preferredCurrency}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Internal Notes</p>
                              <p className="text-xs italic text-muted-foreground font-serif leading-relaxed">
                                {clientDetail.notes || "No additional curatorial notes provided."}
                              </p>
                            </div>
                          </div>

                          {/* Invoices */}
                          <div className="space-y-4">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Ledger Statements</p>
                            <div className="bg-white rounded-3xl border border-border/20 overflow-hidden shadow-sm">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/10 border-b border-border/10">
                                    <TableHead className="px-6 py-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ID</TableHead>
                                    <TableHead className="px-6 py-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-right">Amount</TableHead>
                                    <TableHead className="px-6 py-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Due Date</TableHead>
                                    <TableHead className="px-6 py-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(clientDetail.invoices || []).map((inv) => {
                                    const statusCfg = STATUS_CONFIG[inv.currentStatus] || STATUS_CONFIG.pending
                                    return (
                                      <TableRow key={inv.id} className="border-b border-border/5 hover:bg-muted/5 transition-colors">
                                        <TableCell className="px-6 py-4 font-mono text-[10px] text-muted-foreground">{inv.invoiceNumber}</TableCell>
                                        <TableCell className="px-6 py-4 text-right font-serif text-base text-foreground">
                                          {formatCurrency(inv.amountDue, inv.currency)}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                          {inv.dueDate ? format(new Date(inv.dueDate), 'MMM d, yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${statusCfg.className.split(' ').slice(0, 2).join(' ')}`}>
                                            {statusCfg.label}
                                          </span>
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                  {(clientDetail.invoices || []).length === 0 && (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-xs font-serif italic text-center text-muted-foreground py-12">
                                        No active statements currently recorded.
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="py-12 text-center font-serif italic text-muted-foreground">Unable to retrieve client details.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Client Dialog Redesign */}
      <Dialog open={addDialogOpen} onOpenChange={(v) => { if (!v) resetForm(); setAddDialogOpen(v) }}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2.5rem] border-border/30 bg-background shadow-2xl">
          <div className="bg-primary/5 p-10 border-b border-border/10 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-primary/20 shadow-sm mx-auto mb-6">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-serif text-primary italic leading-tight">Register Client</h2>
            <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold mt-2">New Portfolio Identity</p>
          </div>

          <div className="p-10 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Client Identity</Label>
                <Input
                  placeholder="Full name or entity"
                  className="h-12 bg-muted/20 border-border/30 rounded-xl focus:ring-primary/10 focus:border-primary transition-all"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Primary Email</Label>
                <Input
                  type="email"
                  placeholder="identity@client.com"
                  className="h-12 bg-muted/20 border-border/30 rounded-xl focus:ring-primary/10 focus:border-primary transition-all"
                  value={form.primaryEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, primaryEmail: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">CC Recipients</Label>
              <Input
                placeholder="accounting@client.com, legal@client.com"
                className="h-12 bg-muted/20 border-border/30 rounded-xl focus:ring-primary/10 focus:border-primary transition-all"
                value={form.ccEmails}
                onChange={(e) => setForm((prev) => ({ ...prev, ccEmails: e.target.value }))}
              />
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest pl-1">Comma-separated luxury list</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Settlement Currency</Label>
              <Select value={form.preferredCurrency} onValueChange={(val) => setForm((prev) => ({ ...prev, preferredCurrency: val }))}>
                <SelectTrigger className="h-12 bg-muted/20 border-border/30 rounded-xl font-sans text-xs font-bold uppercase tracking-widest">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl font-sans text-xs font-bold uppercase tracking-widest">
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Curatorial Notes</Label>
              <textarea
                placeholder="Internal context about this relationship..."
                className="w-full min-h-[100px] p-4 bg-muted/20 border border-border/30 rounded-2xl text-sm font-sans focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => { resetForm(); setAddDialogOpen(false) }}
                className="flex-1 px-8 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleAddClient}
                disabled={submitting || !form.name || !form.primaryEmail}
                className="flex-[2] btn-primary h-14 rounded-full font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
                Confirm Identity
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Simlar redesign to Add */}
      <Dialog open={editDialogOpen} onOpenChange={(v) => { if (!v) resetForm(); setEditDialogOpen(v) }}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2.5rem] border-border/30 bg-background shadow-2xl">
          <div className="bg-primary/5 p-10 border-b border-border/10 text-center">
            <h2 className="text-3xl font-serif text-primary italic leading-tight">Refine Record</h2>
            <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold mt-2">Updating Client Parameters</p>
          </div>
          <div className="p-10 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Identity</Label>
                <Input
                  className="h-12 bg-muted/20 border-border/30 rounded-xl"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Email</Label>
                <Input
                  type="email"
                  className="h-12 bg-muted/20 border-border/30 rounded-xl"
                  value={form.primaryEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, primaryEmail: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setEditDialogOpen(false)} className="flex-1 px-8 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Cancel</button>
              <button
                onClick={handleEditClient}
                disabled={submitting || !form.name || !form.primaryEmail}
                className="flex-[2] btn-primary h-14 rounded-full font-bold shadow-xl flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl text-destructive italic">Archive Relation?</AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-muted-foreground leading-relaxed">
              This will place the identity <strong>{selectedClient?.name}</strong> and all associated ledger items into historical storage. This curation is permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-full border-border/30 font-bold uppercase tracking-widest text-[10px]">Resume Portfolio</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              disabled={submitting}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-full font-bold uppercase tracking-widest text-[10px] px-8 h-11"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
