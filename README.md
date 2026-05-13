# 電費每度價格觀測站（台電）

主題：用自己的資料追蹤「台電 平均電價（元/度）」的歷年變化（個人化 CPI 概念）。

技術：前端原生 HTML/CSS/JavaScript + 後端 Express.js + SQLite

## 功能（對照 checklist）
- `npm install` + `npm start` 可在本機啟動（A1）
- 自訂標題：電費每度價格觀測站（台電）（A2）
- 可輸入：日期 / 商品名稱 / 商品價格（元/度）（A3）
- 資料寫入 SQLite，刷新頁面仍存在（A4）
- 表格呈現所有歷史紀錄（A5）
- 至少 3 筆測試資料：若找不到 `歷年電價一覽表.xls` 會自動塞 3 筆示範資料（A6）
- 圖表呈現價格趨勢（加分/展示用）
- 可從 `歷年電價一覽表.xls` 一鍵匯入歷年平均電價

## 本機啟動
```bash
npm install
npm start
```
瀏覽：`http://localhost:3000`

## 資料來源（本機匯入）
- 下載 `歷年電價一覽表.xls` 放在：
  - `C:\Users\xxjac\Downloads\歷年電價一覽表.xls`（預設）
  - 或設定環境變數 `TAIPOWER_XLS_PATH` 指到你的檔案路徑

## API
- `GET /api/prices`
- `POST /api/prices`
  - JSON body：`{ "date": "YYYY-MM-DD", "name": "台電 平均電價(元/度)", "price": 2.7383 }`
- `POST /api/taipower/import`（保留現有資料，追加匯入）
- `POST /api/taipower/reset-import`（清空後重新匯入，避免重複）

## SQLite
- DB：`data/prices.sqlite`
- Table：`prices(id, date, name, price, created_at)`

