'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePayoStore } from '@/lib/store'
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
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const ACTION_STYLES: Record<string, { color: string; label: string }> = {
  suspend_user: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Suspend' },
  reactivate_user: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Reactivate' },
  mark_paid: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Mark Paid' },
  send_reminder: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Reminder' },
  change_plan: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Plan Change' },
  delete_user: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Delete' },
}

export function AdminLogsView() {
  const { adminLogs, fetchAdminLogs } = usePayoStore()
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')

  const loadLogs = useCallback(async (filter?: string) => {
    setLoading(true)
    await fetchAdminLogs({ action: filter || undefined })
    setLoading(false)
  }, [fetchAdminLogs])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const handleFilterChange = (value: string) => {
    const filter = value === 'all' ? '' : value
    setActionFilter(filter)
    loadLogs(filter)
  }

  return (
    <div className="space-y-10 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-serif italic text-primary leading-tight">Registry Audit Trail</h2>
        <p className="text-muted-foreground mt-2 font-sans text-sm font-medium uppercase tracking-[0.2em]">
          Examining {adminLogs.length} historical curatorial events
        </p>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4 p-6 bg-white rounded-3xl border border-border/20 shadow-sm items-center max-w-2xl">
        <Select value={actionFilter || 'all'} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-full sm:w-64 h-12 rounded-xl border-border/30 bg-muted/10 font-sans text-[10px] font-bold uppercase tracking-widest">
            <SelectValue placeholder="FILTER ACTIONS" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl font-sans text-[10px] font-bold uppercase tracking-widest">
            <SelectItem value="all">ALL ACTIONS</SelectItem>
            <SelectItem value="suspend_user">SUSPEND</SelectItem>
            <SelectItem value="reactivate_user">REACTIVATE</SelectItem>
            <SelectItem value="mark_paid">MARK PAID</SelectItem>
            <SelectItem value="send_reminder">SEND REMINDER</SelectItem>
            <SelectItem value="change_plan">CHANGE PLAN</SelectItem>
            <SelectItem value="delete_user">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <button 
          onClick={() => loadLogs(actionFilter)} 
          className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Logs Directory */}
      <div className="bg-white rounded-[2rem] border border-border/20 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/5 border-b border-border/10">
                <TableHead className="px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Temporal Event</TableHead>
                <TableHead className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Curator</TableHead>
                <TableHead className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Action Type</TableHead>
                <TableHead className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Target Identity</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] hidden xl:table-cell">Contextual Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/5">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j} className="px-8 py-6"><Skeleton className="h-4 w-24 rounded-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : adminLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-24 font-serif italic text-muted-foreground text-lg">
                    The audit trail remains silent.
                  </TableCell>
                </TableRow>
              ) : (
                adminLogs.map((log) => {
                  const style = ACTION_STYLES[log.action] || {
                    color: 'bg-muted text-muted-foreground border-border/30',
                    label: log.action,
                  }

                  return (
                    <tr key={log.id} className="hover:bg-muted/5 transition-colors group border-b border-border/5">
                      <td className="px-8 py-6 whitespace-nowrap font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-60">
                        {formatDistanceToNow(new Date(log.performedAt), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-6 font-sans text-[11px] font-bold text-foreground">
                        {log.adminEmail}
                      </td>
                      <td className="px-6 py-6">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${style.color}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                          <span className="font-sans text-sm font-bold text-foreground">{log.targetEmail}</span>
                          <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{log.targetBusinessName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 hidden xl:table-cell">
                        <p className="font-serif italic text-xs text-muted-foreground max-w-xs truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                          {log.notes || "No additional curatorial context provided."}
                        </p>
                      </td>
                    </tr>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
