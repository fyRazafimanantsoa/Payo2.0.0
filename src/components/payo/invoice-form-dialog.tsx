'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { usePayoStore } from '@/lib/store'

interface InvoiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editInvoice?: {
    id: string
    invoiceNumber: string
    amountDue: number
    currency: string
    issueDate: string
    dueDate: string
    clientId: string
  } | null
}

interface Client {
  id: string
  name: string
  primaryEmail: string
  preferredCurrency: string
  lastInvoiceNumber: number
}

export function InvoiceFormDialog({ open, onOpenChange, onSuccess, editInvoice }: InvoiceFormDialogProps) {
  const { setCurrentView, user } = usePayoStore()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    clientId: '',
    invoiceNumber: '',
    amountDue: '',
    currency: 'USD',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
  })

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchClients()
      if (editInvoice) {
        setForm({
          clientId: editInvoice.clientId,
          invoiceNumber: editInvoice.invoiceNumber,
          amountDue: editInvoice.amountDue.toString(),
          currency: editInvoice.currency,
          issueDate: editInvoice.issueDate ? editInvoice.issueDate.split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: editInvoice.dueDate ? editInvoice.dueDate.split('T')[0] : '',
        })
      } else {
        setForm({
          clientId: '',
          invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
          amountDue: '',
          currency: 'USD',
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: '',
        })
      }
    }
  }, [open, fetchClients, editInvoice])

  const handleSubmit = async () => {
    if (!form.clientId || !form.amountDue || !form.dueDate) {
      toast.error('Missing fields', { description: 'Please fill in all required fields.' })
      return
    }

    const amount = parseFloat(form.amountDue)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount', { description: 'Amount must be greater than 0.' })
      return
    }

    setSubmitting(true)
    try {
      if (editInvoice) {
        const res = await fetch(`/api/invoices/${editInvoice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceNumber: form.invoiceNumber || undefined,
            amountDue: amount,
            currency: form.currency,
            issueDate: form.issueDate,
            dueDate: form.dueDate,
          }),
        })
        if (res.ok) {
          toast.success('Invoice updated successfully')
          onOpenChange(false)
          onSuccess?.()
        } else {
          const data = await res.json()
          toast.error('Failed to update invoice', { description: data.error || 'Something went wrong.' })
        }
      } else {
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: form.clientId,
            invoiceNumber: form.invoiceNumber || `INV-${Date.now().toString(36).toUpperCase()}`,
            amountDue: amount,
            currency: form.currency,
            issueDate: form.issueDate,
            dueDate: form.dueDate,
          }),
        })
        if (res.ok) {
          toast.success('Invoice created successfully')
          onOpenChange(false)
          onSuccess?.()
        } else {
          const data = await res.json()
          toast.error('Failed to create invoice', { description: data.error || 'Something went wrong.' })
        }
      }
    } catch {
      toast.error(editInvoice ? 'Failed to update invoice' : 'Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    let newInvoiceNumber = form.invoiceNumber

    if (!editInvoice && client) {
      const pattern = user?.invoicePattern || 'INV-{{YEAR}}-{{ID}}'
      const year = new Date().getFullYear().toString()
      const nextId = (client.lastInvoiceNumber + 1).toString().padStart(3, '0')
      newInvoiceNumber = pattern
        .replace('{{YEAR}}', year)
        .replace('{{ID}}', nextId)
    }

    setForm(prev => ({
      ...prev,
      clientId,
      currency: client?.preferredCurrency || prev.currency,
      invoiceNumber: newInvoiceNumber
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editInvoice ? 'Edit Invoice' : 'Add New Invoice'}</DialogTitle>
          <DialogDescription>
            {editInvoice ? 'Update invoice details.' : 'Create a new invoice for a client.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Client *</Label>
            {clients.length === 0 && !loading ? (
              <div className="text-sm p-3 border border-dashed rounded-md bg-amber-50 text-amber-700 flex flex-col gap-2 items-center">
                <span>No clients found. You need a client to create an invoice.</span>
                <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); setCurrentView('clients') }}>
                  Go to Clients
                </Button>
              </div>
            ) : (
              <Select value={form.clientId} onValueChange={handleClientChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loading ? 'Loading...' : 'Select a client'} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.primaryEmail})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input
              placeholder="Auto-generated if blank"
              value={form.invoiceNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amountDue}
                onChange={(e) => setForm((prev) => ({ ...prev, amountDue: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(val) => setForm((prev) => ({ ...prev, currency: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm((prev) => ({ ...prev, issueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !form.clientId || !form.amountDue || !form.dueDate}
            className="btn-primary"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editInvoice ? 'Save Changes' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
