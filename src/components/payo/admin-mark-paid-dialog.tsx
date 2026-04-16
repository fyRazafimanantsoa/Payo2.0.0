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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface MarkPaidDialogProps {
  open: boolean
  onClose: () => void
  userId: string
  userSubscription: {
    id: string
    planType: string
    amount: number
    currency: string
    billingCycle: string
    dueDate: string
    status: string
  } | null
  onPaid: () => void
}

export function MarkPaidDialog({ open, onClose, userId, userSubscription, onPaid }: MarkPaidDialogProps) {
  const [amount, setAmount] = useState(userSubscription?.amount?.toString() || '0')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleMarkPaid = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: userSubscription?.id,
          amount: parseFloat(amount) || undefined,
          notes: notes || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Payment recorded successfully')
        onPaid()
        onClose()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to mark as paid')
      }
    } catch {
      toast.error('Failed to mark as paid')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
          <DialogDescription>
            Record a payment for this user&apos;s subscription.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {userSubscription && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Current Plan:</span> <span className="font-medium">{userSubscription.planType}</span></p>
              <p><span className="text-muted-foreground">Billing Cycle:</span> <span className="font-medium">{userSubscription.billingCycle}</span></p>
              <p><span className="text-muted-foreground">Status:</span> <span className="font-medium">{userSubscription.status}</span></p>
              <p><span className="text-muted-foreground">Due Date:</span> <span className="font-medium">{new Date(userSubscription.dueDate).toLocaleDateString()}</span></p>
            </div>
          )}
          <div>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this payment..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleMarkPaid} disabled={loading || !amount || parseFloat(amount) <= 0}>
            {loading ? 'Recording...' : 'Mark as Paid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
