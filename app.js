'use strict'

// ══════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════

const KEY_C = 'cpw_c'
const KEY_V = 'cpw_v'

let C = []  // campaigns
let V = []  // ventas (sales)

function loadDB() {
  try {
    C = JSON.parse(localStorage.getItem(KEY_C) || '[]')
    V = JSON.parse(localStorage.getItem(KEY_V) || '[]')
  } catch (e) { C = []; V = [] }
}

function saveDB() {
  localStorage.setItem(KEY_C, JSON.stringify(C))
  localStorage.setItem(KEY_V, JSON.stringify(V))
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ══════════════════════════════════════════════
// CALCULATIONS
// ══════════════════════════════════════════════

function getVentasByCampania(campaniaId) {
  return V.filter(v => v.campaniaId === campaniaId)
}

function calcMetrics(c) {
  const vs = getVentasByCampania(c.id)
  const ing = vs.filter(v => v.estado === 'pagado').reduce((s, v) => s + (v.monto || 0), 0)
  const nv = vs.length
  const inv = c.inversionEjecutada || 0
  const con = c.contactos || 0
  const age = c.agendas || 0
  return {
    ing,
    nv,
    roas: inv > 0 && ing > 0 ? ing / inv : 0,
    cpl:  con > 0 && inv > 0 ? inv / con : 0,
    cpa:  age > 0 && inv > 0 ? inv / age : 0,
    cpv:  nv  > 0 && inv > 0 ? inv / nv  : 0,
    t1: con > 0 ? (age / con) * 100 : 0,
    t2: age > 0 ? (nv  / age) * 100 : 0,
    t3: con > 0 ? (nv  / con) * 100 : 0,
  }
}

function calcGlobals() {
  const inv = C.reduce((s, c) => s + (c.inversionEjecutada || 0), 0)
  const ing = V.filter(v => v.estado === 'pagado').reduce((s, v) => s + (v.monto || 0), 0)
  const active = C.filter(c => c.estado === 'activa').length
  const mes = new Date().toISOString().slice(0, 7)
  const ventasMes = V.filter(v => (v.fecha || '').startsWith(mes)).length
  return { inv, ing, roas: inv > 0 && ing > 0 ? ing / inv : 0, active, ventasMes }
}

// ══════════════════════════════════════════════
// FORMATTERS
// ══════════════════════════════════════════════

function money(n) {
  if (!n && n !== 0) return '$0'
  return '$' + Math.round(n).toLocaleString('es-CO')
}

function pct(n) {
  return (n || 0).toFixed(1) + '%'
}

function fDate(s) {
  if (!s) return '—'
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function badge(estado) {
  const map = {
    activa:     ['badge-green', '● Activa'],
    pausada:    ['badge-amber', '⏸ Pausada'],
    finalizada: ['badge-gray',  '✓ Finalizada'],
    pagado:     ['badge-green', 'Pagado'],
    pendiente:  ['badge-amber', 'Pendiente'],
  }
  const [cls, label] = map[estado] || ['badge-gray', estado]
  return `<span class="badge ${cls}">${label}</span>`
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ══════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════

let route = { view: 'dashboard', id: null, back: null }

function go(view, id = null, back = null) {
  route = { view, id: id || null, back: back || null }
  render()
  window.scrollTo(0, 0)
}

// ══════════════════════════════════════════════
// RENDER CONTROLLER
// ══════════════════════════════════════════════

function render() {
  const main    = document.getElementById('main')
  const navEl   = document.getElementById('bottomNav')
  const backBtn = document.getElementById('backBtn')
  const title   = document.getElementById('pageTitle')
  const fab     = document.getElementById('fab')

  // Nav active state
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === route.view)
  })

  // Defaults
  backBtn.classList.add('hidden')
  fab.classList.add('hidden')
  fab.onclick = null

  const topViews = ['dashboard', 'campanias', 'ventas']
  navEl.classList.toggle('hidden', !topViews.includes(route.view))

  switch (route.view) {
    case 'dashboard':
      title.textContent = 'Dashboard'
      main.innerHTML = renderDashboard()
      break

    case 'campanias':
      title.textContent = 'Campañas'
      fab.classList.remove('hidden')
      fab.onclick = () => go('nueva-campania')
      main.innerHTML = renderCampanias()
      break

    case 'campania-detalle':
      title.textContent = 'Campaña'
      backBtn.classList.remove('hidden')
      backBtn.onclick = () => go(route.back?.view || 'campanias', route.back?.id || null)
      main.innerHTML = renderDetalleCampania(route.id)
      bindDetalle()
      break

    case 'nueva-campania':
    case 'editar-campania':
      title.textContent = route.view === 'nueva-campania' ? 'Nueva campaña' : 'Editar campaña'
      backBtn.classList.remove('hidden')
      backBtn.onclick = () => {
        const b = route.back
        go(b?.view || 'campanias', b?.id || null)
      }
      main.innerHTML = renderFormCampania(route.id)
      bindFormCampania()
      break

    case 'ventas':
      title.textContent = 'Ventas'
      fab.classList.remove('hidden')
      fab.onclick = () => go('nueva-venta')
      main.innerHTML = renderVentas()
      break

    case 'nueva-venta':
    case 'editar-venta':
      title.textContent = route.view === 'nueva-venta' ? 'Nueva venta' : 'Editar venta'
      backBtn.classList.remove('hidden')
      backBtn.onclick = () => {
        const b = route.back
        go(b?.view || 'ventas', b?.id || null)
      }
      main.innerHTML = renderFormVenta(route.id)
      bindFormVenta()
      break
  }
}

// ══════════════════════════════════════════════
// VIEW: DASHBOARD
// ══════════════════════════════════════════════

function renderDashboard() {
  const g = calcGlobals()
  const activas = C.filter(c => c.estado === 'activa')
  const recientes = [...V].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 5)

  return `
<div class="page">
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Inversión ejecutada</div>
      <div class="summary-value">${money(g.inv)}</div>
    </div>
    <div class="summary-card summary-card--green">
      <div class="summary-label">Ingresos cobrados</div>
      <div class="summary-value">${money(g.ing)}</div>
    </div>
    <div class="summary-card ${g.roas >= 2 ? 'summary-card--green' : g.roas >= 1 ? 'summary-card--amber' : g.roas > 0 ? 'summary-card--red' : ''}">
      <div class="summary-label">ROAS general</div>
      <div class="summary-value">${g.roas > 0 ? g.roas.toFixed(2) + 'x' : '—'}</div>
    </div>
    <div class="summary-card summary-card--blue">
      <div class="summary-label">Campañas activas</div>
      <div class="summary-value">${g.active}</div>
    </div>
  </div>

  ${activas.length > 0 ? `
    <div class="section-title">Activas ahora</div>
    ${activas.map(c => campaignCard(c)).join('')}
  ` : ''}

  ${recientes.length > 0 ? `
    <div class="section-title">Últimas ventas <span class="section-count">${V.length}</span></div>
    ${recientes.map(v => saleRow(v)).join('')}
  ` : ''}

  ${C.length === 0 ? `
    <div class="empty-state">
      <div class="empty-icon">📢</div>
      <div class="empty-title">¡Empieza aquí!</div>
      <div class="empty-desc">Ve a "Campañas" y crea tu primera campaña publicitaria para empezar a medir tu retorno.</div>
    </div>
  ` : ''}
</div>`
}

// ══════════════════════════════════════════════
// VIEW: CAMPAÑAS LIST
// ══════════════════════════════════════════════

function renderCampanias() {
  if (C.length === 0) {
    return `<div class="page"><div class="empty-state">
      <div class="empty-icon">📢</div>
      <div class="empty-title">Sin campañas</div>
      <div class="empty-desc">Toca + para crear tu primera campaña</div>
    </div></div>`
  }

  const groups = [
    { label: 'Activas',     items: C.filter(c => c.estado === 'activa')     },
    { label: 'Pausadas',    items: C.filter(c => c.estado === 'pausada')    },
    { label: 'Finalizadas', items: C.filter(c => c.estado === 'finalizada') },
  ]

  return `<div class="page">
    ${groups.filter(g => g.items.length).map(g => `
      <div class="section-title">${g.label} <span class="section-count">${g.items.length}</span></div>
      ${g.items.map(c => campaignCard(c)).join('')}
    `).join('')}
  </div>`
}

function campaignCard(c) {
  const m = calcMetrics(c)
  return `
<div class="card clickable" onclick="go('campania-detalle','${c.id}',{view:'campanias'})">
  <div class="card-header">
    <div class="card-title">${esc(c.nombre)}</div>
    ${badge(c.estado)}
  </div>
  ${c.servicio ? `<div class="card-sub">${esc(c.servicio)}</div>` : '<div style="margin-bottom:10px"></div>'}
  <div class="mini-metrics">
    <div class="mini-metric">
      <span class="mini-label">Inversión</span>
      <span class="mini-value">${money(c.inversionEjecutada)}</span>
    </div>
    <div class="mini-metric">
      <span class="mini-label">Ingresos</span>
      <span class="mini-value ${m.ing > 0 ? 'green' : ''}">${money(m.ing)}</span>
    </div>
    <div class="mini-metric">
      <span class="mini-label">ROAS</span>
      <span class="mini-value ${m.roas >= 2 ? 'green' : m.roas >= 1 ? 'amber' : ''}">${m.roas > 0 ? m.roas.toFixed(2) + 'x' : '—'}</span>
    </div>
    <div class="mini-metric">
      <span class="mini-label">Ventas</span>
      <span class="mini-value">${m.nv}</span>
    </div>
  </div>
  <div class="funnel-mini">
    <span>💬 ${c.contactos || 0}</span>
    <span>→</span>
    <span>📅 ${c.agendas || 0}</span>
    <span>→</span>
    <span>💳 ${m.nv}</span>
  </div>
</div>`
}

// ══════════════════════════════════════════════
// VIEW: CAMPAIGN DETAIL
// ══════════════════════════════════════════════

function renderDetalleCampania(id) {
  const c = C.find(x => x.id === id)
  if (!c) return '<div class="page"><p class="dimmed" style="padding:40px 0;text-align:center">Campaña no encontrada</p></div>'

  const m = calcMetrics(c)
  const vs = getVentasByCampania(id)
  const presPct = c.presupuestoTotal > 0
    ? Math.min((c.inversionEjecutada / c.presupuestoTotal) * 100, 100) : 0
  const con = c.contactos || 0
  const age = c.agendas || 0
  const nv = m.nv

  return `
<div class="page">

  <div class="detail-header">
    <div style="flex:1;min-width:0">
      <div class="detail-title">${esc(c.nombre)}</div>
      ${c.servicio ? `<div class="detail-sub">${esc(c.servicio)}</div>` : ''}
      <div class="detail-dates">
        ${fDate(c.fechaInicio)}${c.fechaFin ? ` → ${fDate(c.fechaFin)}` : ' · en curso'}
      </div>
    </div>
    <div class="detail-actions">
      ${badge(c.estado)}
      <button class="btn-icon" onclick="go('editar-campania','${id}',{view:'campania-detalle',id:'${id}'})" title="Editar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
    </div>
  </div>

  <!-- INVESTMENT CARD -->
  <div class="card">
    <div class="card-section-title">Inversión publicitaria</div>
    <div class="inv-row">
      <div>
        <div class="inv-amount">${money(c.inversionEjecutada)}</div>
        <div class="inv-label">ejecutada de ${money(c.presupuestoTotal)} presupuestados</div>
      </div>
      <button class="btn btn-sm btn-outline" id="btnUpdateInv">Actualizar</button>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${presPct}%"></div>
    </div>
    <div class="progress-label">${pct(presPct)} del presupuesto ejecutado</div>
  </div>

  <!-- FUNNEL CARD -->
  <div class="card">
    <div class="card-section-title">Embudo de conversión</div>
    <div class="funnel">

      <div class="funnel-step">
        <div class="funnel-step-header">
          <span class="funnel-icon">💬</span>
          <span class="funnel-label">Hablaron</span>
          <span class="funnel-count">${con}</span>
        </div>
        <div class="funnel-bar">
          <div class="funnel-fill funnel-fill--blue" style="width:100%"></div>
        </div>
        <div class="funnel-pct">100% — base de contactos</div>
      </div>

      <div class="funnel-arrow">↓ <span class="conv-badge">${pct(m.t1)} pasó a agenda</span></div>

      <div class="funnel-step">
        <div class="funnel-step-header">
          <span class="funnel-icon">📅</span>
          <span class="funnel-label">Agendaron</span>
          <span class="funnel-count">${age}</span>
        </div>
        <div class="funnel-bar">
          <div class="funnel-fill funnel-fill--purple" style="width:${con > 0 ? (age/con)*100 : 0}%"></div>
        </div>
        <div class="funnel-pct">${pct(con > 0 ? (age/con)*100 : 0)} de los que hablaron</div>
      </div>

      <div class="funnel-arrow">↓ <span class="conv-badge">${pct(m.t2)} cerró</span></div>

      <div class="funnel-step">
        <div class="funnel-step-header">
          <span class="funnel-icon">💳</span>
          <span class="funnel-label">Compraron</span>
          <span class="funnel-count">${nv}</span>
        </div>
        <div class="funnel-bar">
          <div class="funnel-fill funnel-fill--green" style="width:${con > 0 ? (nv/con)*100 : 0}%"></div>
        </div>
        <div class="funnel-pct">${pct(m.t3)} del total · ${pct(m.t2)} de las agendas</div>
      </div>

    </div>
    <button class="btn btn-outline btn-full mt-12" id="btnUpdateFunnel">Actualizar embudo</button>
  </div>

  <!-- KEY METRICS -->
  <div class="metrics-grid">
    <div class="metric-card ${m.roas >= 2 ? 'metric-card--green' : m.roas >= 1 && m.roas < 2 ? 'metric-card--amber' : ''}">
      <div class="metric-label">ROAS</div>
      <div class="metric-value">${m.roas > 0 ? m.roas.toFixed(2) + 'x' : '—'}</div>
      <div class="metric-sub">retorno sobre inversión</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Costo / Lead</div>
      <div class="metric-value">${m.cpl > 0 ? money(m.cpl) : '—'}</div>
      <div class="metric-sub">por persona que habló</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Costo / Agenda</div>
      <div class="metric-value">${m.cpa > 0 ? money(m.cpa) : '—'}</div>
      <div class="metric-sub">por cita agendada</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Costo / Venta</div>
      <div class="metric-value">${m.cpv > 0 ? money(m.cpv) : '—'}</div>
      <div class="metric-sub">por cierre realizado</div>
    </div>
  </div>

  <!-- ASSOCIATED SALES -->
  <div class="section-title">
    Ventas de esta campaña <span class="section-count">${vs.length}</span>
  </div>

  ${vs.length > 0
    ? vs.map(v => saleRow(v, 'campania-detalle', id)).join('')
    : '<div class="empty-inline">Sin ventas registradas aún</div>'
  }

  <button class="btn btn-primary btn-full mt-8"
    onclick="go('nueva-venta', null, {view:'campania-detalle', id:'${id}', campaniaId:'${id}'})">
    + Registrar venta en esta campaña
  </button>

  <div class="danger-zone">
    <button class="btn btn-danger-outline" id="btnDeleteCampania">Eliminar campaña</button>
  </div>

</div>`
}

function bindDetalle() {
  const id = route.id
  const c  = C.find(x => x.id === id)
  if (!c) return

  document.getElementById('btnUpdateInv')?.addEventListener('click', () => showModalInv(c))
  document.getElementById('btnUpdateFunnel')?.addEventListener('click', () => showModalFunnel(c))
  document.getElementById('btnDeleteCampania')?.addEventListener('click', () => {
    if (confirm(`¿Eliminar la campaña "${c.nombre}"? Esta acción no se puede deshacer.`)) {
      C = C.filter(x => x.id !== id)
      saveDB()
      go('campanias')
    }
  })
}

// ══════════════════════════════════════════════
// VIEW: CAMPAIGN FORM
// ══════════════════════════════════════════════

function renderFormCampania(id) {
  const c = id ? C.find(x => x.id === id) : null
  const v = c || {}

  return `
<div class="page">
  <form id="formCampania" class="form">

    <div class="form-group">
      <label class="form-label">Nombre de la campaña *</label>
      <input class="form-input" type="text" name="nombre" value="${esc(v.nombre)}"
        placeholder="Ej: Lanzamiento Programa Mentalidad" required />
    </div>

    <div class="form-group">
      <label class="form-label">Servicio que ofreces</label>
      <input class="form-input" type="text" name="servicio" value="${esc(v.servicio)}"
        placeholder="Ej: Mentoría 1:1, Programa Posicionamiento..." />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Objetivo</label>
        <select class="form-select" name="objetivo">
          <option value="ventas"          ${(v.objetivo||'ventas')==='ventas'         ?'selected':''}>Ventas</option>
          <option value="leads"           ${v.objetivo==='leads'                      ?'selected':''}>Leads</option>
          <option value="trafico"         ${v.objetivo==='trafico'                    ?'selected':''}>Tráfico</option>
          <option value="reconocimiento"  ${v.objetivo==='reconocimiento'             ?'selected':''}>Reconocimiento</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Estado</label>
        <select class="form-select" name="estado">
          <option value="activa"      ${(v.estado||'activa')==='activa'     ?'selected':''}>Activa</option>
          <option value="pausada"     ${v.estado==='pausada'                ?'selected':''}>Pausada</option>
          <option value="finalizada"  ${v.estado==='finalizada'             ?'selected':''}>Finalizada</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Fecha inicio</label>
        <input class="form-input" type="date" name="fechaInicio" value="${v.fechaInicio || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Fecha fin</label>
        <input class="form-input" type="date" name="fechaFin" value="${v.fechaFin || ''}" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Presupuesto total ($)</label>
        <input class="form-input" type="number" name="presupuestoTotal"
          value="${v.presupuestoTotal || ''}" placeholder="500000" min="0" inputmode="numeric" />
      </div>
      <div class="form-group">
        <label class="form-label">Inversión ejecutada ($)</label>
        <input class="form-input" type="number" name="inversionEjecutada"
          value="${v.inversionEjecutada || ''}" placeholder="0" min="0" inputmode="numeric" />
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Notas</label>
      <textarea class="form-input form-textarea" name="notas"
        placeholder="Observaciones sobre la campaña...">${esc(v.notas)}</textarea>
    </div>

    <div class="form-actions">
      ${id ? `<button type="button" class="btn btn-danger-outline" id="btnDelCampForm">Eliminar</button>` : ''}
      <button type="submit" class="btn btn-primary">${id ? 'Guardar cambios' : 'Crear campaña'}</button>
    </div>

  </form>
</div>`
}

function bindFormCampania() {
  const id = route.id

  document.getElementById('formCampania').addEventListener('submit', e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = Object.fromEntries(fd)
    data.presupuestoTotal    = parseFloat(data.presupuestoTotal)    || 0
    data.inversionEjecutada  = parseFloat(data.inversionEjecutada)  || 0

    if (id) {
      const idx = C.findIndex(x => x.id === id)
      C[idx] = { ...C[idx], ...data }
    } else {
      C.unshift({
        id: uid(), ...data,
        contactos: 0, agendas: 0,
        createdAt: new Date().toISOString()
      })
    }
    saveDB()
    const b = route.back
    go(b?.view || 'campanias', b?.id || null)
  })

  document.getElementById('btnDelCampForm')?.addEventListener('click', () => {
    const c = C.find(x => x.id === id)
    if (confirm(`¿Eliminar "${c?.nombre || 'esta campaña'}"?`)) {
      C = C.filter(x => x.id !== id)
      saveDB()
      go('campanias')
    }
  })
}

// ══════════════════════════════════════════════
// VIEW: VENTAS LIST
// ══════════════════════════════════════════════

function renderVentas() {
  if (V.length === 0) {
    return `<div class="page"><div class="empty-state">
      <div class="empty-icon">💳</div>
      <div class="empty-title">Sin ventas</div>
      <div class="empty-desc">Toca + para registrar tu primera venta</div>
    </div></div>`
  }

  const cobrado  = V.filter(v => v.estado === 'pagado').reduce((s, v) => s + (v.monto || 0), 0)
  const pendiente = V.filter(v => v.estado === 'pendiente').reduce((s, v) => s + (v.monto || 0), 0)
  const sorted = [...V].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  return `
<div class="page">
  <div class="summary-grid">
    <div class="summary-card summary-card--green">
      <div class="summary-label">Cobrado</div>
      <div class="summary-value">${money(cobrado)}</div>
    </div>
    <div class="summary-card summary-card--amber">
      <div class="summary-label">Por cobrar</div>
      <div class="summary-value">${money(pendiente)}</div>
    </div>
  </div>
  ${sorted.map(v => saleRow(v)).join('')}
</div>`
}

function saleRow(v, backView = 'ventas', backId = null) {
  const camp = C.find(c => c.id === v.campaniaId)
  const b = backId ? `{view:'${backView}',id:'${backId}'}` : `{view:'${backView}'}`
  return `
<div class="sale-row" onclick="go('editar-venta','${v.id}',${b})">
  <div class="sale-info">
    <div class="sale-name">${esc(v.clienteNombre)}</div>
    <div class="sale-sub">
      ${esc(v.servicio)}${camp ? ` · <span style="color:var(--accent)">${esc(camp.nombre)}</span>` : ''}
      · ${fDate(v.fecha)}
    </div>
  </div>
  <div class="sale-right">
    <div class="sale-amount">${money(v.monto)}</div>
    ${badge(v.estado)}
  </div>
</div>`
}

// ══════════════════════════════════════════════
// VIEW: VENTA FORM
// ══════════════════════════════════════════════

function renderFormVenta(id) {
  const v = id ? V.find(x => x.id === id) : null
  const val = v || {}
  const defaultCampId = route.back?.campaniaId || val.campaniaId || ''
  const today = new Date().toISOString().slice(0, 10)

  return `
<div class="page">
  <form id="formVenta" class="form">

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Fecha *</label>
        <input class="form-input" type="date" name="fecha" value="${val.fecha || today}" required />
      </div>
      <div class="form-group">
        <label class="form-label">Estado</label>
        <select class="form-select" name="estado">
          <option value="pagado"   ${(val.estado||'pagado')==='pagado'  ?'selected':''}>Pagado</option>
          <option value="pendiente" ${val.estado==='pendiente'          ?'selected':''}>Pendiente</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Nombre del cliente *</label>
      <input class="form-input" type="text" name="clienteNombre"
        value="${esc(val.clienteNombre)}" placeholder="Ej: María García" required />
    </div>

    <div class="form-group">
      <label class="form-label">Servicio vendido *</label>
      <input class="form-input" type="text" name="servicio"
        value="${esc(val.servicio)}" placeholder="Ej: Mentoría 1:1, Programa Posicionamiento..." required />
    </div>

    <div class="form-group">
      <label class="form-label">Monto ($) *</label>
      <input class="form-input" type="number" name="monto"
        value="${val.monto || ''}" placeholder="1500000" min="0" inputmode="numeric" required />
    </div>

    <div class="form-group">
      <label class="form-label">Campaña de origen</label>
      <select class="form-select" name="campaniaId">
        <option value="">Sin campaña asociada</option>
        ${C.map(c => `<option value="${c.id}" ${defaultCampId === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Notas</label>
      <textarea class="form-input form-textarea" name="notas"
        placeholder="Observaciones sobre la venta...">${esc(val.notas)}</textarea>
    </div>

    <div class="form-actions">
      ${id ? `<button type="button" class="btn btn-danger-outline" id="btnDelVenta">Eliminar</button>` : ''}
      <button type="submit" class="btn btn-primary">${id ? 'Guardar cambios' : 'Registrar venta'}</button>
    </div>

  </form>
</div>`
}

function bindFormVenta() {
  const id = route.id

  document.getElementById('formVenta').addEventListener('submit', e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = Object.fromEntries(fd)
    data.monto = parseFloat(data.monto) || 0

    if (id) {
      const idx = V.findIndex(x => x.id === id)
      V[idx] = { ...V[idx], ...data }
    } else {
      V.unshift({ id: uid(), ...data, createdAt: new Date().toISOString() })
    }
    saveDB()
    const b = route.back
    go(b?.view === 'campania-detalle' ? 'campania-detalle' : 'ventas', b?.id || null)
  })

  document.getElementById('btnDelVenta')?.addEventListener('click', () => {
    if (confirm('¿Eliminar esta venta?')) {
      V = V.filter(x => x.id !== id)
      saveDB()
      const b = route.back
      go(b?.view || 'ventas', b?.id || null)
    }
  })
}

// ══════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════

function showModal(html, onBind) {
  const overlay = document.getElementById('modalOverlay')
  document.getElementById('modal').innerHTML = html
  overlay.classList.remove('hidden')
  if (onBind) onBind()
}

function hideModal() {
  document.getElementById('modalOverlay').classList.add('hidden')
}

function showModalInv(c) {
  showModal(`
    <div class="modal-title">Actualizar inversión</div>
    <div class="form-group">
      <label class="form-label">Inversión ejecutada ($)</label>
      <input class="form-input" type="number" id="mInv" value="${c.inversionEjecutada || 0}" min="0" inputmode="numeric" />
    </div>
    <div class="form-group">
      <label class="form-label">Presupuesto total ($)</label>
      <input class="form-input" type="number" id="mPres" value="${c.presupuestoTotal || 0}" min="0" inputmode="numeric" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="mCancel">Cancelar</button>
      <button class="btn btn-primary" id="mSave">Guardar</button>
    </div>
  `, () => {
    document.getElementById('mCancel').onclick = hideModal
    document.getElementById('mSave').onclick = () => {
      const idx = C.findIndex(x => x.id === c.id)
      C[idx].inversionEjecutada = parseFloat(document.getElementById('mInv').value) || 0
      C[idx].presupuestoTotal   = parseFloat(document.getElementById('mPres').value) || 0
      saveDB(); hideModal(); go('campania-detalle', c.id)
    }
    document.getElementById('mInv').focus()
  })
}

function showModalFunnel(c) {
  showModal(`
    <div class="modal-title">Actualizar embudo</div>
    <div class="form-group">
      <label class="form-label">💬 Personas que hablaron</label>
      <input class="form-input" type="number" id="mCon" value="${c.contactos || 0}" min="0" inputmode="numeric" />
    </div>
    <div class="form-group">
      <label class="form-label">📅 Personas que agendaron</label>
      <input class="form-input" type="number" id="mAge" value="${c.agendas || 0}" min="0" inputmode="numeric" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="mCancel">Cancelar</button>
      <button class="btn btn-primary" id="mSave">Guardar</button>
    </div>
  `, () => {
    document.getElementById('mCancel').onclick = hideModal
    document.getElementById('mSave').onclick = () => {
      const idx = C.findIndex(x => x.id === c.id)
      C[idx].contactos = parseInt(document.getElementById('mCon').value) || 0
      C[idx].agendas   = parseInt(document.getElementById('mAge').value) || 0
      saveDB(); hideModal(); go('campania-detalle', c.id)
    }
    document.getElementById('mCon').focus()
  })
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════

function init() {
  loadDB()

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => go(btn.dataset.view))
  })

  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) hideModal()
  })

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {})
  }

  render()
}

document.addEventListener('DOMContentLoaded', init)
