import React, { useState, useEffect } from "react"
import { Send, CheckCircle2, AlertCircle, Sparkles } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"
import { api } from "@/api"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function SettingsModal({ open, onOpenChange, onSaved }: SettingsModalProps) {
  const [weeklyBudget, setWeeklyBudget] = useState("500000")
  const [threshold, setThreshold] = useState("80")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingRecap, setTestingRecap] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Load current settings when modal opens
  useEffect(() => {
    if (open) {
      setMessage(null)
      setLoading(true)
      api.getSettings()
        .then((settings) => {
          if (settings.weeklyBudget) setWeeklyBudget(settings.weeklyBudget.toString())
          if (settings.warningThresholdPercent) setThreshold(settings.warningThresholdPercent.toString())
        })
        .catch((err) => {
          console.error("Gagal mengambil pengaturan:", err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [open])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const budgetNum = parseInt(weeklyBudget, 10)
    const thresholdNum = parseInt(threshold, 10)

    if (isNaN(budgetNum) || budgetNum < 10000) {
      setMessage({ type: "error", text: "Target budget minimal Rp 10.000." })
      return
    }

    if (isNaN(thresholdNum) || thresholdNum < 10 || thresholdNum > 100) {
      setMessage({ type: "error", text: "Batas persentase peringatan antara 10% - 100%." })
      return
    }

    setSaving(true)
    try {
      await api.updateSettings({
        weeklyBudget: budgetNum,
        warningThresholdPercent: thresholdNum,
      })
      setMessage({ type: "success", text: "Pengaturan berhasil diperbarui." })
      onSaved()
      setTimeout(() => {
        onOpenChange(false)
      }, 900)
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Gagal menyimpan pengaturan." })
    } finally {
      setSaving(false)
    }
  }

  const handleTestRecap = async () => {
    setMessage(null)
    setTestingRecap(true)
    try {
      const res = await api.triggerTestRecap()
      if (res.success) {
        setMessage({
          type: "success",
          text: "Pesan rekap mingguan berhasil dikirim ke bot Telegram Anda!",
        })
      } else {
        setMessage({
          type: "error",
          text: "Pesan belum terkirim. Pastikan TELEGRAM_BOT_TOKEN & ADMIN_TELEGRAM_ID di .env sudah benar.",
        })
      }
    } catch (err) {
      setMessage({ type: "error", text: "Terjadi kesalahan saat memicu notifikasi bot." })
    } finally {
      setTestingRecap(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/80 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Pengaturan Budget & Bot</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Sesuaikan target finansial mingguan dan trigger simulasi laporan bot.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Memuat konfigurasi...
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="flex flex-col gap-4 py-2">
            {message && (
              <div
                className={`rounded-md p-2.5 text-xs font-medium border flex items-center gap-2 ${
                  message.type === "success"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : "bg-destructive/15 border-destructive/30 text-rose-400"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weekly-budget">Target Budget Mingguan (Rp)</Label>
              <Input
                id="weekly-budget"
                type="number"
                min={10000}
                step={10000}
                value={weeklyBudget}
                onChange={(e) => setWeeklyBudget(e.target.value)}
                required
                className="bg-secondary/40 font-mono"
              />
              <span className="text-[11px] text-muted-foreground">
                Batas pengeluaran per minggu (dihitung Senin s/d Minggu).
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="threshold">Batas Peringatan Pertama (%)</Label>
              <Input
                id="threshold"
                type="number"
                min={50}
                max={99}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                required
                className="bg-secondary/40 font-mono"
              />
              <span className="text-[11px] text-muted-foreground">
                Bot akan mengirim peringatan waspada saat pengeluaran menyentuh persentase ini.
              </span>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>

            <Separator className="my-2" />

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Sparkles className="size-3.5 text-teal-400" />
                <span>Simulasi Notifikasi Telegram</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Bot secara otomatis mengirim laporan rekap tiap <strong>Minggu jam 21:00 WIB</strong>. Anda bisa mengetes format rekap kapan saja di sini:
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestRecap}
                disabled={testingRecap}
                className="gap-2 text-xs border-border/80 hover:bg-secondary/60"
              >
                <Send className="size-3.5" />
                <span>{testingRecap ? "Mengirim notifikasi..." : "Kirim Uji Coba Rekap ke Telegram"}</span>
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
