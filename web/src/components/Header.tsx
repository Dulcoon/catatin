import React from "react"
import { RefreshCw, Settings, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface HeaderProps {
  periodLabel: string
  isRefreshing: boolean
  onRefresh: () => void
  onOpenSettings: () => void
}

export function Header({ periodLabel, isRefreshing, onRefresh, onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
            <Wallet className="size-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground">CATATIN</span>
              <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-medium border-border/80 text-muted-foreground">
                PRO
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {periodLabel || "Memuat periode..."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Perbarui Data"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span className="sr-only">Perbarui</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Pengaturan"
          >
            <Settings className="size-4" />
            <span className="sr-only">Pengaturan</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
