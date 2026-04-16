import { create } from 'zustand'

export type ViewType =
  | 'login'
  | 'register'
  | 'verify-email'
  | 'dashboard'
  | 'invoices'
  | 'clients'
  | 'templates'
  | 'settings'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-logs'

export interface PayoUser {
  id: string
  email: string
  businessName: string
  defaultReminderTone: string
  planType: string
  subscriptionStatus: string
  trialEndsAt: string | null
  isAdmin: boolean
  emailVerified: boolean
  locale: string
  invoicePattern: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  name: string
  primaryEmail: string
  ccEmails: string
  preferredCurrency: string
  locale: string
  emailStatus: string
  notes: string
  assignedTemplateId: string | null
  outstandingAmount: number
  invoiceCount: number
  createdAt: string
}

export interface Invoice {
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
  client: { id: string; name: string; primaryEmail: string }
  clientName: string
  clientEmail: string
  deliveryBadge: {
    status: string
    label: string
    lastSent: string | null
  }
  daysOverdue: number
}

export interface Template {
  id: string
  type: string
  name: string
  subjectLine: string
  htmlBody: string
  triggerPoint: string
  tone: string
  isActive: boolean
  readOnly: boolean
  createdAt: string
}

export interface DashboardStats {
  totalOutstanding: number
  overdueCount: number
  awaitingConfirmation: number
  paidThisMonthCount: number
  paidThisMonthAmount: number
  failedRemindersThisWeek: number
  deliveredRemindersThisWeek: number
  totalClients: number
  planInfo: {
    planType: string
    subscriptionStatus: string
    isTrial: boolean
    trialEndsAt: string | null
    emailVerified: boolean
  }
  graceBanner: {
    type: string
    message: string
    daysRemaining?: number
    daysOverdue?: number
  } | null
  planUsage: {
    clients: { current: number; max: number }
    invoices: { current: number; max: number }
  }
  actionRequired: Array<{
    id: string
    invoiceNumber: string
    clientName: string
    amountDue: number
    currency: string
    dueDate: string
    daysPending: number
  }>
  recentInvoices: Array<{
    id: string
    invoiceNumber: string
    amountDue: number
    currency: string
    dueDate: string
    currentStatus: string
    client: { name: string }
  }>
  recentReminderLogs: Array<{
    id: string
    invoiceNumber: string
    clientName: string
    triggerPoint: string
    status: string
    sentAt: string
  }>
}

export interface RegisterData {
  email: string
  password: string
  business_name: string
  default_reminder_tone: string
}

// Admin types
export interface AdminStats {
  totalUsers: number
  activeUsers: number
  trialUsers: number
  overdueSubscriptions: number
  suspendedAccounts: number
  revenueThisMonth: number
  needsReview: number
  needsReviewUsers: Array<{
    id: string
    email: string
    businessName: string
    planType: string
    subscriptionStatus: string
    daysOverdue: number
  }>
  recentActions: Array<{
    id: string
    adminEmail: string
    targetEmail: string
    action: string
    previousValue: string | null
    newValue: string | null
    notes: string | null
    performedAt: string
  }>
}

export interface AdminUser {
  id: string
  email: string
  businessName: string
  defaultReminderTone: string
  planType: string
  subscriptionStatus: string
  trialEndsAt: string | null
  isAdmin: boolean
  emailVerified: boolean
  locale: string
  createdAt: string
  updatedAt: string
  client_count: number
  invoice_count: number
  subscription: {
    id: string
    planType: string
    amount: number
    currency: string
    billingCycle: string
    dueDate: string
    status: string
    overdueSince: string | null
    paidAt: string | null
  } | null
}

export interface AdminLog {
  id: string
  adminEmail: string
  adminBusinessName: string
  targetEmail: string
  targetBusinessName: string
  action: string
  previousValue: string | null
  newValue: string | null
  notes: string | null
  performedAt: string
  ipAddress: string | null
}

interface PayoStore {
  // Auth state
  user: PayoUser | null
  isLoading: boolean
  isAuthenticated: boolean

  // Navigation
  currentView: ViewType

  // Data
  clients: Client[]
  invoices: Invoice[]
  templates: Template[]
  stats: DashboardStats | null
  selectedInvoiceId: string | null

  // Admin data
  adminStats: AdminStats | null
  adminUsers: AdminUser[]
  adminLogs: AdminLog[]

  // Auth actions
  initialize: () => Promise<void>
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>

  // Navigation actions
  setCurrentView: (view: ViewType) => void
  setSelectedInvoiceId: (id: string | null) => void

  // Data actions
  fetchClients: () => Promise<void>
  fetchInvoices: () => Promise<void>
  fetchTemplates: () => Promise<void>
  fetchStats: () => Promise<void>

  // Admin data actions
  fetchAdminStats: () => Promise<void>
  fetchAdminUsers: (params?: { search?: string; status?: string; plan?: string }) => Promise<void>
  fetchAdminLogs: (params?: { action?: string; userId?: string }) => Promise<void>
}

export const usePayoStore = create<PayoStore>((set, get) => ({
  // Auth state
  user: null,
  isLoading: true,
  isAuthenticated: false,

  // Navigation
  currentView: 'dashboard',
  selectedInvoiceId: null,

  // Data
  clients: [],
  invoices: [],
  templates: [],
  stats: null,

  // Admin data
  adminStats: null,
  adminUsers: [],
  adminLogs: [],

  // Auth actions
  initialize: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            currentView: 'dashboard',
          })
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false, currentView: 'login' })
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false, currentView: 'login' })
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false, currentView: 'login' })
    }
  },

  login: async (email, password, rememberMe = false) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember_me: rememberMe }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Login failed')
    }

    const data = await res.json()
    set({
      user: data.user,
      isAuthenticated: true,
      currentView: 'dashboard',
    })
  },

  register: async (registerData) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Registration failed')
    }

    const data = await res.json()
    set({
      user: data.user,
      isAuthenticated: true,
      currentView: 'verify-email',
    })
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // silent
    }
    set({
      user: null,
      isAuthenticated: false,
      currentView: 'login',
      clients: [],
      invoices: [],
      templates: [],
      stats: null,
      adminStats: null,
      adminUsers: [],
      adminLogs: [],
    })
  },

  // Navigation actions
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedInvoiceId: (id) => set({ selectedInvoiceId: id }),

  // Data actions
  fetchClients: async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        set({ clients: Array.isArray(data) ? data : [] })
      }
    } catch {
      // silent
    }
  },

  fetchInvoices: async () => {
    try {
      const res = await fetch('/api/invoices')
      if (res.ok) {
        const data = await res.json()
        const invoices = data.data || data.invoices || data || []
        set({ invoices: Array.isArray(invoices) ? invoices : [] })
      }
    } catch {
      // silent
    }
  },

  fetchTemplates: async () => {
    try {
      const res = await fetch('/api/templates')
      if (res.ok) {
        const data = await res.json()
        set({ templates: Array.isArray(data) ? data : [] })
      }
    } catch {
      // silent
    }
  },

  fetchStats: async () => {
    try {
      const res = await fetch('/api/dashboard/stats')
      if (res.ok) {
        const data = await res.json()
        set({ stats: data })
      }
    } catch {
      // silent
    }
  },

  // Admin data actions
  fetchAdminStats: async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        set({ adminStats: data })
      }
    } catch {
      // silent
    }
  },

  fetchAdminUsers: async (params) => {
    try {
      const searchParams = new URLSearchParams()
      if (params?.search) searchParams.set('search', params.search)
      if (params?.status) searchParams.set('status', params.status)
      if (params?.plan) searchParams.set('plan', params.plan)
      const query = searchParams.toString()
      const res = await fetch(`/api/admin/users${query ? `?${query}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        set({ adminUsers: Array.isArray(data) ? data : [] })
      }
    } catch {
      // silent
    }
  },

  fetchAdminLogs: async (params) => {
    try {
      const searchParams = new URLSearchParams()
      if (params?.action) searchParams.set('action', params.action)
      if (params?.userId) searchParams.set('userId', params.userId)
      const query = searchParams.toString()
      const res = await fetch(`/api/admin/logs${query ? `?${query}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        set({ adminLogs: Array.isArray(data) ? data : [] })
      }
    } catch {
      // silent
    }
  },
}))
