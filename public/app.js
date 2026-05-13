const AVG_NAME = "台電 平均電價(元/度)";

function qs(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

function setMsg(text, kind = "info") {
  const el = qs("#form-msg");
  el.textContent = text;
  el.dataset.kind = kind;
}

function setDemoMsg(text, kind = "info") {
  const el = qs("#demo-msg");
  el.textContent = text;
  el.dataset.kind = kind;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmt4(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(4);
}

function yearFromDate(dateStr) {
  if (typeof dateStr !== "string") return "";
  return dateStr.slice(0, 4);
}

async function fetchPrices() {
  const res = await fetch("/api/prices", { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET /api/prices failed: ${res.status}`);
  return res.json();
}

async function createPrice(payload) {
  const res = await fetch("/api/prices", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.error ? data.error : `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function callSimplePost(url) {
  const res = await fetch(url, { method: "POST", headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.error ? data.error : `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function filterByYearRange(rows, startYear, endYear) {
  const s = Number(startYear);
  const e = Number(endYear);
  const hasS = Number.isFinite(s);
  const hasE = Number.isFinite(e);
  if (!hasS && !hasE) return rows;

  return rows.filter((r) => {
    const y = Number(yearFromDate(r.date));
    if (!Number.isFinite(y)) return false;
    if (hasS && y < s) return false;
    if (hasE && y > e) return false;
    return true;
  });
}

function renderRows(rows) {
  const tbody = qs("#rows");
  const onlyAvg = (rows || []).filter((r) => (r?.name || "").trim() === AVG_NAME);

  if (!Array.isArray(onlyAvg) || onlyAvg.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">沒有資料</td></tr>`;
    return;
  }

  // date DESC then id DESC already from API, but keep stable
  tbody.innerHTML = onlyAvg
    .map((r) => {
      return `
        <tr>
          <td>${escapeHtml(yearFromDate(r.date))}</td>
          <td class="num">${escapeHtml(fmt4(r.price))}</td>
          <td class="mono">${escapeHtml(r.created_at)}</td>
        </tr>
      `;
    })
    .join("");
}

/** @type {any | null} */
let chartInstance = null;

function buildSeries(rows) {
  const onlyAvg = (rows || []).filter((r) => (r?.name || "").trim() === AVG_NAME);
  const asc = [...onlyAvg].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return {
    labels: asc.map((r) => yearFromDate(r.date)),
    values: asc.map((r) => Number(r.price)),
  };
}

function renderChart(rows) {
  const canvas = qs("#chart");
  const ChartLib = window.Chart;
  if (!ChartLib) return;

  const { labels, values } = buildSeries(rows);
  if (chartInstance) chartInstance.destroy();

  chartInstance = new ChartLib(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: AVG_NAME,
          data: values,
          borderColor: "rgba(122, 162, 255, 1)",
          backgroundColor: "rgba(122, 162, 255, 0.15)",
          tension: 0.25,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (ctx) => `${AVG_NAME}: ${fmt4(ctx.parsed.y)} 元/度`,
          },
        },
      },
      scales: {
        y: {
          title: { display: true, text: "電價（元/度）" },
          ticks: {
            callback: (v) => fmt4(v),
          },
        },
        x: {
          title: { display: true, text: "年別" },
        },
      },
    },
  });
}

function initDefaultDateAndName() {
  const dateInput = qs("#date");
  const nameInput = qs("#name");
  if (!dateInput.value) {
    const today = new Date();
    dateInput.value = `${today.getFullYear()}-01-01`;
  }
  nameInput.value = AVG_NAME;
}

async function reloadAndRender({ startYear, endYear } = {}) {
  const allRows = await fetchPrices();
  const filtered = filterByYearRange(allRows, startYear, endYear);
  renderRows(filtered);
  renderChart(filtered);
}

window.addEventListener("DOMContentLoaded", async () => {
  initDefaultDateAndName();

  qs("#create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("新增中…");

    const payload = {
      date: qs("#date").value,
      name: qs("#name").value,
      price: Number(qs("#price").value),
    };

    try {
      await createPrice(payload);
      qs("#price").value = "";
      setMsg("新增成功", "ok");
      await reloadAndRender({
        startYear: qs("#start-year").value,
        endYear: qs("#end-year").value,
      });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "新增失敗", "err");
    }
  });

  qs("#apply-filter").addEventListener("click", async () => {
    try {
      await reloadAndRender({
        startYear: qs("#start-year").value,
        endYear: qs("#end-year").value,
      });
    } catch (err) {
      console.error(err);
      setMsg("查詢失敗：請確認後端是否正常啟動", "err");
    }
  });

  qs("#import-taipower").addEventListener("click", async () => {
    setDemoMsg("匯入中…");
    try {
      const r = await callSimplePost("/api/taipower/import");
      setDemoMsg(`匯入完成：新增 ${r.inserted} 筆`, "ok");
      await reloadAndRender({
        startYear: qs("#start-year").value,
        endYear: qs("#end-year").value,
      });
    } catch (err) {
      setDemoMsg(err instanceof Error ? err.message : "匯入失敗", "err");
    }
  });

  qs("#reset-import-taipower").addEventListener("click", async () => {
    setDemoMsg("清空 + 匯入中…");
    try {
      const r = await callSimplePost("/api/taipower/reset-import");
      setDemoMsg(`清空後匯入完成：新增 ${r.inserted} 筆`, "ok");
      await reloadAndRender({
        startYear: qs("#start-year").value,
        endYear: qs("#end-year").value,
      });
    } catch (err) {
      setDemoMsg(err instanceof Error ? err.message : "匯入失敗", "err");
    }
  });

  try {
    await reloadAndRender();
  } catch (err) {
    console.error(err);
    setMsg("載入失敗：請確認後端是否正常啟動", "err");
  }
});

