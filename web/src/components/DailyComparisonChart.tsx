import React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { formatRupiah } from "@/lib/utils"

export interface DailyDataPoint {
  dayName: string
  dateThisWeek: string
  amountThisWeek: number
  dateLastWeek: string
  amountLastWeek: number
}

interface DailyComparisonChartProps {
  data: DailyDataPoint[]
}

// Custom Tooltip component with sleek shadcn look
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as DailyDataPoint
    const thisWeek = dataPoint.amountThisWeek
    const lastWeek = dataPoint.amountLastWeek
    const diff = thisWeek - lastWeek

    return (
      <div className="rounded-lg border border-border/80 bg-popover/95 p-3 shadow-xl backdrop-blur-md text-xs flex flex-col gap-1.5 min-w-[200px]">
        <div className="font-semibold text-foreground border-b border-border/50 pb-1 flex justify-between items-center">
          <span>{label}</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {dataPoint.dateThisWeek.slice(5)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-teal-500" />
            <span className="text-muted-foreground">Minggu Ini:</span>
          </div>
          <span className="font-mono font-semibold text-foreground">{formatRupiah(thisWeek)}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-slate-500" />
            <span className="text-muted-foreground">Minggu Lalu:</span>
          </div>
          <span className="font-mono text-muted-foreground">{formatRupiah(lastWeek)}</span>
        </div>

        {lastWeek > 0 && (
          <div className="pt-1 border-t border-border/40 flex justify-between text-[11px] font-medium">
            <span className="text-muted-foreground">Selisih:</span>
            <span className={diff > 0 ? "text-rose-400 font-mono" : "text-emerald-400 font-mono"}>
              {diff > 0 ? `+${formatRupiah(diff)}` : formatRupiah(diff)}
            </span>
          </div>
        )}
      </div>
    )
  }
  return null
}

export function DailyComparisonChart({ data }: DailyComparisonChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-border/60 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Grafik Pengeluaran Harian</CardTitle>
          <CardDescription>Belum ada data pengeluaran harian</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Format short day name for XAxis
  const chartData = data.map((d) => ({
    ...d,
    shortDay: d.dayName.slice(0, 3), // Sen, Sel, Rab, Kam, Jum, Sab, Min
  }))

  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur-xl shadow-md">
      <CardHeader className="p-5 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold tracking-tight text-foreground">
              Perbandingan Harian (Senin — Minggu)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Komparasi pengeluaran per hari vs hari yang sama minggu lalu
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs self-start sm:self-auto">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-teal-500 shadow-sm" />
              <span className="text-muted-foreground text-[11px] font-medium">Minggu Ini</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-slate-600 shadow-sm" />
              <span className="text-muted-foreground text-[11px] font-medium">Minggu Lalu</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-3">
        <div className="w-full h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
              barGap={3}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border) / 0.5)"
              />
              <XAxis
                dataKey="shortDay"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={(value) => (value >= 1000 ? `${value / 1000}k` : `${value}`)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="amountLastWeek"
                name="Minggu Lalu"
                fill="#475569"
                opacity={0.65}
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="amountThisWeek"
                name="Minggu Ini"
                fill="#14b8a6"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 rounded-lg bg-secondary/30 border border-border/40 p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
          <span className="text-sm">💡</span>
          <span>
            Bar tosca = minggu berjalan. Bar abu-abu = minggu lalu. Ketuk/hover bar untuk melihat nominal detil.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
