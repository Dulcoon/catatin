import React, { useState, useEffect, useCallback } from "react"
import { api } from "@/api"
import { Header } from "@/components/Header"
import { LockedScreen } from "@/components/LockedScreen"
import { HeroMetricCard } from "@/components/HeroMetricCard"
import { DailyComparisonChart, DailyDataPoint } from "@/components/DailyComparisonChart"
import { CategoryBreakdown, CategoryDataPoint } from "@/components/CategoryBreakdown"
import { TransactionsCard, Transaction, PaginationData, TimeframeFilter } from "@/components/TransactionsCard"
import { SalaryCycleCard, SalaryCycleData } from "@/components/SalaryCycleCard"
import { AddTransactionModal } from "@/components/AddTransactionModal"
import { SettingsModal } from "@/components/SettingsModal"

export function App() {
  const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "locked">("checking")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [modalAddOpen, setModalAddOpen] = useState(false)
  const [modalSettingsOpen, setModalSettingsOpen] = useState(false)

  // Dashboard Data State
  const [analytics, setAnalytics] = useState<{
    comparison: any
    categories: CategoryDataPoint[]
    daily: DailyDataPoint[]
  } | null>(null)
  const [salaryCycle, setSalaryCycle] = useState<SalaryCycleData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionFilter, setTransactionFilter] = useState<TimeframeFilter>("all")
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })

  // Setup Telegram WebApp window if present
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      if (tg.setHeaderColor) tg.setHeaderColor("#080c14")
      if (tg.setBackgroundColor) tg.setBackgroundColor("#080c14")
    }
  }, [])

  // Authenticate user
  const authenticate = useCallback(async () => {
    const tg = (window as any).Telegram?.WebApp

    // 1. Cek Telegram WebApp initData
    if (tg?.initData) {
      try {
        const res = await api.loginWithTelegram(tg.initData)
        if (res.success && res.token) {
          setAuthStatus("authenticated")
          return true
        }
      } catch (err) {
        console.error("Verifikasi Telegram WebApp gagal:", err)
      }
    }

    // 2. Cek token lokal yang valid
    const isValid = await api.checkAuth()
    if (isValid) {
      setAuthStatus("authenticated")
      return true
    }

    // 3. Jika dibuka di luar Telegram, kunci akses
    setAuthStatus("locked")
    return false
  }, [])

  // Fetch only transactions with page & filter
  const fetchTransactions = useCallback(async (page: number, filter: TimeframeFilter = transactionFilter) => {
    try {
      const txData = await api.getTransactions({ page, limit: 10, filter })
      setTransactions(txData.transactions || [])
      if (txData.pagination) {
        setPagination(txData.pagination)
      }
    } catch (err) {
      console.error("Error loading transactions:", err)
    }
  }, [transactionFilter])

  // Load Dashboard Data (Analytics + Monthly + Transactions)
  const loadDashboardData = useCallback(async (targetPage = 1, currentFilter = transactionFilter) => {
    setIsRefreshing(true)
    try {
      const [analyticsData, monthlyData, txData] = await Promise.all([
        api.getWeeklyAnalytics(),
        api.getMonthlyAnalytics(),
        api.getTransactions({ page: targetPage, limit: 10, filter: currentFilter }),
      ])

      setAnalytics(analyticsData)
      setSalaryCycle(monthlyData.salaryCycle || null)
      setTransactions(txData.transactions || [])
      if (txData.pagination) {
        setPagination(txData.pagination)
      }
    } catch (err: any) {
      console.error("Error loading dashboard data:", err)
      if (err.message && err.message.includes("401")) {
        setAuthStatus("locked")
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [transactionFilter])

  // Initial load
  useEffect(() => {
    authenticate().then((isAuthed) => {
      if (isAuthed) {
        loadDashboardData(1, "all")
      }
    })
  }, [authenticate, loadDashboardData])

  // Handlers
  const handlePageChange = (newPage: number) => {
    fetchTransactions(newPage, transactionFilter)
  }

  const handleFilterChange = (newFilter: TimeframeFilter) => {
    setTransactionFilter(newFilter)
    fetchTransactions(1, newFilter)
  }

  const handleAddTransaction = async (tx: {
    amount: number
    category: string
    description: string
    date: string
  }) => {
    await api.addTransaction(tx)
    // Refresh to page 1 so the new transaction is immediately visible
    await loadDashboardData(1, transactionFilter)
  }

  const handleDeleteTransaction = async (id: number) => {
    await api.deleteTransaction(id)
    // If we're on a page > 1 and this was the last item on the page, move to previous page
    const targetPage = transactions.length === 1 && pagination.page > 1
      ? pagination.page - 1
      : pagination.page
    await loadDashboardData(targetPage, transactionFilter)
  }

  // Display locked screen if unauthorized
  if (authStatus === "locked") {
    return <LockedScreen />
  }

  // Display loading screen during initial auth check
  if (authStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-medium text-muted-foreground">Memverifikasi akses bot...</span>
        </div>
      </div>
    )
  }

  const periodLabel = analytics?.comparison
    ? `${analytics.comparison.currentWeekStart} — ${analytics.comparison.currentWeekEnd}`
    : "Minggu Ini"

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-teal-500/20">
      {/* Header */}
      <Header
        periodLabel={periodLabel}
        isRefreshing={isRefreshing}
        onRefresh={() => loadDashboardData(pagination.page, transactionFilter)}
        onOpenSettings={() => setModalSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-5 flex flex-col gap-5 pb-16">
        {/* Monthly Salary Cycle Card */}
        <SalaryCycleCard salaryCycle={salaryCycle} />

        {/* Hero Decision Card */}
        <HeroMetricCard comparison={analytics?.comparison || null} />

        {/* Daily Comparison Chart */}
        <DailyComparisonChart data={analytics?.daily || []} />

        {/* Category Breakdown */}
        <CategoryBreakdown categories={analytics?.categories || []} />

        {/* Transactions List with Segmented Timeframe Filter & Pagination */}
        <TransactionsCard
          transactions={transactions}
          pagination={pagination}
          activeFilter={transactionFilter}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
          onOpenAddModal={() => setModalAddOpen(true)}
          onDeleteTransaction={handleDeleteTransaction}
        />
      </main>

      {/* Modals */}
      <AddTransactionModal
        open={modalAddOpen}
        onOpenChange={setModalAddOpen}
        onAddTransaction={handleAddTransaction}
      />

      <SettingsModal
        open={modalSettingsOpen}
        onOpenChange={setModalSettingsOpen}
        onSaved={() => loadDashboardData(pagination.page, transactionFilter)}
      />
    </div>
  )
}
