'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import {
  DollarSign,
  Clock,
  AlertTriangle,
  Users,
  FileText,
  Upload,
  PlayCircle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
} from 'lucide-react'
import { usePayoStore } from '@/lib/store'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { InvoiceFormDialog } from './invoice-form-dialog'
import { CsvImportDialog } from './csv-import-dialog'
import { formatCurrency } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-primary/5 text-primary border-primary/20' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue_1: { label: 'Overdue', className: 'bg-destructive/5 text-destructive border-destructive/20' },
  overdue_2: { label: 'Very Overdue', className: 'bg-destructive/10 text-destructive border-destructive/30 animate-pulse' },
  pending_confirmation: { label: 'Confirming', className: 'bg-secondary text-secondary-foreground border-secondary-foreground/20 animate-pulse' },
  paid: { label: 'Paid', className: 'bg-secondary text-secondary-foreground border-secondary-foreground/20' },
  uncollectible: { label: 'Uncollectible', className: 'bg-muted text-muted-foreground border-border/20' },
}

const REMINDER_LOG_STATUS: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  sent: { icon: CheckCircle2, label: 'Sent', className: 'text-secondary-foreground' },
  failed: { icon: XCircle, label: 'Failed', className: 'text-destructive' },
  bounced: { icon: AlertCircle, label: 'Bounced', className: 'text-amber-600' },
}

export function DashboardView() {
  const { setCurrentView, setSelectedInvoiceId, fetchStats, stats, user } = usePayoStore()
  const [loading, setLoading] = useState(true)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [cronLoading, setCronLoading] = useState(false)

  const loadStats = useCallback(async () => {
    setLoading(true)
    await fetchStats()
    setLoading(false)
  }, [fetchStats])

  const handleInvoiceClick = (id: string) => {
    setSelectedInvoiceId(id)
    setCurrentView('invoices')
  }

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleRunCron = async () => {
    setCronLoading(true)
    try {
      const res = await fetch('/api/cron/process', { method: 'POST' })
      if (res.ok) {
        toast.success('Cron job executed successfully')
        loadStats()
      } else {
        toast.error('Failed to run cron job')
      }
    } catch {
      toast.error('Failed to run cron job')
    } finally {
      setCronLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-12">
        <div className="max-w-2xl">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="col-span-1 md:col-span-2 h-48 rounded-[1.5rem]" />
          <Skeleton className="h-48 rounded-[1.5rem]" />
          <Skeleton className="h-48 rounded-[1.5rem]" />
        </div>
      </div>
    )
  }

  const deliveredCount = (stats?.deliveredRemindersThisWeek || 0) + (stats?.paidThisMonthCount || 0)
  const failedCount = stats?.failedRemindersThisWeek || 0
  const successRate = deliveredCount + failedCount > 0 
    ? Math.round((deliveredCount / (deliveredCount + failedCount)) * 100)
    : 100

  return (
    <div className="space-y-12 pb-12">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
        <div className="max-w-2xl">
          <p className="font-sans text-sm text-primary mb-2 tracking-wide font-bold uppercase">Overview</p>
          <h2 className="font-serif text-5xl font-normal text-foreground leading-tight tracking-tight">
            Welcome back, {user?.businessName.split(' ')[0]}.
          </h2>
          <p className="font-sans text-base text-muted-foreground mt-3 leading-relaxed">
            The portfolio is performing steadily today. {stats?.awaitingConfirmation || 0} pending confirmations require your attention.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => setInvoiceDialogOpen(true)} 
            className="btn-primary px-6 py-2.5 font-sans text-sm font-bold flex items-center gap-2 shadow-[0_12px_32_rgba(136,75,58,0.15)]"
          >
            <FileText className="w-4 h-4" /> New Invoice
          </button>
          <button 
            onClick={() => setCsvDialogOpen(true)}
            className="btn-secondary px-6 py-2.5 font-sans text-sm font-bold flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Export Ledger
          </button>
          <button 
            onClick={handleRunCron} 
            disabled={cronLoading}
            className="h-10 px-4 rounded-lg border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all font-sans text-sm font-bold flex items-center gap-2"
          >
            <PlayCircle className={`w-4 h-4 ${cronLoading ? 'animate-spin' : ''}`} /> 
            {cronLoading ? 'Processing...' : 'Run Sync'}
          </button>
        </div>
      </header>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Outstanding Balance */}
        <div className="col-span-1 md:col-span-2 bg-muted/30 rounded-[1.5rem] p-8 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 border border-border/20 group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-sm text-muted-foreground font-bold uppercase tracking-wider">Outstanding Balance</h3>
              <DollarSign className="w-5 h-5 text-primary/50" />
            </div>
            <p className="font-serif text-[3.5rem] leading-none text-foreground font-light tracking-tight">
              {formatCurrency(stats?.totalOutstanding || 0)}
              <span className="text-2xl text-muted-foreground/30 ml-1">.00</span>
            </p>
          </div>
          <div className="mt-8 flex items-center gap-3">
            <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 uppercase tracking-tighter">
              <TrendingUp className="w-3 h-3" />
              Stable
            </span>
            <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Current Portfolio Value</span>
          </div>
        </div>

        {/* Overdue Total */}
        <div className="col-span-1 bg-muted/30 rounded-[1.5rem] p-8 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 border border-border/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-sm text-muted-foreground font-bold uppercase tracking-wider">Overdue</h3>
              <AlertTriangle className="w-5 h-5 text-destructive/50" />
            </div>
            <p className="font-serif text-3xl leading-none text-foreground font-normal tracking-tight">
              {stats?.overdueCount || 0} <span className="text-lg text-muted-foreground/50 font-sans uppercase font-bold tracking-widest ml-1">Items</span>
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <span className="bg-destructive/10 text-destructive px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 uppercase tracking-tighter">
              Action Required
            </span>
          </div>
        </div>

        {/* Paid This Month */}
        <div className="col-span-1 bg-muted/30 rounded-[1.5rem] p-8 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 border border-border/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-sm text-muted-foreground font-bold uppercase tracking-wider">Collected</h3>
              <CheckCircle2 className="w-5 h-5 text-secondary-foreground/50" />
            </div>
            <p className="font-serif text-3xl leading-none text-foreground font-normal tracking-tight">
              {formatCurrency(stats?.paidThisMonthAmount || 0)}
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 uppercase tracking-tighter">
              {stats?.paidThisMonthCount || 0} Invoices
            </span>
          </div>
        </div>

        {/* Pending Confirmation */}
        <div className="col-span-1 md:col-span-2 bg-muted/30 rounded-[1.5rem] p-8 flex items-center justify-between transition-transform duration-300 hover:-translate-y-1 border border-border/20">
          <div>
            <h3 className="font-sans text-sm text-muted-foreground font-bold uppercase tracking-wider mb-2">Awaiting Review</h3>
            <p className="font-serif text-4xl leading-none text-foreground font-normal tracking-tight">
              {stats?.awaitingConfirmation || 0} <span className="text-xl text-muted-foreground font-sans uppercase font-bold tracking-widest">Confirmations</span>
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Delivery Health */}
        <div className="col-span-1 md:col-span-2 bg-muted/30 rounded-[1.5rem] p-8 flex flex-col justify-center transition-transform duration-300 hover:-translate-y-1 border border-border/20">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h3 className="font-sans text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Delivery Health</h3>
              <p className="font-serif text-2xl text-foreground leading-none">{successRate}% Success Rate</p>
            </div>
            <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Last 7 Days</span>
          </div>
          <div className="h-2 w-full bg-input rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-1000" 
              style={{ width: `${successRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Asymmetrical Layout: Recent Invoices & Plan Context */}
      <div className="flex flex-col lg:flex-row gap-16">
        {/* Recent Invoices Feed */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-8 border-b border-border/30 pb-4">
            <h2 className="font-serif text-3xl text-foreground font-normal">Recent Invoices</h2>
            <button 
              onClick={() => setCurrentView('invoices')}
              className="font-sans text-xs text-primary font-bold uppercase tracking-widest hover:opacity-80 transition-all"
            >
              View Full Ledger →
            </button>
          </div>
          
          <div className="space-y-1">
            {(!stats?.recentInvoices || stats.recentInvoices.length === 0) ? (
              <div className="py-12 text-center bg-muted/10 rounded-3xl border border-dashed border-border/50">
                <FileText className="w-8 h-8 mx-auto mb-3 opacity-20 text-primary" />
                <p className="font-serif italic text-muted-foreground">The ledger is currently empty.</p>
              </div>
            ) : (
              stats.recentInvoices.slice(0, 5).map((inv) => (
                <div 
                  key={inv.id}
                  onClick={() => handleInvoiceClick(inv.id)}
                  className="group flex items-center gap-6 p-5 rounded-2xl hover:bg-muted/50 transition-all duration-300 cursor-pointer border border-transparent hover:border-border/30"
                >
                  <div className="w-12 h-12 rounded-full bg-input flex items-center justify-center flex-shrink-0 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-base font-bold text-foreground truncate">{inv.client?.name || 'Private Client'}</p>
                    <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider font-medium truncate">
                      {inv.invoiceNumber} • {inv.dueDate ? format(new Date(inv.dueDate), 'MMM d, yyyy') : 'No date'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-serif text-xl text-foreground">{formatCurrency(inv.amountDue, inv.currency)}</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        inv.currentStatus === 'paid' ? 'bg-secondary-foreground' : 
                        inv.currentStatus.includes('overdue') ? 'bg-destructive' : 'bg-amber-500'
                      }`} />
                      <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        {inv.currentStatus.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Plan Context & Sidebar Info */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-8">
          <div className="bg-muted/30 rounded-[2rem] p-8 border border-border/20 relative overflow-hidden group">
            {/* Subtle paper texture effect could go here */}
            <h3 className="font-serif text-2xl text-foreground mb-4 italic">Curate Your Workflow</h3>
            <p className="font-sans text-sm text-muted-foreground mb-8 leading-relaxed">
              Automate your reminders to ensure elegant, timely follow-ups without manual intervention.
            </p>
            <button 
              onClick={() => setCurrentView('templates')}
              className="w-full text-left bg-background rounded-2xl p-5 flex items-center gap-4 group-hover:bg-muted transition-all duration-300 shadow-sm border border-border/20 group/btn"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover/btn:bg-primary group-hover/btn:text-white transition-all">
                <Palette className="w-5 h-5 text-primary group-hover/btn:text-inherit" />
              </div>
              <div>
                <p className="font-sans text-sm font-bold text-foreground">Template Studio</p>
                <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Refine your voice</p>
              </div>
            </button>
          </div>

          <div className="px-4">
            <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest mb-6 font-bold">Portfolio Insights</p>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-xs text-muted-foreground font-bold uppercase tracking-wider">Client Retention</span>
                  <span className="font-serif text-sm italic">94%</span>
                </div>
                <div className="h-1 w-full bg-input rounded-full overflow-hidden">
                  <div className="h-full bg-secondary-foreground w-[94%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-xs text-muted-foreground font-bold uppercase tracking-wider">Plan Usage</span>
                  <span className="font-serif text-sm italic">
                    {stats?.planUsage?.invoices.current || 0}/{stats?.planUsage?.invoices.max === 999999 ? '∞' : stats?.planUsage?.invoices.max || 20}
                  </span>
                </div>
                <div className="h-1 w-full bg-input rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${Math.min(100, ((stats?.planUsage?.invoices.current || 0) / (stats?.planUsage?.invoices.max || 20)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <InvoiceFormDialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen} onSuccess={loadStats} />
      <CsvImportDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} onSuccess={loadStats} />
    </div>
  )
}
