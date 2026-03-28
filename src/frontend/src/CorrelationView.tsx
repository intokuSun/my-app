import { useEffect, useState } from 'react'
import MultiLineChart from './MultiLineChart'

interface CorrItem {
  name: string
  symbol: string
  correlation: number
  strength: string
  insight: string
}

interface CorrData {
  data: CorrItem[]
  base: string
  period: string
  updated_at: string
}

const PERIODS = [
  { label: '3个月', value: '3mo' },
  { label: '6个月', value: '6mo' },
  { label: '1年', value: '1y' },
  { label: '2年', value: '2y' },
]

function CorrelationBar({ item }: { item: CorrItem }) {
  const c = item.correlation
  const isPos = c >= 0
  const pct = Math.abs(c) * 100

  const color = c > 0.5 ? 'bg-green-500' : c > 0.2 ? 'bg-green-400' :
    c > 0 ? 'bg-green-300' : c > -0.2 ? 'bg-red-300' :
    c > -0.5 ? 'bg-red-400' : 'bg-red-500'

  const textColor = c > 0.3 ? 'text-green-400' : c < -0.3 ? 'text-red-400' : 'text-gray-400'

  return (
    <div className="bg-gray-800 rounded-xl p-4 hover:bg-gray-750 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-white font-semibold">{item.name}</span>
          <span className="text-gray-500 text-xs ml-2">{item.symbol}</span>
        </div>
        <div className="text-right">
          <span className={`font-bold text-lg ${textColor}`}>{c > 0 ? '+' : ''}{c.toFixed(3)}</span>
          <div className="text-xs text-gray-400">{item.strength}</div>
        </div>
      </div>

      {/* Bar chart centered at 0 */}
      <div className="relative h-3 bg-gray-700 rounded-full my-2">
        <div className="absolute top-0 bottom-0 w-px bg-gray-500" style={{ left: '50%' }} />
        {isPos ? (
          <div className={`absolute top-0 bottom-0 rounded-full ${color}`}
            style={{ left: '50%', width: `${pct / 2}%` }} />
        ) : (
          <div className={`absolute top-0 bottom-0 rounded-full ${color}`}
            style={{ right: `${50}%`, left: `${50 - pct / 2}%` }} />
        )}
      </div>

      <p className="text-gray-400 text-xs mt-2">{item.insight}</p>
    </div>
  )
}

export default function CorrelationView({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<CorrData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('1y')
  const [error, setError] = useState('')

  const fetchData = async (p: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/v1/correlation?period=${p}`)
      const json = await res.json()
      setData(json)
    } catch {
      setError('加载失败，请检查后端是否运行')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(period) }, [period])

  const positives = data?.data.filter(d => d.correlation > 0) ?? []
  const negatives = data?.data.filter(d => d.correlation <= 0) ?? []

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
            ← 返回行情
          </button>
          <h1 className="text-2xl font-bold text-white">📈 与美股相关性分析</h1>
        </div>

        {/* Period selector */}
        <div className="flex gap-2 mb-6">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${period === p.value ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {p.label}
            </button>
          ))}
          {data && (
            <span className="ml-auto text-gray-500 text-xs self-center">
              更新: {new Date(data.updated_at).toLocaleTimeString()}（1小时缓存）
            </span>
          )}
        </div>

        {/* Multi-line trend chart */}
        <MultiLineChart />

        {loading && (
          <div className="text-center py-20">
            <div className="text-gray-400 text-lg mb-2">⏳ 计算相关性中...</div>
            <div className="text-gray-500 text-sm">正在获取全球市场1年数据，约需20秒</div>
          </div>
        )}
        {error && <div className="text-red-400 text-center py-20">{error}</div>}

        {data && !loading && (
          <>
            {/* Legend */}
            <div className="bg-gray-800 rounded-xl p-4 mb-6 flex flex-wrap gap-4 text-sm">
              <span className="text-gray-400">相关系数说明：</span>
              <span className="text-green-400">▌ 正相关（同涨跌）</span>
              <span className="text-red-400">▌ 负相关（反向波动）</span>
              <span className="text-gray-400">|0.5+| = 强 &nbsp;|0.2-0.5| = 中 &nbsp;|0-0.2| = 弱</span>
            </div>

            {/* Positive */}
            <h2 className="text-green-400 font-bold text-lg mb-3">
              🟢 正相关资产（美股涨时同涨）— {positives.length} 个
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {positives.map(item => <CorrelationBar key={item.name} item={item} />)}
            </div>

            {/* Negative */}
            <h2 className="text-red-400 font-bold text-lg mb-3">
              🔴 负相关资产（美股涨时反跌）— {negatives.length} 个
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {negatives.map(item => <CorrelationBar key={item.name} item={item} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
