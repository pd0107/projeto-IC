/*
 * Motor de gráfico de linhas em Canvas puro (sem dependências externas).
 * Suporta: escala linear/log no eixo Y, múltiplas séries com toggle de
 * visibilidade, tooltip por proximidade e alto contraste para projeção.
 */

class LineChart {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.opts = Object.assign(
      {
        xLabel: "",
        yLabel: "",
        yScale: "linear", // 'linear' | 'log'
        padding: { top: 24, right: 24, bottom: 52, left: 78 },
        gridColor: "rgba(120,130,140,0.18)",
        textColor: "#4a5568",
        axisColor: "rgba(120,130,140,0.4)",
      },
      opts
    );
    this.series = [];
    this.tooltipEl = opts.tooltipEl || null;
    this._bindEvents();
    this._resizeObserver = new ResizeObserver(() => this.render());
    this._resizeObserver.observe(canvas.parentElement);
  }

  setSeries(series) {
    this.series = series;
    this.render();
  }

  setYScale(scale) {
    this.opts.yScale = scale;
    this.render();
  }

  _bindEvents() {
    this.canvas.addEventListener("mousemove", (e) => this._onHover(e));
    this.canvas.addEventListener("mouseleave", () => this._hideTooltip());
    this.canvas.addEventListener("touchstart", (e) => this._onHover(e.touches[0]), { passive: true });
  }

  _visibleSeries() {
    return this.series.filter((s) => s.visible && s.dados && s.dados.length);
  }

  _computeDomain() {
    const vis = this._visibleSeries();
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    vis.forEach((s) => {
      s.dados.forEach((p) => {
        if (p.temperatura < xMin) xMin = p.temperatura;
        if (p.temperatura > xMax) xMax = p.temperatura;
        if (p.viscosidade < yMin) yMin = p.viscosidade;
        if (p.viscosidade > yMax) yMax = p.viscosidade;
      });
    });
    if (!isFinite(xMin)) {
      xMin = 0; xMax = 1; yMin = 0; yMax = 1;
    }
    const xPad = (xMax - xMin) * 0.06 || 1;
    return {
      xMin: xMin - xPad,
      xMax: xMax + xPad,
      yMin,
      yMax,
    };
  }

  _setupCanvasSize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(rect.width, 280);
    const h = Math.max(rect.height, 320);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
  }

  _sx(x, domain) {
    const { left, right } = this.opts.padding;
    const plotW = this.width - left - right;
    return left + ((x - domain.xMin) / (domain.xMax - domain.xMin)) * plotW;
  }

  _sy(y, domain) {
    const { top, bottom } = this.opts.padding;
    const plotH = this.height - top - bottom;
    if (this.opts.yScale === "log") {
      const yMinLog = Math.log10(Math.max(domain.yMin, 1));
      const yMaxLog = Math.log10(Math.max(domain.yMax, 10));
      const yLog = Math.log10(Math.max(y, 1));
      return top + plotH - ((yLog - yMinLog) / (yMaxLog - yMinLog)) * plotH;
    }
    const yPad = (domain.yMax - domain.yMin) * 0.08 || 1;
    const yMin = domain.yMin - yPad;
    const yMax = domain.yMax + yPad;
    return top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;
  }

  _niceLinearTicks(min, max, count = 6) {
    const range = max - min || 1;
    const rough = range / count;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step;
    if (norm < 1.5) step = mag;
    else if (norm < 3) step = 2 * mag;
    else if (norm < 7) step = 5 * mag;
    else step = 10 * mag;
    const ticks = [];
    let t = Math.ceil(min / step) * step;
    for (; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 1000) / 1000);
    return ticks;
  }

  _logTicks(min, max) {
    const lo = Math.floor(Math.log10(Math.max(min, 1)));
    const hi = Math.ceil(Math.log10(Math.max(max, 10)));
    const ticks = [];
    for (let e = lo; e <= hi; e++) ticks.push(Math.pow(10, e));
    return ticks;
  }

  render() {
    this._setupCanvasSize();
    const ctx = this.ctx;
    const domain = this._computeDomain();
    ctx.clearRect(0, 0, this.width, this.height);

    const { left, right, top, bottom } = this.opts.padding;
    const plotW = this.width - left - right;
    const plotH = this.height - top - bottom;

    // grid + axis
    ctx.strokeStyle = this.opts.gridColor;
    ctx.fillStyle = this.opts.textColor;
    ctx.font = "11px -apple-system, 'Segoe UI', sans-serif";
    ctx.lineWidth = 1;

    const yTicks =
      this.opts.yScale === "log"
        ? this._logTicks(domain.yMin, domain.yMax)
        : this._niceLinearTicks(
            domain.yMin - (domain.yMax - domain.yMin) * 0.08,
            domain.yMax + (domain.yMax - domain.yMin) * 0.08
          );

    yTicks.forEach((t) => {
      const y = this._sy(t, domain);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + plotW, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const label = t >= 1000 ? Math.round(t).toLocaleString("pt-BR") : t.toLocaleString("pt-BR");
      ctx.fillText(label, left - 10, y);
    });

    const xTicks = this._niceLinearTicks(domain.xMin, domain.xMax, 8);
    xTicks.forEach((t) => {
      const x = this._sx(t, domain);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + plotH);
      ctx.strokeStyle = this.opts.gridColor;
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(String(Math.round(t)), x, top + plotH + 8);
    });

    // axis lines
    ctx.strokeStyle = this.opts.axisColor;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, top + plotH);
    ctx.lineTo(left + plotW, top + plotH);
    ctx.stroke();

    // axis labels
    ctx.fillStyle = this.opts.textColor;
    ctx.font = "600 12px -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.opts.xLabel, left + plotW / 2, this.height - 14);
    ctx.save();
    ctx.translate(16, top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(this.opts.yLabel, 0, 0);
    ctx.restore();

    // series
    // Padrão de traço por série (não só cor), para leitura por daltônicos e em P&B na projeção.
    const dashFor = (lineStyle) => {
      if (lineStyle === "dashed") return [8, 4];
      if (lineStyle === "dotted") return [1.5, 3.5];
      return [];
    };
    const vis = this._visibleSeries();
    this._lastDomain = domain;
    vis.forEach((s) => {
      const sorted = [...s.dados].sort((a, b) => a.temperatura - b.temperatura);
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineStyle === "solid" ? 2.75 : 2.1;
      ctx.setLineDash(dashFor(s.lineStyle));
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      sorted.forEach((p, i) => {
        const x = this._sx(p.temperatura, domain);
        const y = this._sy(p.viscosidade, domain);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      sorted.forEach((p) => {
        const x = this._sx(p.temperatura, domain);
        const y = this._sy(p.viscosidade, domain);
        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
      });
    });

    if (!vis.length) {
      ctx.fillStyle = this.opts.textColor;
      ctx.textAlign = "center";
      ctx.font = "13px -apple-system, sans-serif";
      ctx.fillText("Nenhuma amostra selecionada", left + plotW / 2, top + plotH / 2);
    }
  }

  _onHover(evt) {
    if (!this._lastDomain) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = evt.clientX - rect.left;
    const my = evt.clientY - rect.top;
    const vis = this._visibleSeries();
    let best = null;
    let bestDist = 18;
    vis.forEach((s) => {
      s.dados.forEach((p) => {
        const x = this._sx(p.temperatura, this._lastDomain);
        const y = this._sy(p.viscosidade, this._lastDomain);
        const d = Math.hypot(x - mx, y - my);
        if (d < bestDist) {
          bestDist = d;
          best = { s, p, x, y };
        }
      });
    });
    if (best) this._showTooltip(best, rect);
    else this._hideTooltip();
  }

  _showTooltip(best, rect) {
    if (!this.tooltipEl) return;
    const { s, p, x, y } = best;
    this.tooltipEl.innerHTML = `<strong>${s.amostra}</strong><br>Temperatura: ${p.temperatura} °C<br>Viscosidade: ${p.viscosidade.toLocaleString("pt-BR")} mP`;
    this.tooltipEl.style.display = "block";
    const left = Math.min(x + 14, rect.width - 190);
    this.tooltipEl.style.left = Math.max(left, 4) + "px";
    this.tooltipEl.style.top = Math.max(y - 10, 4) + "px";
  }

  _hideTooltip() {
    if (this.tooltipEl) this.tooltipEl.style.display = "none";
  }
}
