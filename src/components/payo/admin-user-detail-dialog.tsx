'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDistanceToNow } from 'date-fns'

interface UserDetailDialogProps {
  open: boolean
  onClose: () => void
  userId: string | null
}

interface UserDetail {
  id: string
  email: string
  businessName: string
  planType: string
  subscriptionStatus: string
  isAdmin: boolean
  emailVerified: boolean
  locale: string
  createdAt: string
  trialEndsAt: string | null
  subscriptions: Array<{
    id: string
    planType: string
    amount: number
    currency: string
    billingCycle: string
    dueDate: string
    status: string
    overdueSince: string | null
    paidAt: string | null
    createdAt: string
  }>
  clients: Array<{
    id: string
    name: string
    primaryEmail: string
    _count: { invoices: number }
    createdAt: string
  }>
  invoices: Array<{
    id: string
    invoiceNumber: string
    amountDue: number
    currency: string
    currentStatus: string
    dueDate: string
    client: { name: string }
    createdAt: string
  }>
  subscriptionHistory: Array<{
    id: string
    planType: string
    amount: number
    currency: string
    billingCycle: string
    paidAt: string
    periodStart: string
    periodEnd: string
    notes: string | null
    createdAt: string
  }>
}

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-primary/5 text-primary border-primary/20',
  active: 'bg-secondary/20 text-secondary-foreground border-secondary-foreground/20',
  overdue: 'bg-amber-50 text-amber-700 border-amber-200',
  suspended: 'bg-destructive/5 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground border-border/20',
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-primary/5 text-primary',
  pending: 'bg-amber-50 text-amber-700',
  overdue_1: 'bg-destructive/5 text-destructive',
  overdue_2: 'bg-destructive/10 text-destructive',
  pending_confirmation: 'bg-secondary text-secondary-foreground',
  paid: 'bg-secondary/20 text-secondary-foreground',
  uncollectible: 'bg-muted text-muted-foreground',
}

export function UserDetailDialog({ open, onClose, userId }: UserDetailDialogProps) {
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && userId) {
      loadUser()
    } else {
      setUser(null)
    }
  }, [open, userId])

  const loadUser = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-[2.5rem] border-border/30 bg-background shadow-2xl">
        <div className="bg-primary/5 p-10 border-b border-border/10">
          <DialogTitle className="text-3xl font-serif text-primary italic leading-tight">Examine Identity</DialogTitle>
          <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold mt-2">Registry Profile View</p>
        </div>

        <div className="overflow-y-auto p-10 space-y-12">
          {loading ? (
            <div className="space-y-8 py-4">
              <Skeleton className="h-32 w-full rounded-[2rem]" />
              <Skeleton className="h-64 w-full rounded-[2rem]" />
            </div>
          ) : user ? (
            <>
              {/* Profile Summary */}
              <div className="bg-muted/10 rounded-[2rem] border border-border/20 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Identity Email</p>
                    <p className="font-sans text-sm font-bold text-foreground">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Practice Name</p>
                    <p className="font-serif text-lg italic text-primary">{user.businessName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Curation Status</p>
                    <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${STATUS_COLORS[user.subscriptionStatus] || ''}`}>
                      {user.subscriptionStatus}
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Identity Tier</p>
                    <span className="font-sans text-[10px] font-bold text-foreground uppercase tracking-widest bg-secondary px-3 py-1 rounded-full">{user.planType}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10 pt-8 border-t border-border/10">
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Temporal Origin</p>
                    <p className="font-sans text-xs font-medium text-foreground mt-1">{formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</p>
                  </div>
                  {user.trialEndsAt && (
                    <div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Trial Conclusion</p>
                      <p className="font-serif text-sm italic text-foreground mt-1">{new Date(user.trialEndsAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Correspondence Verified</p>
                    <p className={`font-sans text-[10px] font-bold uppercase mt-1 ${user.emailVerified ? 'text-secondary-foreground' : 'text-amber-600'}`}>
                      {user.emailVerified ? 'Confirmed ✓' : 'Awaiting ✗'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subscriptions */}
              {user.subscriptions.length > 0 && (
                <div className="space-y-6">
                  <h3 className="font-serif text-2xl italic text-primary">Active Subscriptions</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {user.subscriptions.map((sub) => (
                      <div key={sub.id} className="bg-white rounded-3xl border border-border/20 p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
                        <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Plan & Cycle</p>
                          <p className="font-serif text-xl italic text-foreground capitalize">{sub.planType} ({sub.billingCycle})</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Cycle Amount</p>
                          <p className="font-serif text-2xl text-foreground">${sub.amount} <span className="text-sm font-sans uppercase font-bold text-muted-foreground/40">{sub.currency}</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Due Date</p>
                          <p className="font-sans text-sm font-bold text-foreground">{new Date(sub.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Identity Assets Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Clients */}
                <div className="space-y-6">
                  <h3 className="font-serif text-xl italic text-primary">Client Portfolio ({user.clients.length})</h3>
                  <div className="bg-white rounded-3xl border border-border/20 overflow-hidden shadow-xl">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/5">
                          <TableHead className="px-6 py-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Identity</TableHead>
                          <TableHead className="px-6 py-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center">Ledger Items</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.clients.slice(0, 10).map((c) => (
                          <TableRow key={c.id} className="hover:bg-muted/5 transition-colors border-b border-border/5">
                            <TableCell className="px-6 py-4 font-sans text-xs font-bold">{c.name}</TableCell>
                            <TableCell className="px-6 py-4 text-center font-serif text-base">{c._count.invoices}</TableCell>
                          </TableRow>
                        ))}
                        {user.clients.length === 0 && (
                          <TableRow><TableCell colSpan={2} className="text-center py-12 font-serif italic text-muted-foreground">Portfolio is empty.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Invoices */}
                <div className="space-y-6">
                  <h3 className="font-serif text-xl italic text-primary">Recent Statement Activity</h3>
                  <div className="bg-white rounded-3xl border border-border/20 overflow-hidden shadow-xl">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/5">
                          <TableHead className="px-6 py-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Statement ID</TableHead>
                          <TableHead className="px-6 py-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-right">Amount</TableHead>
                          <TableHead className="px-6 py-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.invoices.slice(0, 10).map((inv) => (
                          <TableRow key={inv.id} className="hover:bg-muted/5 transition-colors border-b border-border/5">
                            <TableCell className="px-6 py-4 font-mono text-[10px] text-muted-foreground">{inv.invoiceNumber}</TableCell>
                            <TableCell className="px-6 py-4 text-right font-serif text-sm font-bold">${inv.amountDue}</TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${INVOICE_STATUS_COLORS[inv.currentStatus] || ''}`}>
                                {inv.currentStatus.replace('_', ' ')}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        {user.invoices.length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center py-12 font-serif italic text-muted-foreground">No ledger items found.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-lg font-serif italic text-muted-foreground text-center py-24">Unable to retrieve identity data.</p>
          )}
        </div>
        
        <div className="p-8 border-t border-border/10 flex justify-end bg-muted/5">
          <button onClick={onClose} className="btn-primary px-10 py-3 rounded-full font-bold uppercase tracking-[0.2em] text-xs">Conclude Review</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
