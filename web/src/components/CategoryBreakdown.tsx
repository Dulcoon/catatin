import React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { formatRupiah } from "@/lib/utils"

export interface CategoryDataPoint {
  category: string
  total: number
  percentage: number
}

interface CategoryBreakdownProps {
  categories: CategoryDataPoint[]
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  makan: { bg: "bg-teal-500/15", text: "text-teal-400", bar: "bg-teal-500" },
  bensin: { bg: "bg-amber-500/15", text: "text-amber-400", bar: "bg-amber-500" },
  kopi: { bg: "bg-purple-500/15", text: "text-purple-400", bar: "bg-purple-500" },
  jajan: { bg: "bg-pink-500/15", text: "text-pink-400", bar: "bg-pink-500" },
  belanja: { bg: "bg-blue-500/15", text: "text-blue-400", bar: "bg-blue-500" },
  tagihan: { bg: "bg-rose-500/15", text: "text-rose-400", bar: "bg-rose-500" },
  transport: { bg: "bg-emerald-500/15", text: "text-emerald-400", bar: "bg-emerald-500" },
  hiburan: { bg: "bg-indigo-500/15", text: "text-indigo-400", bar: "bg-indigo-500" },
  lainnya: { bg: "bg-slate-500/15", text: "text-slate-400", bar: "bg-slate-400" },
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  if (!categories || categories.length === 0) {
    return (
      <Card className="border-border/70 bg-card/70 backdrop-blur-xl shadow-md">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base font-bold tracking-tight text-foreground">
            Proporsi Kategori Minggu Ini
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Distribusi alokasi pengeluaran berdasarkan pos kategori
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-3">
          <div className="rounded-lg bg-secondary/30 border border-border/40 p-6 text-center text-xs text-muted-foreground">
            Belum ada transaksi di minggu ini untuk dikelompokkan ke dalam kategori.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur-xl shadow-md">
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-base font-bold tracking-tight text-foreground">
          Proporsi Kategori Minggu Ini
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          Distribusi pengeluaran berdasarkan kategori transaksi
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 pt-3 flex flex-col gap-3.5">
        {categories.map((cat) => {
          const key = cat.category.toLowerCase()
          const color = CATEGORY_COLORS[key] || {
            bg: "bg-slate-500/15",
            text: "text-slate-400",
            bar: "bg-slate-400",
          }

          return (
            <div key={cat.category} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${color.bar}`} />
                  <span className="font-semibold capitalize text-foreground">
                    {cat.category}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-semibold text-foreground">
                    {formatRupiah(cat.total)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    ({cat.percentage}%)
                  </span>
                </div>
              </div>

              {/* Custom styled progress track */}
              <div className="h-1.5 w-full bg-secondary/70 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${color.bar}`}
                  style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
