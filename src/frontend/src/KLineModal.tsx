import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'

const INTERVALS = [
  { label: '1日', value: '1d' },
  { label: '1周', value: '1w' },
  { label: '1月', value: '1m' },
  { label: '3月', value: '3m' },
  { label: '1年', value: '1y' },
  { label: '5年', value: '5y' },
]

interface Props {
  symbol: string
  name: string
  onClose: () => void
}

export default function KLineModal({ symbol, name, onClose }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [interval, setInterval] = useState('1m')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!chartRef.current) return
    const chart = createChart(chartRef.current, {
      layout: { background: { color: '#1f2937' }, textColor: '#d1d5db' },
      grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
      width: chartRef.current.clientWidth,
      height: 400,
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    })

    setLoading(true)
    setError('')
    fetch(`/api/v1/kline/${encodeURIComponent(symbol)}?interval=${interval}`)
      .then(r => r.json())
      .then(d => {
        if (d.detail) throw new Error(d.detail)
        series.setData(d.data)
        chart.timeScale().fitContent()
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

    const ro = new ResizeObserver(() => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth })
    })
    ro.observe(chartRef.current)

    return () => { chart.remove(); ro.disconnect() }
  }, [symbol, interval])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl p-5 w-full max-w-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-white font-bold text-lg">{name}</span>
            <span className="text-gray-400 text-sm ml-2">{symbol}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="flex gap-2 mb-4">
          {INTERVALS.map(iv => (
            <button key={iv.value}
              onClick={() => setInterval(iv.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors
                ${interval === iv.value ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {iv.label}
            </button>
          ))}
        </div>
        {loading && <div className="text-gray-400 text-center py-10">加载中...</div>}
        {error && <div className="text-red-400 text-center py-10">{error}</div>}
        <div ref={chartRef} className={loading || error ? 'hidden' : ''} />
      </div>
    </div>
  )
}
