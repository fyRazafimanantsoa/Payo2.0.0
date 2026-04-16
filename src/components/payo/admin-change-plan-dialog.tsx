'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface ChangePlanDialogProps {
  open: boolean
  onClose: () => void
  userId: string
  currentPlanType: string
  currentBillingCycle: string
  onChange: () => void
}

export function ChangePlanDialog({
  open,
  onClose,
  userId,
  currentPlanType,
  currentBillingCycle,
  onChange,
}: ChangePlanDialogProps) {
  const [planType, setPlanType] = useState(currentPlanType || 'starter')
  const [billingCycle, setBillingCycle] = useState(currentBillingCycle || 'monthly')
  const [loading, setLoading] = useState(false)

  const handleChangePlan = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType, billingCycle }),
      })
      if (res.ok) {
        toast.success('Plan changed successfully')
        onChange()
        onClose()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to change plan')
      }
    } catch {
      toast.error('Failed to change plan')
    } finally {
      setLoading(false)
    }
  }

  const planAmounts: Record<string, Record<string, number>> = {
    starter: { monthly: 9, annual: 90 },
    pro: { monthly: 29, annual: 290 },
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Plan</DialogTitle>
          <DialogDescription>
            Change this user&apos;s subscription plan and billing cycle.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div>
            <Label className="text-sm font-medium mb-2 block">Plan Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {(['starter', 'pro'] as const).map((plan) => (
                <button
                  key={plan}
                  onClick={() => setPlanType(plan)}
                  className={`p-4 rounded-lg border-2 text-center transition-colors ${
                    planType === plan
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold capitalize">{plan}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ${planAmounts[plan]?.monthly}/mo
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Billing Cycle</Label>
            <div className="grid grid-cols-2 gap-3">
              {(['monthly', 'annual'] as const).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`p-4 rounded-lg border-2 text-center transition-colors ${
                    billingCycle === cycle
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold capitalize">{cycle}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ${planAmounts[planType]?.[cycle] || 0}/{cycle === 'monthly' ? 'mo' : 'yr'}
                  </p>
                  {cycle === 'annual' && (
                    <p className="text-xs text-emerald-600 mt-1">Save 2 months</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleChangePlan} disabled={loading}>
            {loading ? 'Changing...' : 'Change Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
