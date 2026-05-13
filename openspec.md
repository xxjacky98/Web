# OpenSpec：作業4「台電平均電價（元/度）觀測站」

> 用這份 spec 對照作業 checklist，並紀錄實作過程；你可以把重點貼到 Notion 當「規格表」。

## Checklist 對照
- A1：`npm install` + `npm start` 可啟動（無錯誤）
- A2：網站自訂標題：電費每度價格觀測站（台電）
- A3：輸入介面包含【日期】【商品名稱】【商品價格】
- A4：資料寫入 SQLite，刷新頁面仍存在
- A5：用表格呈現所有歷史紀錄
- A6：至少 3 筆測試資料（XLS 匯入或 fallback 種子資料）
- B1：前端為 HTML/CSS/JavaScript（無框架）
- B2：後端為 Express.js Web API
- B3：資料庫為 SQLite
- B4：前端用 `fetch` 呼叫 API 讀寫資料
- C1–C4：上傳 GitHub（不含 `node_modules`、有 `package.json`、可瀏覽）
- D1–D5：Notion 文件（介紹 + 理由 + 截圖 + 程式片段 + 教學）

## 需求與設計決策
- 主題只追蹤：`台電 平均電價(元/度)`
- 以 `YYYY-01-01` 表示某一年度的資料（表格顯示年別）
- 價格固定四捨五入到小數點後 4 位（顯示與寫入一致）

## API 規格
### GET /api/prices
- 回傳：`[{ id, date, name, price, created_at }]`
- 排序：`date DESC, id DESC`

### POST /api/prices
- Body：`{ date, name, price }`
- 驗證：
  - `date` 必須是 `YYYY-MM-DD`
  - `price` 必須是正數
- 行為：`name` 會被正規化為 `台電 平均電價(元/度)`（本題固定追蹤一條序列）
- 成功回傳：新增後那筆資料

### POST /api/taipower/import
- 行為：讀取 `歷年電價一覽表.xls`（本機檔案）並匯入歷年平均電價
- 回傳：`{ inserted, sheet, xlsPath }`

### POST /api/taipower/reset-import
- 行為：先清空 `prices` 再匯入（避免重複）
- 回傳：`{ inserted, sheet, xlsPath, cleared: true }`

## DB 規格
- 檔案：`data/prices.sqlite`
- Table：`prices`
  - `id INTEGER PRIMARY KEY AUTOINCREMENT`
  - `date TEXT NOT NULL`
  - `name TEXT NOT NULL`
  - `price REAL NOT NULL`
  - `created_at TEXT NOT NULL`

## 實作流程紀錄（你可貼 Notion）
1. 建立 Express server + static frontend
2. 建立 SQLite schema + 初始化（表空時匯入 XLS 或塞 3 筆種子資料）
3. 實作 API：讀取列表、寫入一筆、匯入/清空後匯入 XLS
4. 前端用 `fetch` 串 API：新增、匯入、表格、圖表、年份範圍查詢

