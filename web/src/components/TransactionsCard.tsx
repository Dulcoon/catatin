import React, { useState } from "react"
import { Plus, Trash2, ReceiptText, AlertCircle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatRupiah } from "@/lib/utils"

export interface Transaction {
  id: number
  amount: number
  category: string
  description: string
  date: string
}

interface TransactionsCardProps {
  transactions: Transaction[]
  onOpenAddModal: () => void
  onDeleteTransaction: (id: number) => Promise<void>
}

export function TransactionsCard({
  transactions,
  onOpenAddModal,
  onDeleteTransaction,
}: TransactionsCardProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (window.confirm("Hapus catatan transaksi ini?")) {
      setDeletingId(id)
      try {
        await onDeleteTransaction(id)
      } finally {
        setDeletingId(null)
      }
    }
  }

  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur-xl shadow-md">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold tracking-tight text-foreground">
              Riwayat Transaksi
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Daftar pengeluaran terbaru yang tercatat di sistem
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={onOpenAddModal}
            className="h-8 gap-1.5 bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20 shadow-none font-semibold text-xs"
          >
            <Plus className="size-3.5" />
            <span>Catat Manual</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-1">
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="size-10 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground">
              <ReceiptText className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">Belum ada transaksi</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Kirim pesan pengeluaran via bot Telegram (misal: "kopi 25rb") atau klik tombol Catat Manual di atas.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between gap-3 group transition-colors hover:bg-secondary/20 -mx-2 px-2 rounded-lg"
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {tx.description}
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[10px] uppercase font-mono tracking-wider border-primary/30 text-teal-400 bg-teal-500/10"
                    >
                      #{tx.category}
                    </Badge>
                    <span className="text-muted-foreground font-mono">
                      {tx.date}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-foreground font-mono">
                    {formatRupiah(tx.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    className="size-7 text-muted-foreground/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-80 group-hover:opacity-100"
                    title="Hapus transaksi"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Hapus</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
