# Skill: React + FastAPI 数据看板模板

## 触发方式
当用户说"创建一个数据看板"、"新建 dashboard 项目"、"react python app" 等时使用本 skill。

## 项目模板概要

### 技术栈
- **前端**: React + Vite + TypeScript + TailwindCSS v4 + lightweight-charts
- **后端**: FastAPI (Python 3.11) + uvicorn
- **数据**: yfinance（金融数据）或其他第三方公开 API
- **图表**: TradingView lightweight-charts（K线/折线）

### 目录结构
```
<project-root>/
├── CLAUDE.md
├── .gitignore
├── src/
│   ├── frontend/          # Vite + React 项目
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── KLineModal.tsx  # 或其他图表组件
│   │   │   └── index.css      # @import "tailwindcss";
│   │   ├── vite.config.ts     # proxy /api → localhost:8000
│   │   └── package.json
│   └── backend/
│       ├── main.py            # FastAPI 入口
│       └── requirements.txt
```

### 关键配置片段

**vite.config.ts（含 proxy 和 Tailwind）**
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
})
```

**index.css**
```css
@import "tailwindcss";
```

**FastAPI 基础结构（main.py）**
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**K线图组件（lightweight-charts v5）**
```ts
import { createChart, CandlestickSeries } from 'lightweight-charts'
// series = chart.addSeries(CandlestickSeries, { ... })
// series.setData([{ time, open, high, low, close }, ...])
```

### 安装命令速查
```bash
# 前端
npm create vite@latest frontend -- --template react-ts
npm install -D tailwindcss @tailwindcss/vite
npm install lightweight-charts

# 后端
pip3 install fastapi uvicorn yfinance python-dotenv
```

### 启动命令
```bash
# 后端（在 src/backend/）
uvicorn main:app --reload --port 8000

# 前端（在 src/frontend/）
npm run dev
```

### 数据 API 模式（yfinance）
```python
import yfinance as yf

# 实时报价
ticker = yf.Ticker("GC=F")  # 黄金期货
info = ticker.fast_info
price = info.last_price
prev = info.previous_close

# K线历史
df = ticker.history(period="3mo", interval="1d")
# df 包含 Open, High, Low, Close, Volume
```

### 常用 Yahoo Finance Symbol
| 品种 | Symbol |
|------|--------|
| 黄金期货 | GC=F |
| 白银期货 | SI=F |
| 原油(WTI) | CL=F |
| 原油(Brent) | BZ=F |
| S&P500期货 | ES=F |
| 纳斯达克期货 | NQ=F |
| 道琼斯期货 | YM=F |
| 恒生指数 | ^HSI |
| 日经225 | NK=F |
| 沪深300 | 000300.SS |
| DAX期货 | FDAX=F |

### .gitignore 要点
```
__pycache__/ *.env venv/ node_modules/ dist/ build/
CLAUDE.local.md .claude/settings.local.json .DS_Store
```

## 复用步骤
1. `mkdir -p <new-project>/src/frontend <new-project>/src/backend`
2. 按上方命令安装依赖
3. 复制 vite.config.ts 和 main.py 骨架
4. 根据新项目需求替换数据源和 UI 组件
