'use client'

import { useEffect } from 'react'
import { usePayoStore } from '@/lib/store'
import { AuthPage } from '@/components/payo/auth-page'
import { VerifyEmailPage } from '@/components/payo/verify-email-page'
import { AppShell } from '@/components/payo/app-shell'
import { Skeleton } from '@/components/ui/skeleton'

export default function Home() {
  const { user, isLoading, initialize } = usePayoStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  if (!user.emailVerified) {
    return <VerifyEmailPage />
  }

  return <AppShell />
}
