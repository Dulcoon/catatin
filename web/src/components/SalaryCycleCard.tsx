import React from "react"
import { CalendarDays, TrendingDown, TrendingUp, Sparkles, Receipt, Zap } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatRupiah } from "@/lib/utils"

export interface SalaryCycleData {
  payday: number
  startDate: string
  endDate: string
  label: string
  total: number
  transactionCount: number
  lastCycleTotal: number
  diffAmount: number
  diffPercentage: number
  isMoreThrifty: boolean
  daysPassed: number
  totalDays: number
  averagePerDay: number
  topCategories: { category: string; total: number; percentage: number }[]
}

interface SalaryCycleCardProps {
  salaryCycle: SalaryCycleData | null
}

export function SalaryCycleCard({ salaryCycle }: SalaryCycleCardProps) {
  if (!salaryCycle) {
    return (
      <Card className="border-border/60 bg-card/60 backdrop-blur-md animate-pulse">
        <div className="p-6 h-36 flex items-center justify-center text-muted-foreground text-xs">
          Memuat data siklus gajian...
        </div>
      </Card>
    )
  }

  const {
    payday,
    label,
    total,
    transactionCount,
    lastCycleTotal,
    diffPercentage,
    isMoreThrifty,
    daysPassed,
    totalDays,
    averagePerDay,
    topCategories,
  } = salaryCycle

  const cycleProgress = Math.min(Math.round((daysPassed / totalDays) * 100), 100)

  return (
    <Card className="border-border/70 bg-gradient-to-b from-card/85 to-card/60 backdrop-blur-xl shadow-md relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <CalendarDays className="size-3.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-foreground">
                Pengeluaran Bulan Ini (Siklus Gajian)
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Cut-off tiap tgl {payday} • Setelah tgl {payday} dihitung bulan depan
              </CardDescription>
            </div>
          </div>

          <Badge variant="outline" className="font-mono text-xs border-teal-500/30 text-teal-300 bg-teal-500/10 self-start sm:self-auto py-0.5">
            🗓️ {label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-1 flex flex-col gap-4">
        {/* Total Spend */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-1">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Total Pengeluaran Siklus Ini
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono mt-0.5">
              {formatRupiah(total)}
            </div>
          </div>

          {/* Comparison vs Previous Cycle */}
          {lastCycleTotal > 0 ? (
            <Badge
              variant={isMoreThrifty ? "success" : "danger"}
              className="self-start sm:self-auto text-xs py-1"
            >
              {isMoreThrifty ? (
                <TrendingDown className="size-3 mr-1" />
              ) : (
                <TrendingUp className="size-3 mr-1" />
              )}
              {diffPercentage}% {isMoreThrifty ? "Lebih Hemat" : "Lebih Boros"} vs Siklus Lalu
            </Badge>
          ) : (
            <Badge variant="secondary" className="self-start sm:self-auto text-xs py-1">
              <Sparkles className="size-3 mr-1" />
              Siklus Pertama
            </Badge>
          )}
        </div>

        {/* Days Progress in Cycle */}
        <div className="flex flex-col gap-1.5 rounded-lg bg-secondary/30 border border-border/40 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <span className="size-1.5 rounded-full bg-teal-400" />
              Progress Durasi Siklus:
            </span>
            <span className="font-mono text-[11px] text-foreground font-semibold">
              Hari ke-{daysPassed} dari {totalDays} hari ({cycleProgress}%)
            </span>
          </div>
          <Progress
            value={cycleProgress}
            className="h-1.5 bg-secondary"
            indicatorClassName="bg-teal-500"
          />
        </div>

        {/* Metric Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="rounded-lg bg-secondary/40 border border-border/50 p-2.5 flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Zap className="size-3 text-amber-400" />
              Rata-rata Harian
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
              {formatRupiah(averagePerDay)}
              <span className="text-[10px] text-muted-foreground font-normal"> /hari</span>
            </span>
          </div>

          <div className="rounded-lg bg-secondary/40 border border-border/50 p-2.5 flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Receipt className="size-3 text-blue-400" />
              Frekuensi
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
              {transactionCount}
              <span className="text-[10px] text-muted-foreground font-normal"> transaksi</span>
            </span>
          </div>

          {topCategories.length > 0 && (
            <div className="col-span-2 sm:col-span-1 rounded-lg bg-secondary/40 border border-border/50 p-2.5 flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">
                Kategori Terbesar
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-teal-400 capitalize truncate">
                #{topCategories[0].category}{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({topCategories[0].percentage}%)
                </span>
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
