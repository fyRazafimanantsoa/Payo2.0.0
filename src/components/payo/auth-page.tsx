'use client'

import { useState } from 'react'
import { usePayoStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, DollarSign, Mail, Lock, Building2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

const TONE_OPTIONS = [
  {
    value: 'friendly',
    label: 'Friendly',
    emoji: '😊',
    description: 'Warm, polite reminders',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  {
    value: 'neutral',
    label: 'Neutral',
    emoji: '💼',
    description: 'Professional & direct',
    className: 'border-slate-300 bg-slate-50 text-slate-700 ring-slate-200',
  },
  {
    value: 'firm',
    label: 'Firm',
    emoji: '⚡',
    description: 'Urgent, strong tone',
    className: 'border-red-300 bg-red-50 text-red-700 ring-red-200',
  },
]

export function AuthPage() {
  const { login, register, setCurrentView } = usePayoStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm_password: '',
    business_name: '',
    default_reminder_tone: 'friendly',
  })

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      await login(form.email, form.password, rememberMe)
      toast.success('Welcome back to Payo')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Access denied'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.business_name) {
      toast.error('Please fill in all required fields')
      return
    }
    if (form.password.length < 8) {
      toast.error('Security requires at least 8 characters')
      return
    }
    if (form.password !== form.confirm_password) {
      toast.error('Security codes do not match')
      return
    }
    setLoading(true)
    try {
      await register({
        email: form.email,
        password: form.password,
        business_name: form.business_name,
        default_reminder_tone: form.default_reminder_tone,
      })
      toast.success('Membership initiated. Please verify your email.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Membership initiation failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FDF8F5]">
      {/* Decorative Branding Side */}
      <div className="hidden md:flex md:w-1/2 bg-primary flex-col justify-between p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-white blur-[120px]"></div>
          <div className="absolute bottom-[-10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[#A56350] blur-[120px]"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
              <span className="font-serif italic text-white font-bold">A</span>
            </div>
            <span className="font-serif text-2xl text-white tracking-tight">Payo</span>
          </div>
          <h2 className="font-serif text-6xl text-white leading-tight font-light mb-8">
            Curating your <br/><span className="italic">financial legacy.</span>
          </h2>
          <p className="font-sans text-white/60 text-lg max-w-sm leading-relaxed">
            Automated, elegant invoice follow-ups for the modern professional. Join our private network of curators today.
          </p>
        </div>

        <div className="relative z-10 mt-auto">
          <p className="font-sans text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">
            Established MMXVI • Private Wealth Suite
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-sm space-y-10">
          <div className="text-center md:text-left">
            <h1 className="font-serif text-4xl text-foreground mb-3 font-normal">
              {mode === 'login' ? 'Sign in to Payo' : 'Initiate Membership'}
            </h1>
            <p className="font-sans text-sm text-muted-foreground uppercase tracking-widest font-bold">
              {mode === 'login' ? 'Welcome back, Curator' : 'Redefine your follow-up experience'}
            </p>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1" htmlFor="email">Identity Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@payo.com"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="pl-12 h-12 bg-white border-border/30 rounded-xl focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                    autoComplete="email"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1" htmlFor="business_name">Practice Name</Label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="business_name"
                      placeholder="Your professional practice"
                      value={form.business_name}
                      onChange={(e) => updateField('business_name', e.target.value)}
                      className="pl-12 h-12 bg-white border-border/30 rounded-xl focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1" htmlFor="password">Security Code</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="pl-12 pr-12 h-12 bg-white border-border/30 rounded-xl focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1" htmlFor="confirm">Verify Code</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="confirm"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={form.confirm_password}
                        onChange={(e) => updateField('confirm_password', e.target.value)}
                        className="pl-12 h-12 bg-white border-border/30 rounded-xl focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Primary Tone Palette</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {TONE_OPTIONS.map((tone) => (
                        <button
                          key={tone.value}
                          type="button"
                          onClick={() => updateField('default_reminder_tone', tone.value)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300 ${
                            form.default_reminder_tone === tone.value
                              ? 'bg-secondary border-secondary-foreground/20 text-secondary-foreground shadow-sm'
                              : 'bg-white border-border/20 text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          <span className="text-xl">{tone.emoji}</span>
                          <span className="font-sans text-[9px] font-bold uppercase tracking-tight">{tone.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {mode === 'login' && (
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="rounded-md border-border/50 text-primary focus:ring-primary/20"
                />
                <Label htmlFor="remember-me" className="text-xs font-bold text-muted-foreground cursor-pointer hover:text-foreground transition-colors uppercase tracking-widest">
                  Persistent Access
                </Label>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full h-12 font-sans text-sm font-bold uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Request Entry' : 'Register Practice'}
            </button>

            <div className="text-center pt-4">
              <p className="font-sans text-xs text-muted-foreground uppercase tracking-widest">
                {mode === 'login' ? "New Curator?" : "Existing Curator?"}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login')
                    setForm({ email: '', password: '', confirm_password: '', business_name: '', default_reminder_tone: 'friendly' })
                  }}
                  className="text-primary hover:text-primary/80 font-bold ml-1 transition-colors"
                >
                  {mode === 'login' ? 'Initiate Account' : 'Sign In'}
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
