'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePayoStore, type AdminUser } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Search,
  MoreHorizontal,
  Eye,
  CreditCard,
  Mail,
  Ban,
  RotateCcw,
  ArrowRightLeft,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { MarkPaidDialog } from './admin-mark-paid-dialog'
import { ChangePlanDialog } from './admin-change-plan-dialog'
import { SuspendConfirmDialog } from './admin-suspend-confirm-dialog'
import { UserDetailDialog } from './admin-user-detail-dialog'
import { formatDistanceToNow } from 'date-fns'

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-blue-100 text-blue-700 border-blue-200',
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  overdue: 'bg-orange-100 text-orange-700 border-orange-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
}

const PLAN_COLORS: Record<string, string> = {
  trial: 'bg-blue-50 text-blue-700 border-blue-200',
  starter: 'bg-slate-50 text-slate-700 border-slate-200',
  pro: 'bg-purple-50 text-purple-700 border-purple-200',
}

export function AdminUsersView() {
  const { adminUsers, fetchAdminUsers, fetchAdminStats } = usePayoStore()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')

  // Dialog states
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [markPaidUser, setMarkPaidUser] = useState<AdminUser | null>(null)
  const [changePlanUser, setChangePlanUser] = useState<AdminUser | null>(null)
  const [suspendUser, setSuspendUser] = useState<AdminUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    await fetchAdminUsers({ search, status: statusFilter, plan: planFilter })
    setLoading(false)
  }, [fetchAdminUsers, search, statusFilter, planFilter])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, statusFilter, planFilter])

  const refresh = () => {
    loadUsers()
    fetchAdminStats()
  }

  const handleReactivate = async (user: AdminUser) => {
    setActionLoading(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Reactivated by admin' }),
      })
      if (res.ok) {
        toast.success(`Identity ${user.businessName} reactivated`)
        refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Reactivation failed')
      }
    } catch {
      toast.error('Connection failure')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendReminder = async (user: AdminUser) => {
    setActionLoading(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Admin-initiated membership reminder' }),
      })
      if (res.ok) {
        toast.success(`Membership correspondence dispatched to ${user.businessName}`)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Correspondence failure')
      }
    } catch {
      toast.error('Connection failure')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    setActionLoading(deleteUser.id)
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`Identity ${deleteUser.businessName} dissolved from registry`)
        setDeleteUser(null)
        refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Dissolution failed')
      }
    } catch {
      toast.error('Connection failure')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-10 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-serif italic text-primary leading-tight">Member Directory</h2>
        <p className="text-muted-foreground mt-2 font-sans text-sm font-medium uppercase tracking-[0.2em]">
          Total Registry: {adminUsers.length} Distinguished Identities
        </p>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col lg:flex-row gap-6 p-8 bg-white rounded-[2rem] border border-border/20 shadow-sm items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
          <input
            placeholder="Search directory by email or practice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-muted/10 border border-border/30 rounded-xl text-sm font-sans focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-4 w-full lg:w-auto">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full lg:w-44 h-12 rounded-xl border-border/30 bg-white font-sans text-[10px] font-bold uppercase tracking-widest">
              <SelectValue placeholder="STATUS" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-widest">ALL STATUSES</SelectItem>
              <SelectItem value="trial" className="text-[10px] font-bold uppercase tracking-widest">TRIAL</SelectItem>
              <SelectItem value="active" className="text-[10px] font-bold uppercase tracking-widest">ACTIVE</SelectItem>
              <SelectItem value="overdue" className="text-[10px] font-bold uppercase tracking-widest">OVERDUE</SelectItem>
              <SelectItem value="suspended" className="text-[10px] font-bold uppercase tracking-widest">SUSPENDED</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={(v) => setPlanFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full lg:w-44 h-12 rounded-xl border-border/30 bg-white font-sans text-[10px] font-bold uppercase tracking-widest">
              <SelectValue placeholder="TIER" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-widest">ALL TIERS</SelectItem>
              <SelectItem value="starter" className="text-[10px] font-bold uppercase tracking-widest">STARTER</SelectItem>
              <SelectItem value="pro" className="text-[10px] font-bold uppercase tracking-widest">PRO CURATOR</SelectItem>
            </SelectContent>
          </Select>
          <button 
            onClick={loadUsers} 
            className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-[2rem] border border-border/20 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/5 border-b border-border/10">
                <TableHead className="px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Identity</TableHead>
                <TableHead className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Membership Tier</TableHead>
                <TableHead className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Status</TableHead>
                <TableHead className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] hidden lg:table-cell text-center">Relations</TableHead>
                <TableHead className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] hidden lg:table-cell text-center">Ledger Items</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] text-right">Registry Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j} className="px-8 py-6"><Skeleton className="h-4 w-24 rounded-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : adminUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-24 font-serif italic text-muted-foreground text-lg">
                    No matching identities found in the directory.
                  </TableCell>
                </TableRow>
              ) : (
                adminUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/5 transition-colors group">
                    <TableCell className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-sans text-sm font-bold text-foreground">{user.email}</span>
                        <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest font-medium mt-0.5">{user.businessName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${PLAN_COLORS[user.planType] || 'bg-muted border-border/30 text-muted-foreground'}`}>
                        {user.planType}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${STATUS_COLORS[user.subscriptionStatus] || ''}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.subscriptionStatus === 'active' ? 'bg-secondary-foreground' : user.subscriptionStatus === 'overdue' ? 'bg-primary' : 'bg-destructive'}`} />
                        {user.subscriptionStatus}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-6 hidden lg:table-cell text-center">
                      <span className="font-serif text-lg text-foreground">{user.client_count}</span>
                    </TableCell>
                    <TableCell className="px-6 py-6 hidden lg:table-cell text-center">
                      <span className="font-serif text-lg text-foreground">{user.invoice_count}</span>
                    </TableCell>
                    <TableCell className="px-8 py-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-muted transition-all">
                            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-border/30 backdrop-blur-xl bg-background/95">
                          <DropdownMenuItem onClick={() => setDetailUserId(user.id)} className="rounded-lg h-10 gap-3 cursor-pointer">
                            <Eye className="w-4 h-4" /> <span className="font-sans">Examine Profile</span>
                          </DropdownMenuItem>
                          {user.subscription && user.subscription.status !== 'paid' && (
                            <DropdownMenuItem onClick={() => setMarkPaidUser(user)} className="rounded-lg h-10 gap-3 cursor-pointer text-secondary-foreground font-bold">
                              <CreditCard className="w-4 h-4" /> <span className="font-sans">Acknowledge Payment</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="my-2 opacity-30" />
                          <DropdownMenuItem onClick={() => setChangePlanUser(user)} className="rounded-lg h-10 gap-3 cursor-pointer">
                            <ArrowRightLeft className="w-4 h-4" /> <span className="font-sans">Alter Membership Tier</span>
                          </DropdownMenuItem>
                          {(user.subscriptionStatus === 'active' || user.subscriptionStatus === 'overdue') && (
                            <DropdownMenuItem onClick={() => setSuspendUser(user)} className="rounded-lg h-10 gap-3 cursor-pointer text-primary">
                              <Ban className="w-4 h-4" /> <span className="font-sans">Dissolve Identity</span>
                            </DropdownMenuItem>
                          )}
                          {user.subscriptionStatus === 'suspended' && (
                            <DropdownMenuItem onClick={() => handleReactivate(user)} className="rounded-lg h-10 gap-3 cursor-pointer text-secondary-foreground">
                              <RotateCcw className="w-4 h-4" /> <span className="font-sans">Reactivate Membership</span>
                            </DropdownMenuItem>
                          )}
                          {!user.isAdmin && (
                            <>
                              <DropdownMenuSeparator className="my-2 opacity-30" />
                              <DropdownMenuItem onClick={() => setDeleteUser(user)} className="rounded-lg h-10 gap-3 cursor-pointer text-destructive">
                                <Trash2 className="w-4 h-4" /> <span className="font-sans">Erase from Registry</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialogs */}
      <UserDetailDialog open={!!detailUserId} onClose={() => setDetailUserId(null)} userId={detailUserId} />
      <MarkPaidUserDialog open={!!markPaidUser} onClose={() => setMarkPaidUser(null)} user={markPaidUser} onPaid={refresh} />
      <ChangePlanDialog open={!!changePlanUser} onClose={() => setChangePlanUser(null)} user={changePlanUser} onChange={refresh} />
      <SuspendUserDialog open={!!suspendUser} onClose={() => setSuspendUser(null)} user={suspendUser} onSuspend={refresh} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-border/30 p-10">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-3xl text-destructive italic leading-tight">Erase Identity?</AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-muted-foreground leading-relaxed mt-4">
              This will permanently purge <strong>{deleteUser?.email}</strong> and all associated historical records from the Payo registry. This curation is absolute.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-8 gap-4">
            <AlertDialogCancel className="rounded-full border-border/30 font-bold uppercase tracking-widest text-[10px] px-8 h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!actionLoading}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-full font-bold uppercase tracking-widest text-[10px] px-8 h-12 flex-1"
            >
              {actionLoading ? 'Purging...' : 'Confirm Erasure'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
