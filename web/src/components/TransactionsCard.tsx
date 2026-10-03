import React, { useState } from "react"
import {
  Plus,
  Trash2,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  Layers,
  FilterX,
  RotateCcw,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatRupiah, cn } from "@/lib/utils"

export interface Transaction {
  id: number
  amount: number
  category: string
  description: string
  date: string
}

export type TimeframeFilter = "all" | "week" | "month"

export interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
  filter?: TimeframeFilter
  totalAmount?: number
  filterLabel?: string
  startDate?: string
  endDate?: string
}

interface TransactionsCardProps {
  transactions: Transaction[]
  pagination: PaginationData
  activeFilter: TimeframeFilter
  onFilterChange: (filter: TimeframeFilter) => void
  onPageChange: (page: number) => void
  onOpenAddModal: () => void
  onDeleteTransaction: (id: number) => Promise<void>
}

export function TransactionsCard({
  transactions,
  pagination,
  activeFilter,
  onFilterChange,
  onPageChange,
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

  const { page, totalPages, total, limit, totalAmount, filterLabel } = pagination
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur-xl shadow-md">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between gap-3">
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
            className="h-8 gap-1.5 bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20 shadow-none font-semibold text-xs shrink-0 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Catat Manual</span>
          </Button>
        </div>

        {/* Filter Segmented Controls */}
        <div className="pt-3 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div
            role="tablist"
            aria-label="Filter Rentang Waktu Transaksi"
            className="inline-flex items-center p-1 rounded-lg bg-secondary/50 border border-border/60 gap-1 w-full sm:w-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "all"}
              onClick={() => onFilterChange("all")}
              className={cn(
                "flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 cursor-pointer select-none",
                activeFilter === "all"
                  ? "bg-card text-foreground shadow-sm border border-border/80 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <Layers className="size-3.5 shrink-0" />
              <span>Semua</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "week"}
              onClick={() => onFilterChange("week")}
              className={cn(
                "flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 cursor-pointer select-none",
                activeFilter === "week"
                  ? "bg-card text-foreground shadow-sm border border-border/80 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <Calendar className="size-3.5 shrink-0" />
              <span>Minggu Ini</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "month"}
              onClick={() => onFilterChange("month")}
              className={cn(
                "flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 cursor-pointer select-none",
                activeFilter === "month"
                  ? "bg-card text-foreground shadow-sm border border-border/80 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <CalendarDays className="size-3.5 shrink-0" />
              <span>Bulan Ini (Siklus)</span>
            </button>
          </div>

          {/* Subtotal Terfilter */}
          {activeFilter !== "all" && totalAmount !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono self-start sm:self-auto px-1">
              <span>Total:</span>
              <span className="font-bold text-foreground">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-1 pb-3">
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-7 text-center flex flex-col items-center justify-center gap-2.5">
            <div className="size-10 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground">
              {activeFilter !== "all" ? (
                <FilterX className="size-5" />
              ) : (
                <ReceiptText className="size-5" />
              )}
            </div>
            <p className="text-sm font-semibold text-foreground">
              {activeFilter !== "all"
                ? "Tidak ada transaksi ditemukan"
                : "Belum ada transaksi"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              {activeFilter === "week"
                ? "Belum ada catatan pengeluaran di minggu berjalan ini (Senin–Minggu)."
                : activeFilter === "month"
                ? "Belum ada catatan pengeluaran di siklus gajian bulan ini (cut-off tanggal 25)."
                : 'Kirim pesan via bot Telegram (misal: "kopi 25rb") atau klik tombol Catat Manual di atas.'}
            </p>
            {activeFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFilterChange("all")}
                className="mt-1 text-xs gap-1.5 border-border/80 cursor-pointer"
              >
                <RotateCcw className="size-3" />
                <span>Tampilkan Semua Riwayat</span>
              </Button>
            )}
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
                      className="px-1.5 py-0 text-[10px] uppercase font-mono tracking-wider border-primary/30 text-teal-400 bg-teal-500/10 font-medium"
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
                    className="size-7 text-muted-foreground/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
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

      {/* Pagination Footer */}
      {total > 0 && (
        <CardFooter className="p-4 pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground font-mono text-[11px]">
            {totalPages > 1
              ? `${startItem}–${endItem} dari ${total} transaksi`
              : `${total} transaksi`}
            {activeFilter === "week"
              ? " (Minggu Ini)"
              : activeFilter === "month"
              ? " (Siklus Bulan Ini)"
              : ""}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="h-7 px-2 gap-1 text-[11px] border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ChevronLeft className="size-3" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Button>

              <span className="px-2 py-0.5 rounded bg-secondary/50 font-mono text-[11px] font-medium text-foreground">
                {page} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="h-7 px-2 gap-1 text-[11px] border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="size-3" />
              </Button>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
