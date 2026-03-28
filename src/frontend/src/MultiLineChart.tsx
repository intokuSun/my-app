import { useEffect, useRef, useState } from 'react'
import { createChart, LineSeries } from 'lightweight-charts'

interface LinePoint { time: number; value: number }
interface MultiLineData { [name: string]: LinePoint[] }

const COLORS = [
  '#2196F3', '#4CAF50', '#FF5722', '#E91E63', '#FF9800',
  '#00BCD4', '#9C27B0', '#8BC34A', '#F44336', '#3F51B5',
  '#009688', '#FFC107', '#673AB7', '#03A9F4', '#CDDC39',
  '#795548', '#607D8B', '#FF5252', '#69F0AE',
]

const PERIOD_OPTIONS = [
  { label: '3个月', value: '3mo' },
  { label: '6个月', value: '6mo' },
  { label: '1年',   value: '1y'  },
  { label: '2年',   value: '2y'  },
]

export default function MultiLineChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const seriesRef = useRef<Map<string, ReturnType<typeof chartRef.current.addSeries>>>(new Map())
  const [period, setPeriod] = useState('1y')
  const [data, setData] = useState<MultiLineData>({})
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const names = Object.keys(data)

  // Fetch data
  useEffect(() => {
    setLoading(true)
    fetch(`/api/v1/multiline?period=${period}`)
      .then(r => r.json())
      .then(json => { setData(json.data ?? {}); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period])

  // Build / rebuild chart when data changes
  useEffect(() => {
    if (!containerRef.current || loading || names.length === 0) return

    // Destroy old chart
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      seriesRef.current.clear()
    }

    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#1f2937' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#374151' },
      timeScale: { borderColor: '#374151', timeVisible: true },
      width: containerRef.current.clientWidth,
      height: 420,
    })
    chartRef.current = chart

    names.forEach((name, i) => {
      const color = COLORS[i % COLORS.length]
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: name === 'S&P500' ? 2 : 1,
        priceFormat: { type: 'custom', formatter: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` },
      })
      series.setData(data[name])
      seriesRef.current.set(name, series)
    })

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.resize(containerRef.current.clientWidth, 420)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [data, loading])

  // Toggle series visibility
  const toggle = (name: string) => {
    const series = seriesRef.current.get(name)
    if (!series) return
    const next = new Set(hidden)
    if (next.has(name)) {
      next.delete(name)
      series.applyOptions({ visible: true })
    } else {
      next.add(name)
      series.applyOptions({ visible: false })
    }
    setHidden(next)
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-bold text-base">📉 全资产归一化走势对比（基准=起始点0%）</h2>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors
                ${period === p.value ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          ⏳ 加载走势数据中（约15秒）...
        </div>
      )}

      <div ref={containerRef} className={loading ? 'hidden' : ''} />

      {/* Legend */}
      {!loading && names.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {names.map((name, i) => {
            const color = COLORS[i % COLORS.length]
            const isHidden = hidden.has(name)
            return (
              <button key={name} onClick={() => toggle(name)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-opacity ${isHidden ? 'opacity-30' : 'opacity-100'}`}>
                <span style={{ background: color, width: 10, height: 10, borderRadius: 2, display: 'inline-block' }} />
                <span className="text-gray-300">{name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
