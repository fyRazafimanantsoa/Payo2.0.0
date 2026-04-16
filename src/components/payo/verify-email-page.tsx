'use client'

import { useState } from 'react'
import { usePayoStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, DollarSign, MailCheck, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function VerifyEmailPage() {
  const { user, initialize } = usePayoStore()
  const [verifying, setVerifying] = useState(false)

  const handleVerify = async () => {
    setVerifying(true)
    try {
      const res = await fetch('/api/auth/verify-email', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.verified) {
          toast.success('Email verified! Welcome to Payo.')
          await initialize()
        }
      } else {
        const data = await res.json()
        toast.error('Verification failed', { description: data.error })
      }
    } catch {
      toast.error('Failed to verify email')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Payo</h1>
            <p className="text-xs text-muted-foreground -mt-0.5 font-sans">Automated Invoice Reminders</p>
          </div>
        </div>

        <Card className="border-border shadow-xl shadow-border/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <MailCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Verify your email</CardTitle>
            <CardDescription className="space-y-1">
              <p>We&apos;ve sent a verification email to:</p>
              <p className="font-medium text-foreground">{user?.email}</p>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Please check your inbox and click the verification link. Once verified, you can start using Payo.
            </p>

            <Button
              onClick={handleVerify}
              className="w-full btn-primary"
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  I&apos;ve verified my email
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              This is a demo — click the button above to confirm verification.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
