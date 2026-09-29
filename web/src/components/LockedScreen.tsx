import React from "react"
import { ShieldAlert, ArrowUpRight } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function LockedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background selection:bg-teal-500/20">
      <Card className="w-full max-w-md border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-2 items-center">
          <div className="size-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-3 text-destructive shadow-inner">
            <ShieldAlert className="size-7" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold border-destructive/30 text-destructive">
              Akses Privat
            </Badge>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Catatin Dashboard</CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground pt-1">
            Dashboard ini diproteksi ketat dan hanya dapat diakses melalui <strong>Telegram WebApp</strong> dari akun pemilik yang sah.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="rounded-lg bg-secondary/50 border border-border/80 p-4 text-xs text-muted-foreground leading-relaxed flex flex-col gap-2">
            <p className="font-medium text-foreground flex items-center gap-1.5">
              <span>💡</span> Cara Membuka Dashboard:
            </p>
            <ol className="list-decimal list-inside flex flex-col gap-1.5 pl-1">
              <li>Buka aplikasi <strong>Telegram</strong> Anda</li>
              <li>Buka chat dengan bot <strong>Catatin</strong></li>
              <li>Klik tombol <strong>📊 Buka Dashboard</strong> di menu bot</li>
            </ol>
          </div>
          <div className="mt-5 text-center">
            <a
              href="https://t.me"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              Buka Aplikasi Telegram <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
