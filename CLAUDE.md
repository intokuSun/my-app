# Market Dashboard App

## 项目概述
一个实时展示全球大宗商品价格和股指期货的 Web Dashboard。

## 技术栈
- **前端**: React + Vite + TypeScript + TailwindCSS
- **后端**: FastAPI (Python 3.11)
- **数据源**: 公开第三方 API（免费）

## 功能需求
1. 大宗商品价格：黄金、白银、原油(WTI/Brent)、天然气、铜、小麦、大豆等
2. 股指期货：S&P500、纳斯达克、道琼斯、日经225、恒生、DAX、富时100等
3. 自动刷新（可配置间隔）
4. 按类别分组展示
5. 涨跌颜色标识（红/绿）

## 数据 API
- Yahoo Finance (yfinance Python库，免费无需注册)
- 备用：Alpha Vantage（免费 API key）

## 目录结构
```
src/
├── frontend/   # React 应用
└── backend/    # FastAPI 应用
```

## 开发规范
- 后端端口: 8000
- 前端端口: 5173
- API 前缀: /api/v1
- 数据刷新间隔: 60秒（可配置）
