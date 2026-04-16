'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  Settings,
  User,
  Lock,
  CreditCard,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Save,
  Globe,
  MessageSquare,
} from 'lucide-react'
import { usePayoStore } from '@/lib/store'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { differenceInDays } from 'date-fns'

const TONE_OPTIONS = [
  { value: 'friendly', label: 'Friendly', emoji: '😊', className: 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { value: 'neutral', label: 'Neutral', emoji: '💼', className: 'border-slate-300 bg-slate-50 text-slate-700 ring-slate-200' },
  { value: 'firm', label: 'Firm', emoji: '⚡', className: 'border-red-300 bg-red-50 text-red-700 ring-red-200' },
]

const LOCALE_OPTIONS = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'de-DE', label: 'German' },
  { value: 'fr-FR', label: 'French' },
  { value: 'es-ES', label: 'Spanish' },
]

export function SettingsView() {
  const { user, initialize, fetchStats, stats } = usePayoStore()
  const [loading, setLoading] = useState(false)

  // Account info
  const [businessName, setBusinessName] = useState(user?.businessName || '')
  const [locale, setLocale] = useState(user?.locale || 'en-US')
  const [invoicePattern, setInvoicePattern] = useState(user?.invoicePattern || 'INV-{{YEAR}}-{{ID}}')

  // Change password
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Reminder tone
  const [reminderTone, setReminderTone] = useState(user?.defaultReminderTone || 'friendly')

  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleSaveAccount = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          locale,
          invoicePattern,
        }),
      })
      if (res.ok) {
        toast.success('Preferences preserved')
        await initialize()
        fetchStats()
      } else {
        const data = await res.json()
        toast.error('Failed to update preferences', { description: data.error })
      }
    } catch {
      toast.error('Connection failure')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in current and new password')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Security requires at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Security codes do not match')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })
      if (res.ok) {
        toast.success('Security code updated')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await res.json()
        toast.error('Security update failed', { description: data.error })
      }
    } catch {
      toast.error('Connection failure')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTone = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultReminderTone: reminderTone,
        }),
      })
      if (res.ok) {
        toast.success('Signature tone updated')
        await initialize()
      } else {
        const data = await res.json()
        toast.error('Failed to update tone', { description: data.error })
      }
    } catch {
      toast.error('Connection failure')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user?.email) {
      toast.error('Identification mismatch')
      return
    }
    setDeleting(true)
    try {
      const res = await fetch('/api/user', { method: 'DELETE' })
      if (res.ok) {
        toast.success('Membership terminated')
        const { logout } = usePayoStore.getState()
        logout()
      } else {
        const data = await res.json()
        toast.error('Termination failed', { description: data.error })
      }
    } catch {
      toast.error('Connection failure')
    } finally {
      setDeleting(false)
    }
  }

  if (!user) return null

  const planLabel = user.planType === 'trial'
    ? `Trial Identity`
    : user.planType.charAt(0).toUpperCase() + user.planType.slice(1) + ' Curator'

  const trialDaysLeft = user.trialEndsAt ? differenceInDays(new Date(user.trialEndsAt), new Date()) : null

  return (
    <div className="space-y-16 max-w-4xl pb-24">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-serif italic text-primary leading-tight">Preferences</h2>
        <p className="text-muted-foreground mt-2 font-sans text-sm font-medium uppercase tracking-[0.2em]">
          Curating your professional environment
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left Side: Forms */}
        <div className="lg:col-span-8 space-y-16">
          {/* Identity & Locale */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-border/30" />
              <h3 className="font-serif text-xl italic text-primary shrink-0">Identity & Locale</h3>
              <div className="h-px flex-1 bg-border/30" />
            </div>
            
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Business Name</Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your professional practice"
                  className="h-12 bg-white border-border/30 rounded-xl focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Statement Pattern</Label>
                  <Input
                    value={invoicePattern}
                    onChange={(e) => setInvoicePattern(e.target.value)}
                    placeholder="INV-{{YEAR}}-{{ID}}"
                    className="h-12 bg-white border-border/30 rounded-xl focus:ring-primary/10 focus:border-primary transition-all shadow-sm font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Portfolio Locale</Label>
                  <Select value={locale} onValueChange={setLocale}>
                    <SelectTrigger className="h-12 bg-white border-border/30 rounded-xl font-sans text-xs font-bold uppercase tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl font-sans text-xs font-bold uppercase tracking-widest">
                      {LOCALE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <button onClick={handleSaveAccount} disabled={loading} className="btn-primary px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Preserve Preferences
            </button>
          </section>

          {/* Tone Signature */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-border/30" />
              <h3 className="font-serif text-xl italic text-primary shrink-0">Default Signature Tone</h3>
              <div className="h-px flex-1 bg-border/30" />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.value}
                  type="button"
                  onClick={() => setReminderTone(tone.value)}
                  className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all duration-500 ${
                    reminderTone === tone.value
                      ? 'bg-secondary border-secondary-foreground/20 text-secondary-foreground shadow-inner scale-[1.02]'
                      : 'bg-white border-border/20 text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <span className="text-3xl">{tone.emoji}</span>
                  <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em]">{tone.label}</span>
                </button>
              ))}
            </div>
            <button onClick={handleSaveTone} disabled={loading || reminderTone === user.defaultReminderTone} className="btn-primary px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all text-xs uppercase tracking-widest">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Update Signature Tone
            </button>
          </section>

          {/* Security */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-border/30" />
              <h3 className="font-serif text-xl italic text-primary shrink-0">Access Security</h3>
              <div className="h-px flex-1 bg-border/30" />
            </div>
            
            <div className="space-y-6 bg-white p-8 rounded-[2rem] border border-border/20 shadow-sm">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Current Security Code</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current code"
                    className="pl-12 pr-12 h-12 bg-muted/10 border-border/30 rounded-xl"
                  />
                  <button onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">New Security Code</Label>
                  <Input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 chars"
                    className="h-12 bg-muted/10 border-border/30 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Verify New Code</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new code"
                    className="h-12 bg-muted/10 border-border/30 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={handleChangePassword} disabled={loading || !currentPassword || !newPassword} className="btn-primary px-8 py-3 rounded-full font-bold shadow-lg transition-all text-xs uppercase tracking-widest">
                  Change Security Code
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Side: Account Overview & Actions */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-primary p-8 rounded-[2.5rem] text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700">
              <CreditCard className="w-24 h-24" />
            </div>
            <p className="font-sans text-[10px] uppercase font-bold tracking-[0.3em] text-white/60 mb-2">Active Plan</p>
            <h4 className="font-serif text-3xl mb-1">{planLabel}</h4>
            {user.planType === 'trial' && trialDaysLeft !== null && (
              <p className="text-xs text-white/80 italic mb-8">
                {trialDaysLeft > 0 ? `${trialDaysLeft} cycles remaining` : 'Trial concluded'}
              </p>
            )}
            
            <div className="space-y-6 mt-8">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/60">
                  <span>Client Relations</span>
                  <span>{stats?.planUsage?.clients.current} / {stats?.planUsage?.clients.max === 999999 ? '∞' : stats?.planUsage?.clients.max}</span>
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-1/2 rounded-full" style={{ width: `${Math.min(100, ((stats?.planUsage?.clients.current || 0) / (stats?.planUsage?.clients.max || 10)) * 100)}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/60">
                  <span>Ledger Capacity</span>
                  <span>{stats?.planUsage?.invoices.current} / {stats?.planUsage?.invoices.max === 999999 ? '∞' : stats?.planUsage?.invoices.max}</span>
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-1/3 rounded-full" style={{ width: `${Math.min(100, ((stats?.planUsage?.invoices.current || 0) / (stats?.planUsage?.invoices.max || 20)) * 100)}%` }} />
                </div>
              </div>
            </div>

            <button onClick={() => toast.info('Direct inquiry required for tier elevation.')} className="w-full mt-10 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
              Elevate Membership
            </button>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-border/20 shadow-sm space-y-6">
            <h4 className="font-serif text-lg italic text-primary">Portfolio History</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary-foreground mt-1.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">Membership Initiated</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-destructive/5 p-8 rounded-[2rem] border border-destructive/10 space-y-4">
            <h4 className="font-serif text-lg italic text-destructive">Danger Zone</h4>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
              Permanent dissolution of your professional identity and historical ledger.
            </p>
            <button onClick={() => setDeleteDialogOpen(true)} className="w-full py-3 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/20 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
              Terminate Membership
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirm Dialog Redesign */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/30 max-w-md p-10">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-3xl text-destructive italic leading-tight">Terminate Identity?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-6 mt-4">
                <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                  This action will permanently erase your practice, client relations, and financial records from Payo. This curation is final.
                </p>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Identify your email to confirm</Label>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={user.email}
                    className="h-12 bg-white border-border/30 rounded-xl"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-8 gap-4">
            <AlertDialogCancel onClick={() => { setDeleteConfirmText(''); setDeleteDialogOpen(false) }} className="rounded-full border-border/30 font-bold uppercase tracking-widest text-[10px] px-8 h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== user.email}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-full font-bold uppercase tracking-widest text-[10px] px-8 h-12 flex-1"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Dissolution"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
