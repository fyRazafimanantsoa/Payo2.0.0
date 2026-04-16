'use client'

import { useEffect, useState } from 'react'
import { usePayoStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  Ban,
  DollarSign,
  Shield,
  Activity,
  RotateCcw,
  Pause,
  CreditCard,
  Mail,
  ArrowRightLeft,
  Trash2,
  Eye,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const ACTION_ICONS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  suspend_user: { icon: Ban, color: 'bg-red-100 text-red-700', label: 'Suspended' },
  reactivate_user: { icon: RotateCcw, color: 'bg-emerald-100 text-emerald-700', label: 'Reactivated' },
  mark_paid: { icon: CreditCard, color: 'bg-green-100 text-green-700', label: 'Marked Paid' },
  send_reminder: { icon: Mail, color: 'bg-blue-100 text-blue-700', label: 'Reminder Sent' },
  change_plan: { icon: ArrowRightLeft, color: 'bg-purple-100 text-purple-700', label: 'Plan Changed' },
  delete_user: { icon: Trash2, color: 'bg-gray-100 text-gray-700', label: 'Deleted' },
}

export function AdminDashboardView() {
  const { adminStats, fetchAdminStats, setCurrentView } = usePayoStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchAdminStats()
      setLoading(false)
    }
    load()
  }, [fetchAdminStats])

  const handleSuspend = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Suspended from Registry Overview - overdue > 30 days' }),
      })
      if (res.ok) {
        await fetchAdminStats()
      }
    } catch {
      // silent
    }
  }

  if (loading || !adminStats) {
    return (
      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-[1.5rem]" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-[2rem]" />
      </div>
    )
  }

  const summaryCards = [
    { title: 'Active Members', value: adminStats.activeUsers, icon: UserCheck, color: 'text-secondary-foreground', bg: 'bg-secondary/20' },
    { title: 'Trial Identities', value: adminStats.trialUsers, icon: Clock, color: 'text-primary', bg: 'bg-primary/5' },
    { title: 'Overdue Cycles', value: adminStats.overdueSubscriptions, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/5' },
    { title: 'Dissolved', value: adminStats.suspendedAccounts, icon: Ban, color: 'text-muted-foreground', bg: 'bg-muted' },
    { title: 'Revenue (MM)', value: `$${adminStats.revenueThisMonth.toFixed(0)}`, icon: DollarSign, color: 'text-foreground', bg: 'bg-white border border-border/20 shadow-sm' },
  ]

  return (
    <div className="space-y-16 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-serif italic text-primary leading-tight">Registry Overview</h2>
        <p className="text-muted-foreground mt-2 font-sans text-sm font-medium uppercase tracking-[0.2em]">
          Monitoring the Payo membership and vitality
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {summaryCards.map((card) => (
          <div key={card.title} className={`${card.bg} rounded-[1.5rem] p-6 flex flex-col justify-between transition-transform hover:-translate-y-1 duration-300`}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{card.title}</span>
              <card.icon className={`w-4 h-4 ${card.color} opacity-40`} />
            </div>
            <p className={`font-serif text-3xl font-normal tracking-tight ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left Side: Needs Review */}
        <div className="lg:col-span-7 space-y-10">
          <div className="flex items-center justify-between border-b border-border/30 pb-4">
            <h3 className="font-serif text-2xl italic text-primary">Needs Curatorial Review</h3>
            <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-3 py-1 rounded-full">
              {adminStats.needsReviewUsers.length} Pending
            </span>
          </div>

          {adminStats.needsReviewUsers.length === 0 ? (
            <div className="py-16 text-center bg-muted/10 rounded-[2rem] border border-dashed border-border/50">
              <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-10 text-primary" />
              <p className="font-serif italic text-muted-foreground text-lg">No identities require attention at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {adminStats.needsReviewUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-6 bg-white rounded-[1.5rem] border border-border/20 hover:border-primary/30 transition-all shadow-sm group">
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm font-bold text-foreground truncate">{u.email}</p>
                    <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest font-medium mt-0.5">{u.businessName}</p>
                  </div>
                  <div className="flex items-center gap-4 ml-6">
                    <span className="text-[10px] font-bold text-destructive uppercase tracking-widest bg-destructive/5 px-2 py-1 rounded-md">
                      {u.daysOverdue}d overdue
                    </span>
                    <button 
                      onClick={() => handleSuspend(u.id)}
                      className="h-9 px-4 rounded-full border border-destructive/20 text-destructive text-[10px] font-bold uppercase tracking-widest hover:bg-destructive hover:text-white transition-all"
                    >
                      Dissolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Recent Activity */}
        <div className="lg:col-span-5 space-y-10">
          <div className="flex items-center justify-between border-b border-border/30 pb-4">
            <h3 className="font-serif text-2xl italic text-primary">Registry Logs</h3>
            <button 
              onClick={() => setCurrentView('admin-logs')}
              className="font-sans text-[9px] font-bold text-primary uppercase tracking-widest hover:opacity-70 transition-all"
            >
              Examine Full Log →
            </button>
          </div>

          <div className="space-y-6">
            {adminStats.recentActions.length === 0 ? (
              <p className="font-serif italic text-muted-foreground py-12 text-center">No recent curatorial actions.</p>
            ) : (
              adminStats.recentActions.map((action) => {
                const actionMeta = ACTION_ICONS[action.action] || { icon: Activity, color: 'bg-muted text-muted-foreground', label: action.action }
                const ActionIcon = actionMeta.icon

                return (
                  <div key={action.id} className="flex items-start gap-4 group">
                    <div className={`w-10 h-10 rounded-full ${actionMeta.color.split(' ')[0]} flex items-center justify-center shrink-0 border border-border/10 shadow-sm`}>
                      <ActionIcon className="w-4 h-4 opacity-70" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-sans text-[11px] font-bold text-foreground">{action.adminEmail.split('@')[0]}</span>
                        <span className="font-sans text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">performed</span>
                        <span className={`font-sans text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${actionMeta.color}`}>{actionMeta.label}</span>
                      </div>
                      <p className="font-serif italic text-xs text-muted-foreground truncate">Target: {action.targetEmail}</p>
                      <p className="font-sans text-[9px] text-muted-foreground uppercase tracking-tighter mt-1 opacity-40">
                        {formatDistanceToNow(new Date(action.performedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
