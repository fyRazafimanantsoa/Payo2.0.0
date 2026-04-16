'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, DollarSign, Mail, MessageSquare, Send, CheckCircle2, AlertCircle, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface ReminderLog {
  id: string
  sentAt: string
  status: string
  emailSubject: string
}

interface InvoiceDetails {
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
  clientName: string
  clientEmail: string
  deliveryBadge: {
    status: string
    label: string
    lastSent: string | null
  }
  daysOverdue: number
  reminderLogs: ReminderLog[]
}

interface InvoiceDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string | null
  onEdit?: (invoice: any) => void
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-primary/5 text-primary/80 border-primary/10' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue_1: { label: 'Overdue', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  overdue_2: { label: 'Very Overdue', className: 'bg-red-50 text-red-700 border-red-200' },
  pending_confirmation: { label: 'Confirming', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  paid: { label: 'Paid', className: 'bg-secondary text-secondary-foreground border-secondary/50' },
  uncollectible: { label: 'Uncollectible', className: 'bg-muted text-muted-foreground border-border' },
}

export function InvoiceDetailsDialog({ open, onOpenChange, invoiceId, onEdit }: InvoiceDetailsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null)

  const fetchDetails = useCallback(async () => {
    if (!invoiceId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`)
      if (res.ok) {
        const data = await res.json()
        setInvoice(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    if (open && invoiceId) {
      fetchDetails()
    }
  }, [open, invoiceId, fetchDetails])

  if (!open && !invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
        {loading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : invoice ? (
          <>
            <div className={`p-6 pb-4 border-b bg-gradient-to-br from-white to-gray-50/50`}>
              <DialogHeader className="flex flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl font-bold font-mono">#{invoice.invoiceNumber}</DialogTitle>
                    <Badge variant="outline" className={`${STATUS_CONFIG[invoice.currentStatus]?.className} border-current/20`}>
                      {STATUS_CONFIG[invoice.currentStatus]?.label}
                    </Badge>
                  </div>
                  <DialogDescription className="text-gray-500 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {invoice.clientName} ({invoice.clientEmail})
                  </DialogDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-full"
                    onClick={() => {
                        onOpenChange(false)
                        onEdit?.(invoice)
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Button>
                </div>
              </DialogHeader>
            </div>

            <ScrollArea className="max-h-[70vh]">
              <div className="p-6 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-px bg-gray-100 rounded-xl border overflow-hidden">
                  <div className="bg-white p-4 space-y-1">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3" /> Amount Due
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(invoice.amountDue, invoice.currency)}
                    </p>
                  </div>
                  <div className="bg-white p-4 space-y-1">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Due Date
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                    </p>
                    <p className="text-[10px] text-red-500 font-medium">
                      {invoice.daysOverdue > 0 ? `${invoice.daysOverdue} days overdue` : 'On time'}
                    </p>
                  </div>
                </div>

                {/* History / Timeline */}
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Send className="w-4 h-4 text-primary" />
                        Reminder History
                     </h3>
                     <Badge variant="secondary" className="text-[10px] uppercase tracking-tighter">
                        {invoice.reminderCount} Sent
                     </Badge>
                   </div>

                   <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                     {invoice.reminderLogs && invoice.reminderLogs.length > 0 ? (
                       invoice.reminderLogs.map((log, idx) => (
                         <div key={log.id} className="relative pl-8 group">
                            <div className="absolute left-0 top-1.5 w-[24px] h-[24px] rounded-full border-4 border-white bg-secondary/30 flex items-center justify-center">
                               {log.status === 'sent' ? (
                                 <CheckCircle2 className="w-3 h-3 text-secondary-foreground" />
                               ) : (
                                 <AlertCircle className="w-3 h-3 text-red-500" />
                               )}
                            </div>
                            <div className="space-y-1">
                               <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-gray-900">{log.emailSubject}</p>
                                  <time className="text-[10px] text-gray-400 font-medium">{format(new Date(log.sentAt), 'MMM d, h:mm a')}</time>
                               </div>
                               <p className="text-[10px] text-gray-500">Status: <span className="capitalize">{log.status}</span></p>
                            </div>
                         </div>
                       ))
                     ) : (
                       <div className="pl-8 py-2">
                          <p className="text-xs text-gray-400 italic">No reminders sent yet.</p>
                       </div>
                     )}
                   </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="space-y-2 bg-amber-50/50 p-4 rounded-lg border border-amber-100">
                    <h3 className="text-xs font-bold text-amber-800 flex items-center gap-2 uppercase tracking-wide">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Notes
                    </h3>
                    <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-6 pt-0 mt-2 border-t bg-gray-50/50">
               <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-2">
                     <p className="text-[10px] text-gray-400 font-medium italic">
                        Created {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
                     </p>
                  </div>
                  <Button 
                    size="sm" 
                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-medium"
                    onClick={() => onOpenChange(false)}
                  >
                    Close
                  </Button>
               </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
