# /open — 启动并打开 Market Dashboard

在本地启动前后端服务，并在浏览器中打开网站。

## 步骤

1. 检查后端（FastAPI）是否已在 8000 端口运行，如果没有则启动：
```bash
lsof -ti:8000 || (cd /Users/SUN/Projects/my-app/src/backend && uvicorn main:app --reload --port 8000 > /tmp/backend.log 2>&1 &)
```

2. 检查前端（Vite）是否已在 5173 端口运行，如果没有则启动：
```bash
lsof -ti:5173 || (cd /Users/SUN/Projects/my-app/src/frontend && npm run dev > /tmp/frontend.log 2>&1 &)
```

3. 等待服务就绪后，在 Chrome 中打开：
```bash
sleep 3 && python3 -c "
import urllib.request, json
req = urllib.request.Request('http://127.0.0.1:9222/json/new?http://localhost:5173', method='PUT')
resp = urllib.request.urlopen(req)
print('Opened:', json.loads(resp.read())['url'])
" 2>/dev/null || open http://localhost:5173
```

完成后告知用户网站已在 http://localhost:5173 打开。
