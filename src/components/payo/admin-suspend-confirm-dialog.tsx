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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface SuspendConfirmDialogProps {
  open: boolean
  onClose: () => void
  userId: string
  userEmail: string
  businessName: string
  onSuspend: () => void
}

export function SuspendConfirmDialog({
  open,
  onClose,
  userId,
  userEmail,
  businessName,
  onSuspend,
}: SuspendConfirmDialogProps) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSuspend = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || undefined }),
      })
      if (res.ok) {
        toast.success(`${businessName} has been suspended`)
        onSuspend()
        onClose()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to suspend user')
      }
    } catch {
      toast.error('Failed to suspend user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Suspend Account
          </DialogTitle>
          <DialogDescription>
            This action will suspend the user&apos;s account and cancel all active subscriptions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-800">{userEmail}</p>
            <p className="text-xs text-red-600">{businessName}</p>
          </div>
          <div>
            <Label htmlFor="suspend-notes">Reason (optional)</Label>
            <Textarea
              id="suspend-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for suspension..."
              className="mt-1"
              rows={3}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The user will not be able to access their account until reactivated.
            All active subscriptions will be cancelled.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleSuspend} disabled={loading}>
            {loading ? 'Suspending...' : 'Suspend Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
