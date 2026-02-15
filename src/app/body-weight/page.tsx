"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Scale, TrendingUp, TrendingDown, Minus, Plus, Trash2 } from "lucide-react"
import { calculateWeightChangeRate, formatBodyWeight, type BodyWeightEntry } from "@/lib/body-metrics"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

type BodyMetricApi = {
  date: string
  weight?: number | null
  unit?: "metric" | "imperial"
  notes?: string | null
}

export default function BodyWeightPage() {
  const { isAuthenticated, user } = useAuthStore()
  const [entries, setEntries] = useState<BodyWeightEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [weight, setWeight] = useState("")
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs')
  const [notes, setNotes] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const loadEntries = useCallback(async () => {
    if (!user?.id) {
      setEntries([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/body-metrics?limit=365")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to load body weight entries")
      }

      const { metrics } = await response.json()
      const mappedEntries = (metrics as BodyMetricApi[])
        .filter((metric) => typeof metric.weight === "number")
        .map((metric) => ({
          userId: user.id,
          date: metric.date,
          weight: metric.weight as number,
          unit: (metric.unit === "metric" ? "kg" : "lbs") as "kg" | "lbs",
          notes: metric.notes || undefined,
        }))

      setEntries(mappedEntries)
    } catch (error) {
      console.error("Error loading body weight entries:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id || !weight) return

    setIsSaving(true)
    try {
      const entry: BodyWeightEntry = {
        userId: user.id,
        date: selectedDate,
        weight: parseFloat(weight),
        unit,
        notes: notes || undefined,
      }

      const response = await fetch("/api/body-metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: entry.date,
          weight: entry.weight,
          unit: entry.unit === "kg" ? "metric" : "imperial",
          notes: entry.notes ?? null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save body weight")
      }

      await loadEntries()

      // Reset form
      setWeight("")
      setNotes("")
      setSelectedDate(new Date().toISOString().split('T')[0])
    } catch (error) {
      console.error("Error saving body weight:", error)
      alert("Failed to save body weight. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(date: string) {
    if (!user?.id) return
    if (!confirm("Delete this weight entry?")) return

    try {
      const response = await fetch(`/api/body-metrics/${encodeURIComponent(date)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete body weight")
      }

      await loadEntries()
    } catch (error) {
      console.error("Error deleting entry:", error)
      alert("Failed to delete entry. Please try again.")
    }
  }

  if (!isAuthenticated) {
    return <Login />
  }

  // Calculate weight change rate
  const changeRate = calculateWeightChangeRate(entries, 30) // Last 30 days

  // Prepare chart data
  const chartData = [...entries]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-90) // Last 90 days
    .map(entry => ({
      date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: entry.unit === 'kg' ? entry.weight * 2.20462 : entry.weight, // Normalize to lbs
    }))

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-4">
        <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
              <Scale className="h-8 w-8 text-primary" />
              Body Weight
            </h1>
          </div>

          {/* Weight Trend Card */}
          {changeRate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {changeRate.trend === 'gaining' && <TrendingUp className="h-5 w-5 text-green-500" />}
                  {changeRate.trend === 'losing' && <TrendingDown className="h-5 w-5 text-blue-500" />}
                  {changeRate.trend === 'stable' && <Minus className="h-5 w-5 text-text-secondary" />}
                  30-Day Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {changeRate.trend === 'gaining' && '+'}
                  {(changeRate.rate * 30).toFixed(1)} lbs
                </div>
                <p className="text-sm text-text-secondary mt-1">
                  {changeRate.trend === 'gaining' && 'You are gaining weight'}
                  {changeRate.trend === 'losing' && 'You are losing weight'}
                  {changeRate.trend === 'stable' && 'Your weight is stable'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Log Weight Form */}
          <Card>
            <CardHeader>
              <CardTitle>Log Weight</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="185.5"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <select
                      id="unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as 'lbs' | 'kg')}
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-text-primary"
                    >
                      <option value="lbs">lbs</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input
                    id="notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Morning weight, after breakfast, etc."
                  />
                </div>

                <Button type="submit" disabled={isSaving} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Log Weight'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Weight Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Weight History (Last 90 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                      domain={['dataMin - 5', 'dataMax + 5']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '0.375rem',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#06B6D4"
                      strokeWidth={2}
                      dot={{ fill: '#06B6D4', r: 4 }}
                      name="Weight (lbs)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Weight History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Weight Log</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingSpinner text="Loading weight history..." />
              ) : entries.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No weight entries yet. Log your first weight above!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.slice(0, 30).map((entry) => (
                    <div
                      key={entry.date}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-elevated transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-text-primary">
                          {formatBodyWeight(entry.weight, entry.unit)}
                        </div>
                        <div className="text-sm text-text-secondary">
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        {entry.notes && (
                          <div className="text-xs text-text-secondary mt-1">
                            {entry.notes}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.date)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
    </>
  )
}
