import React from "react"
import { TrendingDown, TrendingUp, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatRupiah } from "@/lib/utils"

interface HeroMetricCardProps {
  comparison: {
    currentWeekTotal: number
    lastWeekTotal: number
    diffAmount: number
    diffPercentage: number
    isMoreThrifty: boolean
    budget: number
    budgetPercentage: number
    remainingBudget: number
  } | null
}

export function HeroMetricCard({ comparison }: HeroMetricCardProps) {
  if (!comparison) {
    return (
      <Card className="border-border/60 bg-card/60 backdrop-blur-md animate-pulse">
        <div className="p-6 h-48 flex items-center justify-center text-muted-foreground text-sm">
          Memuat data analitik...
        </div>
      </Card>
    )
  }

  const {
    currentWeekTotal,
    lastWeekTotal,
    diffAmount,
    diffPercentage,
    isMoreThrifty,
    budget,
    budgetPercentage,
    remainingBudget,
  } = comparison

  // Logic status badge
  let badgeVariant: "success" | "danger" | "secondary" = "secondary"
  let badgeText = "Data Baru"
  let badgeIcon = <Sparkles className="size-3 mr-1" />
  let narrativeText = "Belum ada catatan pengeluaran di minggu ini."

  if (lastWeekTotal === 0 && currentWeekTotal === 0) {
    badgeVariant = "secondary"
    badgeText = "Data Baru"
    badgeIcon = <Sparkles className="size-3 mr-1" />
    narrativeText = "Belum ada catatan pengeluaran di minggu ini."
  } else if (lastWeekTotal === 0) {
    badgeVariant = "secondary"
    badgeText = "Minggu Pertama"
    badgeIcon = <Sparkles className="size-3 mr-1" />
    narrativeText = "Histori minggu lalu belum ada / minggu pertama pemakaian bot."
  } else if (isMoreThrifty) {
    badgeVariant = "success"
    badgeText = `${diffPercentage}% Lebih Hemat`
    badgeIcon = <TrendingDown className="size-3 mr-1" />
    narrativeText = `Lebih irit ${formatRupiah(diffAmount)} dibanding minggu lalu (${formatRupiah(lastWeekTotal)}).`
  } else {
    badgeVariant = "danger"
    badgeText = `${diffPercentage}% Lebih Boros`
    badgeIcon = <TrendingUp className="size-3 mr-1" />
    narrativeText = `Pengeluaran naik ${formatRupiah(diffAmount)} dibanding minggu lalu (${formatRupiah(lastWeekTotal)}).`
  }

  // Indicator color based on percentage
  const isOverbudget = budgetPercentage >= 100
  const isWarning = budgetPercentage >= 80 && budgetPercentage < 100
  const progressIndicatorColor = isOverbudget
    ? "bg-rose-500"
    : isWarning
    ? "bg-amber-500"
    : "bg-emerald-500"

  return (
    <Card className="relative overflow-hidden border-border/70 bg-gradient-to-b from-card/90 to-card/60 backdrop-blur-xl shadow-lg glow-primary">
      {/* Subtle background ambient light */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Total Pengeluaran Minggu Ini
          </span>
          <Badge variant={badgeVariant} className="flex items-center px-2.5 py-0.5 text-xs font-semibold">
            {badgeIcon}
            {badgeText}
          </Badge>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
            {formatRupiah(currentWeekTotal)}
          </span>
        </div>
        <CardDescription className="text-xs text-muted-foreground/90 mt-1 flex items-center gap-1.5">
          <span>📊</span> {narrativeText}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 pt-2">
        <div className="rounded-xl bg-secondary/40 border border-border/50 p-4 mt-2 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              Target Budget: <span className="font-semibold text-foreground font-mono">{formatRupiah(budget)}</span>
            </span>
            <span className={`font-mono font-bold ${isOverbudget ? "text-rose-400" : isWarning ? "text-amber-400" : "text-emerald-400"}`}>
              {budgetPercentage}%
            </span>
          </div>

          <Progress
            value={Math.min(budgetPercentage, 100)}
            className="h-2 bg-secondary"
            indicatorClassName={progressIndicatorColor}
          />

          <div className="flex items-center justify-between text-[11px] pt-0.5">
            {isOverbudget ? (
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <AlertTriangle className="size-3.5" />
                Overbudget: <span className="font-mono font-bold">{formatRupiah(Math.abs(remainingBudget))}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                Sisa budget: <span className="font-mono font-bold text-foreground">{formatRupiah(remainingBudget)}</span>
              </span>
            )}
            <span className="text-muted-foreground text-[10px]">
              Reset tiap Senin 00:00
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
