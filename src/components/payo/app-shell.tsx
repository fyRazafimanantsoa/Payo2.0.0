'use client'

import { useState } from 'react'
import { usePayoStore, type ViewType } from '@/lib/store'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  DollarSign,
  LayoutDashboard,
  FileText,
  Users,
  Palette,
  Settings,
  LogOut,
  AlertTriangle,
  ShieldAlert,
  Lock,
  X,
  Shield,
  ClipboardList,
  ScrollText,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { differenceInDays } from 'date-fns'
import { DashboardView } from './dashboard-view'
import { InvoicesView } from './invoices-view'
import { ClientsView } from './clients-view'
import { TemplateStudio } from './template-studio'
import { SettingsView } from './settings-view'
import { AdminDashboardView } from './admin-dashboard-view'
import { AdminUsersView } from './admin-users-view'
import { AdminLogsView } from './admin-logs-view'

const NAV_ITEMS: Array<{ view: ViewType; label: string; icon: React.ElementType }> = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'invoices', label: 'Invoices', icon: FileText },
  { view: 'clients', label: 'Clients', icon: Users },
  { view: 'templates', label: 'Templates', icon: Palette },
  { view: 'settings', label: 'Settings', icon: Settings },
]

const ADMIN_NAV_ITEMS: Array<{ view: ViewType; label: string; icon: React.ElementType }> = [
  { view: 'admin-dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
  { view: 'admin-users', label: 'All Users', icon: ClipboardList },
  { view: 'admin-logs', label: 'Admin Logs', icon: ScrollText },
]

const VIEW_TITLES: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  invoices: 'Invoices',
  clients: 'Clients',
  templates: 'Template Studio',
  settings: 'Settings',
  login: 'Login',
  register: 'Register',
  'verify-email': 'Verify Email',
  'admin-dashboard': 'Admin Dashboard',
  'admin-users': 'User Management',
  'admin-logs': 'Admin Logs',
}

function PlanBanner({ user, stats }: { user: NonNullable<ReturnType<typeof usePayoStore.getState>['user']>; stats: ReturnType<typeof usePayoStore.getState>['stats'] }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  if (!stats?.graceBanner) return null
  const banner = stats.graceBanner

  // Suspended — full lockout
  if (user.subscriptionStatus === 'suspended') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <Lock className="w-5 h-5 text-red-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800">Account Suspended</p>
          <p className="text-xs text-red-600">Your account has been suspended. Please contact support to reactivate.</p>
        </div>
      </div>
    )
  }

  // Unverified email
  if (!user.emailVerified) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">Email not verified</p>
          <p className="text-xs text-amber-600">Some features may be limited until you verify your email.</p>
        </div>
      </div>
    )
  }

  // Trial expired
  if (banner.type === 'trial_expired') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800">Trial Expired</p>
          <p className="text-xs text-red-600 mb-2">{banner.message}</p>
          <p className="text-xs font-medium text-red-700">
            To upgrade and keep your data, contact <a href="mailto:mananarazafy1@gmail.com" className="underline font-bold">mananarazafy1@gmail.com</a>
          </p>
        </div>
      </div>
    )
  }

  // Trial expiring (3 days or less)
  if (banner.type === 'trial_expiring') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-yellow-800">Trial Expiring Soon</p>
          <p className="text-xs text-yellow-700 mb-2">{banner.message}</p>
          <p className="text-xs font-medium text-yellow-800">
            Upgrade now by contacting <a href="mailto:mananarazafy1@gmail.com" className="underline font-bold">mananarazafy1@gmail.com</a>
          </p>
        </div>
      </div>
    )
  }

  // Trial warning (7 days or less)
  if (banner.type === 'trial_warning') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-yellow-800">Trial Period Active</p>
          <p className="text-xs text-yellow-700">{banner.message}</p>
        </div>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-yellow-400 hover:text-yellow-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return null
}

export function AppShell() {
  const { currentView, setCurrentView, user, stats, logout } = usePayoStore()

  if (!user) return null

  const initials = user.businessName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const planLabel = user.planType === 'trial'
    ? `Trial${user.trialEndsAt ? ` (${Math.max(0, differenceInDays(new Date(user.trialEndsAt), new Date()))}d left)` : ''}`
    : user.planType.charAt(0).toUpperCase() + user.planType.slice(1)

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />
      case 'invoices':
        return <InvoicesView />
      case 'clients':
        return <ClientsView />
      case 'templates':
        return <TemplateStudio />
      case 'settings':
        return <SettingsView />
      case 'admin-dashboard':
        return <AdminDashboardView />
      case 'admin-users':
        return <AdminUsersView />
      case 'admin-logs':
        return <AdminLogsView />
      default:
        return <DashboardView />
    }
  }

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-border/30 bg-muted/50">
        <SidebarHeader className="pt-12 pb-8 px-6">
          <div className="flex items-center gap-4 mb-8 px-2">
            <div className="bg-primary/10 rounded-full p-2">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground tracking-tight">Payo</h1>
              <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Payo Edition</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-4">
          <SidebarGroup>
            <SidebarMenu className="gap-2">
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton
                    isActive={currentView === item.view}
                    onClick={() => setCurrentView(item.view)}
                    className={`h-12 px-4 rounded-full transition-all duration-300 ${
                      currentView === item.view
                        ? 'bg-secondary text-secondary-foreground font-semibold scale-100 shadow-sm'
                        : 'text-muted-foreground hover:bg-input/50 hover:text-foreground scale-95 hover:scale-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-sans text-sm">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {user.isAdmin && (
            <>
              <SidebarSeparator className="my-4 mx-4" />
              <SidebarGroup>
                <SidebarGroupLabel className="px-6 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-2">Admin Panel</SidebarGroupLabel>
                <SidebarMenu className="gap-2">
                  {ADMIN_NAV_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.view}>
                      <SidebarMenuButton
                        isActive={currentView === item.view}
                        onClick={() => setCurrentView(item.view)}
                        className={`h-12 px-4 rounded-full transition-all duration-300 ${
                          currentView === item.view
                            ? 'bg-primary/10 text-primary font-semibold scale-100 shadow-sm'
                            : 'text-muted-foreground hover:bg-primary/5 hover:text-primary scale-95 hover:scale-100'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-sans text-sm">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>

        <SidebarFooter className="p-6 mt-auto">
          <SidebarSeparator className="mb-6 opacity-30" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full rounded-xl p-2 hover:bg-input/50 transition-all duration-300 group">
                <Avatar className="w-10 h-10 border-2 border-background shadow-sm transition-transform group-hover:scale-105">
                  <AvatarFallback className={`text-xs font-bold ${user.isAdmin ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                    {initials || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-foreground truncate">{user.businessName}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Curator</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2 rounded-2xl shadow-xl border-border/50 backdrop-blur-xl bg-background/95">
              <div className="px-3 py-3 border-b border-border/30 mb-2">
                <p className="text-sm font-bold text-foreground">{user.businessName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuItem onClick={() => setCurrentView('settings')} className="rounded-lg h-10 gap-3 cursor-pointer">
                <Settings className="w-4 h-4" />
                <span className="font-sans">Preferences</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2 opacity-30" />
              <DropdownMenuItem onClick={logout} className="rounded-lg h-10 gap-3 text-destructive cursor-pointer hover:bg-destructive/10">
                <LogOut className="w-4 h-4" />
                <span className="font-sans">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 bg-background/80 backdrop-blur-xl px-8 border-b border-border/30">
          <SidebarTrigger className="text-muted-foreground hover:text-primary transition-colors" />
          <div className="h-4 w-px bg-border/50" />
          <h2 className="font-serif italic text-xl text-primary">
            {VIEW_TITLES[currentView] || 'Dashboard'}
          </h2>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {user.isAdmin && (
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 gap-1.5 px-3 py-1 font-sans text-[10px] font-bold tracking-widest"
              >
                <Shield className="w-3 h-3" />
                ADMIN
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`font-sans text-[10px] font-bold tracking-widest px-3 py-1 ${
                user.planType === 'trial'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : user.planType === 'pro'
                  ? 'bg-secondary text-secondary-foreground border-secondary/30'
                  : 'bg-muted text-muted-foreground border-border/50'
              }`}
            >
              {planLabel.toUpperCase()}
            </Badge>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-10 py-8">
          <PlanBanner user={user} stats={stats} />
          {renderView()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
