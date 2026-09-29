import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AddTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddTransaction: (tx: {
    amount: number
    category: string
    description: string
    date: string
  }) => Promise<void>
}

const CATEGORIES = [
  { value: "makan", label: "🍲 Makan" },
  { value: "bensin", label: "⛽ Bensin" },
  { value: "kopi", label: "☕ Kopi" },
  { value: "jajan", label: "🥐 Jajan" },
  { value: "belanja", label: "🛒 Belanja" },
  { value: "tagihan", label: "⚡ Tagihan" },
  { value: "transport", label: "🚕 Transport" },
  { value: "hiburan", label: "🎮 Hiburan" },
  { value: "lainnya", label: "📦 Lainnya" },
]

export function AddTransactionModal({
  open,
  onOpenChange,
  onAddTransaction,
}: AddTransactionModalProps) {
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("makan")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseInt(amount, 10)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Nominal harus berupa angka valid di atas 0.")
      return
    }
    if (!description.trim()) {
      setError("Keterangan transaksi wajib diisi.")
      return
    }

    setError("")
    setLoading(true)
    try {
      await onAddTransaction({
        amount: numAmount,
        category,
        description: description.trim(),
        date,
      })
      // Reset form
      setAmount("")
      setDescription("")
      setDate(new Date().toISOString().split("T")[0])
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan transaksi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/80 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Catat Pengeluaran Baru</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Masukkan detail pengeluaran untuk dicatat ke dalam dashboard dan analitik.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {error && (
            <div className="rounded-md bg-destructive/15 border border-destructive/30 p-2.5 text-xs text-rose-400 font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-amount">Nominal (Rp)</Label>
            <Input
              id="tx-amount"
              type="number"
              placeholder="misal: 25000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={100}
              required
              className="bg-secondary/40 font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-category">Kategori</Label>
            <select
              id="tx-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-secondary/40 px-3 py-1 text-sm shadow-sm transition-colors text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value} className="bg-card text-foreground">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-desc">Keterangan / Catatan</Label>
            <Input
              id="tx-desc"
              type="text"
              placeholder="misal: Nasi Padang + Es Teh"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="bg-secondary/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-date">Tanggal</Label>
            <Input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-secondary/40 font-mono"
            />
          </div>

          <DialogFooter className="mt-2 flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold"
            >
              {loading ? "Menyimpan..." : "Simpan Transaksi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
