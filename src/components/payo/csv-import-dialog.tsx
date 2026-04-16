'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface CsvPreview {
  headers: string[]
  rows: Record<string, string>[]
  errors: string[]
  totalRows: number
}

interface ColumnMapping {
  clientName: string
  clientEmail: string
  invoiceNumber: string
  amount: string
  currency: string
  dueDate: string
}

const EMPTY_MAPPING: ColumnMapping = {
  clientName: '',
  clientEmail: '',
  invoiceNumber: '',
  amount: '',
  currency: '',
  dueDate: '',
}

export function CsvImportDialog({ open, onOpenChange, onSuccess }: CsvImportDialogProps) {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(EMPTY_MAPPING)
  const [loading, setLoading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null)

  const reset = useCallback(() => {
    setStep(1)
    setFile(null)
    setPreview(null)
    setColumnMapping(EMPTY_MAPPING)
    setLoading(false)
    setCommitting(false)
    setResults(null)
  }, [])

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset()
    onOpenChange(isOpen)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setLoading(true)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const res = await fetch('/api/csv/preview', { method: 'POST', body: formData })
      if (res.ok) {
        const data: CsvPreview = await res.json()
        setPreview(data)

        // Auto-map columns by name
        const autoMapping = { ...EMPTY_MAPPING }
        data.headers.forEach((h) => {
          const lower = h.toLowerCase()
          if (lower.includes('name') && !lower.includes('email')) autoMapping.clientName = h
          else if (lower.includes('email') && !lower.includes('client')) autoMapping.clientEmail = h
          else if (lower.includes('invoice') && (lower.includes('#') || lower.includes('number'))) autoMapping.invoiceNumber = h
          else if (lower.includes('amount') || lower.includes('total')) autoMapping.amount = h
          else if (lower.includes('currency') || lower.includes('ccy')) autoMapping.currency = h
          else if (lower.includes('due') || lower.includes('date')) autoMapping.dueDate = h
        })
        setColumnMapping(autoMapping)
        setStep(2)
      } else {
        const data = await res.json()
        toast.error('CSV parse error', { description: data.error || 'Failed to parse CSV file.' })
      }
    } catch {
      toast.error('Failed to upload file')
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async () => {
    if (!preview) return
    setCommitting(true)

    try {
      const res = await fetch('/api/csv/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: preview.rows,
          columnMapping,
          headers: preview.headers,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResults({ success: data.created || 0, failed: data.failed || 0 })
        setStep(3)
        toast.success('Import completed', {
          description: `${data.created || 0} invoices created successfully.`,
        })
        onSuccess?.()
      } else {
        const data = await res.json()
        toast.error('Import failed', { description: data.error || 'Failed to commit import.' })
      }
    } catch {
      toast.error('Import failed', { description: 'Network error.' })
    } finally {
      setCommitting(false)
    }
  }

  const mappingFields: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
    { key: 'clientName', label: 'Client Name', required: true },
    { key: 'clientEmail', label: 'Client Email', required: true },
    { key: 'invoiceNumber', label: 'Invoice #', required: false },
    { key: 'amount', label: 'Amount', required: true },
    { key: 'currency', label: 'Currency', required: false },
    { key: 'dueDate', label: 'Due Date', required: true },
  ]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-border/30 bg-background shadow-2xl">
        <div className="bg-primary/5 p-10 border-b border-border/10 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-primary/20 shadow-sm mx-auto mb-6">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-3xl font-serif text-primary italic leading-tight">Import Ledger</DialogTitle>
          <DialogDescription className="font-sans text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold mt-2">
            {step === 1 && 'Ingest CSV Statement Data'}
            {step === 2 && 'Map Identity Columns'}
            {step === 3 && 'Curation Complete'}
          </DialogDescription>
        </div>

        <div className="p-10">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-border/30 p-12 transition-all hover:border-primary/50 hover:bg-primary/5 bg-muted/10 group">
                <Upload className="w-12 h-12 text-muted-foreground mb-4 group-hover:scale-110 transition-transform" />
                <p className="font-serif text-lg text-foreground mb-1 italic text-center">
                  {file ? file.name : 'Select your CSV statement'}
                </p>
                <p className="font-sans text-[10px] text-muted-foreground mb-6 uppercase tracking-widest font-bold">Standard UTF-8 formatting preferred</p>
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="btn-secondary px-8 py-3 font-bold text-xs uppercase tracking-widest rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-all">
                    Browse Portfolio
                  </div>
                </Label>
                {loading && (
                  <div className="flex items-center gap-3 mt-6 text-[10px] font-bold text-primary uppercase tracking-widest">
                    <Loader2 className="w-4 h-4 animate-spin" /> Parsing Identity Data...
                  </div>
                )}
              </div>
              {preview?.errors && preview.errors.length > 0 && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-destructive uppercase tracking-widest mb-2">Curation Warnings</p>
                  <ul className="text-xs text-muted-foreground space-y-1 font-serif italic">
                    {preview.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 2 && preview && (
            <div className="space-y-8">
              {/* Column Mapping */}
              <div className="grid grid-cols-2 gap-6 bg-muted/10 p-6 rounded-3xl border border-border/20">
                {mappingFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                      {field.label}
                      {field.required && <span className="text-primary ml-1">*</span>}
                    </Label>
                    <Select
                      value={columnMapping[field.key]}
                      onValueChange={(val) => setColumnMapping((prev) => ({ ...prev, [field.key]: val }))}
                    >
                      <SelectTrigger className="h-10 bg-white border-border/30 rounded-xl font-sans text-xs font-bold uppercase tracking-widest">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl font-sans text-xs font-bold uppercase tracking-widest">
                        {preview.headers.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs">
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview Table */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                  Ledger Preview ({preview.rows.length} entries)
                </p>
                <div className="rounded-2xl border border-border/20 overflow-hidden bg-white shadow-inner">
                  <ScrollArea className="h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/5">
                          <TableHead className="px-4 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">#</TableHead>
                          {preview.headers.map((h) => (
                            <TableHead key={h} className="px-4 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.rows.slice(0, 10).map((row, i) => (
                          <TableRow key={i} className="hover:bg-muted/5">
                            <TableCell className="px-4 py-2 font-mono text-[10px] text-muted-foreground">{i + 1}</TableCell>
                            {preview.headers.map((header) => (
                              <TableCell key={header} className="px-4 py-2 text-[10px] text-foreground font-medium">{row[header] || '—'}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}

          {step === 3 && results && (
            <div className="space-y-10 py-6">
              <div className="flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6 shadow-lg shadow-secondary/20">
                  <CheckCircle2 className="w-10 h-10 text-secondary-foreground" />
                </div>
                <h3 className="text-3xl font-serif italic text-foreground">Import Complete</h3>
                <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-2">The registry has been updated</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-8 rounded-3xl bg-secondary/20 border border-secondary/30">
                  <p className="font-serif text-4xl text-secondary-foreground">{results.success}</p>
                  <p className="font-sans text-[10px] text-secondary-foreground uppercase tracking-widest font-bold mt-2">Identities Created</p>
                </div>
                {results.failed > 0 && (
                  <div className="text-center p-8 rounded-3xl bg-destructive/5 border border-destructive/10">
                    <p className="font-serif text-4xl text-destructive">{results.failed}</p>
                    <p className="font-sans text-[10px] text-destructive uppercase tracking-widest font-bold mt-2">Entries Rejected</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-10 pt-0 flex gap-4">
          {step === 1 && (
            <button onClick={() => handleClose(false)} className="flex-1 h-14 font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Discard</button>
          )}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="flex-1 h-14 font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Return</button>
              <button
                onClick={handleCommit}
                disabled={committing}
                className="flex-[2] btn-primary h-14 rounded-full font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                {committing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                Confirm {preview?.rows.length || 0} Entries
              </button>
            </>
          )}
          {step === 3 && (
            <button onClick={() => handleClose(false)} className="flex-1 btn-primary h-14 rounded-full font-bold shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-xs">
              Return to Ledger
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
