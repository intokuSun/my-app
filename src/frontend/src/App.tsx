import { useEffect, useState } from 'react'
import KLineModal from './KLineModal'

interface Quote {
  name: string
  symbol: string
  price: number | null
  change: number
  change_pct: number
  currency: string
}

interface MarketData {
  commodities: Quote[]
  indices: Quote[]
  updated_at: string
}

function QuoteCard({ q, onClick }: { q: Quote; onClick: () => void }) {
  const up = q.change_pct >= 0
  return (
    <div onClick={onClick}
      className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1 cursor-pointer hover:bg-gray-700 hover:ring-1 hover:ring-blue-500 transition-all">
      <div className="text-gray-400 text-xs">{q.symbol}</div>
      <div className="text-white font-semibold text-sm">{q.name}</div>
      <div className="text-xl font-bold text-white mt-1">
        {q.price != null ? q.price.toLocaleString() : '—'}
        <span className="text-xs ml-1 text-gray-400">{q.currency}</span>
      </div>
      <div className={`text-sm font-medium ${up ? 'text-green-400' : 'text-red-400'}`}>
        {up ? '▲' : '▼'} {Math.abs(q.change).toFixed(2)} ({Math.abs(q.change_pct).toFixed(2)}%)
      </div>
    </div>
  )
}

function Section({ title, data, onSelect }: { title: string; data: Quote[]; onSelect: (q: Quote) => void }) {
  return (
    <div className="mb-8">
      <h2 className="text-white text-lg font-bold mb-3 border-b border-gray-700 pb-2">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {data.map(q => <QuoteCard key={q.symbol} q={q} onClick={() => onSelect(q)} />)}
      </div>
    </div>
  )
}

export default function App() {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Quote | null>(null)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/v1/all')
      const json = await res.json()
      setData(json)
      setError('')
    } catch {
      setError('无法连接后端，请确认后端已启动')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">🌍 全球市场行情</h1>
          <div className="text-gray-400 text-sm flex items-center gap-2">
            {data && `更新: ${new Date(data.updated_at).toLocaleTimeString()}`}
            <button onClick={fetchData} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs">刷新</button>
          </div>
        </div>
        {loading && <div className="text-gray-400 text-center py-20">加载中...</div>}
        {error && <div className="text-red-400 text-center py-20">{error}</div>}
        {data && (
          <>
            <Section title="📊 股指期货" data={data.indices} onSelect={setSelected} />
            <Section title="🛢️ 大宗商品" data={data.commodities} onSelect={setSelected} />
          </>
        )}
      </div>
      {selected && <KLineModal symbol={selected.symbol} name={selected.name} onClose={() => setSelected(null)} />}
    </div>
  )
}
