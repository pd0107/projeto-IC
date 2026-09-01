/* Lógica do dashboard. Todos os números exibidos derivam exclusivamente de SAMPLES (data.js). */

const fmt = (n, opts = {}) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("pt-BR", opts);

const FLAT = [];
SAMPLES.forEach((s) => {
  s.dados.forEach((d) => {
    FLAT.push({
      amostra: s.amostra,
      sampleId: s.id,
      condicao: s.condicao,
      aditivo: s.aditivo,
      temperatura: d.temperatura,
      viscosidade: d.viscosidade,
      rotor: META.rotor,
      rpm: META.rpm,
    });
  });
});

/* ============ 1. VISÃO GERAL — KPIs ============ */
function computeKPIs() {
  const temps = FLAT.map((r) => r.temperatura);
  const viscs = FLAT.map((r) => r.viscosidade);
  const inibidores = new Set(
    SAMPLES.filter((s) => s.tipoAditivo === "inibidor").map((s) => s.aditivo)
  );
  return {
    totalAmostras: SAMPLES.length,
    totalMedicoes: FLAT.length,
    tempMin: Math.min(...temps),
    tempMax: Math.max(...temps),
    viscMin: Math.min(...viscs),
    viscMax: Math.max(...viscs),
    totalInibidores: inibidores.size,
  };
}

function renderKPIs() {
  const k = computeKPIs();
  const cards = [
    { label: "Amostras analisadas", value: fmt(k.totalAmostras), unit: "" },
    { label: "Medições registradas", value: fmt(k.totalMedicoes), unit: "" },
    { label: "Faixa de temperatura", value: `${fmt(k.tempMin)}–${fmt(k.tempMax)}`, unit: "°C" },
    { label: "Inibidores avaliados", value: fmt(k.totalInibidores), unit: "" },
  ];
  document.getElementById("kpi-grid").innerHTML = cards
    .map(
      (c) => `
    <div>
      <div><span class="quickfact-value">${c.value}</span><span class="quickfact-unit">${c.unit}</span></div>
      <div class="quickfact-label">${c.label}</div>
    </div>`
    )
    .join("");
}

/* ============ 3. CURVAS DE VISCOSIDADE ============ */
let chart;
let condFilter = "todas";
let visibility = {};
SAMPLES.forEach((s) => (visibility[s.id] = true));

function currentVisibleSeries() {
  return SAMPLES.map((s) => ({ ...s, visible: visibility[s.id] && (condFilter === "todas" || s.condicao === condFilter) }));
}

const CONDITION_LABEL = {
  Desidratado: "Desidratado (emulsionado)",
  Hidratado: "Hidratado (não emulsionado)",
};

function renderLegend() {
  const groups = { Desidratado: [], Hidratado: [] };
  SAMPLES.forEach((s) => groups[s.condicao].push(s));
  let html = "";
  Object.entries(groups).forEach(([cond, list]) => {
    html += `<div class="legend-group-label">${CONDITION_LABEL[cond] || cond}</div>`;
    list.forEach((s) => {
      const on = visibility[s.id];
      html += `
        <label class="legend-item ${on ? "" : "off"}" data-id="${s.id}">
          <input type="checkbox" ${on ? "checked" : ""} data-id="${s.id}" />
          <span class="legend-swatch legend-swatch--${s.lineStyle}" style="border-color:${s.color}"></span>
          <span class="legend-name">${s.aditivo}</span>
        </label>`;
    });
  });
  const legend = document.getElementById("chart-legend");
  legend.innerHTML = html;
  legend.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", (e) => {
      visibility[e.target.dataset.id] = e.target.checked;
      renderLegend();
      updateChart();
    });
  });
}

function updateChart() {
  chart.setSeries(currentVisibleSeries());
}

function initChart() {
  const canvas = document.getElementById("main-chart");
  chart = new LineChart(canvas, {
    xLabel: "Temperatura (°C)",
    yLabel: "Viscosidade (mP)",
    yScale: "linear",
    tooltipEl: document.getElementById("chart-tooltip"),
    gridColor: "rgba(16,17,13,0.10)",
    textColor: "rgba(16,17,13,0.62)",
    axisColor: "rgba(16,17,13,0.32)",
  });
  updateChart();

  document.getElementById("condicao-filter").addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    document.querySelectorAll("#condicao-filter .seg-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    condFilter = btn.dataset.cond;
    updateChart();
  });

  document.getElementById("scale-toggle").addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    document.querySelectorAll("#scale-toggle .seg-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    chart.setYScale(btn.dataset.scale);
  });

  document.getElementById("select-all").addEventListener("click", () => {
    SAMPLES.forEach((s) => (visibility[s.id] = true));
    renderLegend();
    updateChart();
  });
  document.getElementById("select-none").addEventListener("click", () => {
    SAMPLES.forEach((s) => (visibility[s.id] = false));
    renderLegend();
    updateChart();
  });
}

/* ============ 4. COMPARAÇÕES ============ */
function commonTempComparison(ref, other) {
  const rows = [];
  ref.dados.forEach((rp) => {
    const match = other.dados.find((d) => d.temperatura === rp.temperatura);
    if (match) {
      const diff = match.viscosidade - rp.viscosidade;
      const pct = (diff / rp.viscosidade) * 100;
      rows.push({
        temperatura: rp.temperatura,
        refVal: rp.viscosidade,
        outroVal: match.viscosidade,
        diff,
        pct,
      });
    }
  });
  return rows.sort((a, b) => b.temperatura - a.temperatura);
}

function renderComparisonBlock(condicao) {
  const samples = SAMPLES.filter((s) => s.condicao === condicao);
  const defaultRef = samples.find((s) => s.tipoAditivo === "referência") || samples[0];

  const container = document.createElement("div");
  container.className = "compare-block";

  const selectId = `ref-select-${condicao}`;
  container.innerHTML = `
    <h3>Amostras ${condicao.toLowerCase()}s</h3>
    <p class="compare-ref">
      Amostra de referência:
      <select id="${selectId}">
        ${samples.map((s) => `<option value="${s.id}" ${s.id === defaultRef.id ? "selected" : ""}>${s.aditivo}</option>`).join("")}
      </select>
    </p>
    <div class="compare-tables" id="compare-tables-${condicao}"></div>
  `;

  function renderTables(refId) {
    const ref = samples.find((s) => s.id === refId);
    const others = samples.filter((s) => s.id !== refId);
    const target = container.querySelector(`#compare-tables-${condicao}`);
    target.innerHTML = others
      .map((other) => {
        const rows = commonTempComparison(ref, other);
        if (!rows.length) {
          return `
            <div class="compare-table-wrap">
              <h4 style="font-size:0.88rem;margin:14px 0 4px;">${other.aditivo} vs. ${ref.aditivo}</h4>
              <p class="no-common">Sem temperatura comum para comparação direta.</p>
            </div>`;
        }
        return `
          <div class="compare-table-wrap">
            <h4 style="font-size:0.88rem;margin:14px 0 4px;">${other.aditivo} vs. ${ref.aditivo} <span class="muted-cell" style="font-style:normal;">(referência)</span></h4>
            <table class="compare-table">
              <thead>
                <tr>
                  <th>Temperatura (°C)</th>
                  <th>${ref.aditivo} (mP)</th>
                  <th>${other.aditivo} (mP)</th>
                  <th>Diferença absoluta (mP)</th>
                  <th>Variação (%)</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map((r) => {
                    const minIsRef = r.refVal <= r.outroVal;
                    return `
                    <tr>
                      <td>${fmt(r.temperatura)}</td>
                      <td style="${minIsRef ? "font-weight:700" : ""}">${fmt(r.refVal)}</td>
                      <td style="${!minIsRef ? "font-weight:700" : ""}">${fmt(r.outroVal)}</td>
                      <td>${r.diff > 0 ? "+" : ""}${fmt(r.diff)}</td>
                      <td class="${r.pct <= 0 ? "pct-neg" : "pct-pos"}">${r.pct > 0 ? "+" : ""}${fmt(r.pct, { maximumFractionDigits: 1 })}%</td>
                    </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>`;
      })
      .join("");
  }

  renderTables(defaultRef.id);
  container.querySelector(`#${selectId}`).addEventListener("change", (e) => renderTables(e.target.value));
  return container;
}

function renderComparisons() {
  const wrap = document.getElementById("comparacoes-content");
  wrap.innerHTML = "";
  wrap.appendChild(renderComparisonBlock("Desidratado"));
  wrap.appendChild(renderComparisonBlock("Hidratado"));
}

/* ============ 5. DADOS EXPERIMENTAIS ============ */
let tableSort = { key: "amostra", dir: 1 };
let tableState = { search: "", amostra: "", condicao: "" };

function populateTableFilters() {
  const sel = document.getElementById("filter-amostra");
  SAMPLES.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.amostra;
    opt.textContent = s.aditivo + " (" + s.condicao + ")";
    sel.appendChild(opt);
  });
}

function getFilteredRows() {
  let rows = FLAT.slice();
  if (tableState.amostra) rows = rows.filter((r) => r.amostra === tableState.amostra);
  if (tableState.condicao) rows = rows.filter((r) => r.condicao === tableState.condicao);
  if (tableState.search) {
    const q = tableState.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.amostra.toLowerCase().includes(q) ||
        r.condicao.toLowerCase().includes(q) ||
        r.aditivo.toLowerCase().includes(q)
    );
  }
  rows.sort((a, b) => {
    const va = a[tableSort.key];
    const vb = b[tableSort.key];
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * tableSort.dir;
    return String(va).localeCompare(String(vb), "pt-BR") * tableSort.dir;
  });
  return rows;
}

function renderTable() {
  const rows = getFilteredRows();
  document.getElementById("data-table-body").innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${r.amostra}</td>
      <td>${r.condicao}</td>
      <td>${r.aditivo}</td>
      <td>${r.temperatura ?? "—"}</td>
      <td>${r.viscosidade !== null && r.viscosidade !== undefined ? fmt(r.viscosidade) : "—"}</td>
      <td>${r.rotor ?? "—"}</td>
      <td>${r.rpm ?? "—"}</td>
    </tr>`
    )
    .join("");
  document.getElementById("table-count").textContent = `${rows.length} de ${FLAT.length} medições exibidas.`;
}

function initTable() {
  populateTableFilters();
  renderTable();

  document.getElementById("table-search").addEventListener("input", (e) => {
    tableState.search = e.target.value;
    renderTable();
  });
  document.getElementById("filter-amostra").addEventListener("change", (e) => {
    tableState.amostra = e.target.value;
    renderTable();
  });
  document.getElementById("filter-condicao").addEventListener("change", (e) => {
    tableState.condicao = e.target.value;
    renderTable();
  });
  document.querySelectorAll("#data-table thead th").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      if (tableSort.key === key) tableSort.dir *= -1;
      else {
        tableSort.key = key;
        tableSort.dir = 1;
      }
      renderTable();
    });
  });
  document.getElementById("export-csv").addEventListener("click", exportCSV);
}

function exportCSV() {
  const rows = getFilteredRows();
  const header = ["Amostra", "Condicao", "Aditivo", "Temperatura_C", "Viscosidade_mP", "Rotor", "RPM"];
  const csvLines = [header.join(";")];
  rows.forEach((r) => {
    csvLines.push(
      [r.amostra, r.condicao, r.aditivo, r.temperatura, r.viscosidade, r.rotor, r.rpm]
        .map((v) => `"${v}"`)
        .join(";")
    );
  });
  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dados_viscosidade_oleo_A.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ============ 7. METODOLOGIA — ficha técnica ============ */
function renderMethodology() {
  const temps = FLAT.map((r) => r.temperatura);
  const items = [
    { label: "Óleo", value: META.oleo },
    { label: "Rotor", value: META.rotor },
    { label: "Rotação", value: `${META.rpm} RPM` },
    { label: "Faixa de temperatura", value: `${fmt(Math.min(...temps))}–${fmt(Math.max(...temps))} °C` },
    { label: "Unidade de viscosidade", value: META.unidadeViscosidade },
    { label: "Número de medições", value: fmt(FLAT.length) },
  ];
  const el = document.getElementById("spec-strip");
  if (!el) return;
  el.innerHTML = items
    .map((it) => {
      const missing = it.value === null || it.value === undefined || it.value === "";
      return `
      <div class="spec-item">
        <div class="spec-item-label">${it.label}</div>
        <div class="spec-item-value ${missing ? "unavailable" : ""}">${missing ? "Informação não fornecida na planilha." : it.value}</div>
      </div>`;
    })
    .join("");
}

/* ============ Navegação ============ */
function initChrome() {
  const navToggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("main-nav");
  navToggle.addEventListener("click", () => nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("open")));

  initScrollSpy();
}

function initScrollSpy() {
  const navLinks = Array.from(document.querySelectorAll("#main-nav a"));
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  if (!sections.length || !("IntersectionObserver" in window)) return;

  const setActive = (id) => {
    navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${id}`));
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  sections.forEach((s) => observer.observe(s));
}

/* ============ Reveal on scroll (discreto, respeita prefers-reduced-motion) ============ */
function initReveal() {
  const items = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  items.forEach((el) => observer.observe(el));
}

/* ============ Boot ============ */
document.addEventListener("DOMContentLoaded", () => {
  renderKPIs();
  initChart();
  renderLegend();
  renderComparisons();
  initTable();
  renderMethodology();
  initChrome();
  initReveal();
});
