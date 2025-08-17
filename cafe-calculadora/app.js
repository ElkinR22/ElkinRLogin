(function() {
  const KILOS_PER_ARROBA = 12.5;
  const KILOS_PER_CARGA = 125;
  const KILOS_PER_LIBRA = 0.45359237;

  const COP0 = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const COP2 = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const NUM2 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const $ = (id) => document.getElementById(id);

  const inputs = {
    fecha: $('fecha'),
    productor: $('productor'),
    lote: $('lote'),
    notas: $('notas'),

    pesoBruto: $('pesoBruto'),
    sacos: $('sacos'),
    taraSaco: $('taraSaco'),
    taraAdicional: $('taraAdicional'),

    humedad: $('humedad'),
    humedadObjetivo: $('humedadObjetivo'),
    rendMode: $('rendMode'),
    rendPorc: $('rendPorc'),
    factorRend: $('factorRend'),

    tipoPrecio: $('tipoPrecio'),
    precio: $('precio'),
    bonifKg: $('bonifKg'),
    retencion: $('retencion'),
    comision: $('comision'),

    flete: $('flete'),
    aplicaFlete: $('aplicaFlete'),
    otrosLote: $('otrosLote'),
    aplicaOtros: $('aplicaOtros'),

    ventaVerde: $('ventaVerde'),
    margenObjetivo: $('margenObjetivo'),

    guardarPrefs: $('guardarPrefs'),
  };

  const outs = {
    outPagoProductor: $('outPagoProductor'),
    outCostoTotal: $('outCostoTotal'),
    outCostoUnitKgV: $('outCostoUnitKgV'),
    outPesoVerde: $('outPesoVerde'),

    outPesoNeto: $('outPesoNeto'),
    outPesoSeco: $('outPesoSeco'),
    outPesoVerdeDetalle: $('outPesoVerdeDetalle'),
    outPrecioKgP: $('outPrecioKgP'),
    outPrecioKgV: $('outPrecioKgV'),
    outSubtotal: $('outSubtotal'),
    outPrecioReqVerde: $('outPrecioReqVerde'),
    outMargen: $('outMargen'),

    badgeHumedad: $('badgeHumedad'),
    badgeRend: $('badgeRend'),

    year: $('year'),
  };

  const registroBody = $('registroBody');
  const totals = {
    totalKgPerg: $('totalKgPerg'),
    totalKgVerde: $('totalKgVerde'),
    totalPagoProd: $('totalPagoProd'),
    totalCosto: $('totalCosto'),
    promCostoKgVerde: $('promCostoKgVerde'),
  };

  const buttons = {
    btnAgregar: $('btnAgregar'),
    btnLimpiar: $('btnLimpiar'),
    btnExportar: $('btnExportar'),
    btnImprimir: $('btnImprimir'),
    btnBorrarTodo: $('btnBorrarTodo'),
  };

  const wraps = {
    wrapRendPorc: $('wrapRendPorc'),
    wrapFactorRend: $('wrapFactorRend'),
  };

  let compras = [];

  function parseNumber(input) {
    if (!input) return 0;
    const v = typeof input === 'number' ? input : Number(input.value);
    return isFinite(v) ? v : 0;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function precioPorKg(tipo, valor) {
    if (valor <= 0) return 0;
    switch (tipo) {
      case 'kg': return valor;
      case 'lb': return valor / KILOS_PER_LIBRA;
      case 'arroba': return valor / KILOS_PER_ARROBA;
      case 'carga': return valor / KILOS_PER_CARGA;
      default: return valor;
    }
  }

  function computeState() {
    const fecha = inputs.fecha.value || new Date().toISOString().slice(0,10);
    const productor = inputs.productor.value.trim();
    const lote = inputs.lote.value.trim();
    const notas = inputs.notas.value.trim();

    const pesoBruto = Math.max(0, parseNumber(inputs.pesoBruto));
    const sacos = Math.max(0, Math.floor(parseNumber(inputs.sacos)));
    const taraSaco = Math.max(0, parseNumber(inputs.taraSaco));
    const taraAdicional = Math.max(0, parseNumber(inputs.taraAdicional));

    const taraTotal = sacos * taraSaco + taraAdicional;
    const pesoNeto = Math.max(0, pesoBruto - taraTotal);

    const humedad = clamp(parseNumber(inputs.humedad), 0, 40);
    const humedadObjetivo = clamp(parseNumber(inputs.humedadObjetivo) || 12, 8, 20);

    const mode = inputs.rendMode.value;
    let rendDecimal = 0;
    if (mode === 'porcentaje') {
      const rp = clamp(parseNumber(inputs.rendPorc), 40, 95);
      rendDecimal = rp / 100;
    } else {
      const fr = clamp(parseNumber(inputs.factorRend), 70, 110);
      rendDecimal = fr > 0 ? (70 / fr) : 0;
    }

    const tipoPrecio = inputs.tipoPrecio.value;
    const precioValor = Math.max(0, parseNumber(inputs.precio));
    const precioKgPerg = precioPorKg(tipoPrecio, precioValor);

    const bonifKg = parseNumber(inputs.bonifKg);
    const retencionPct = clamp(parseNumber(inputs.retencion), 0, 100);
    const comisionPct = clamp(parseNumber(inputs.comision), 0, 100);

    const flete = Math.max(0, parseNumber(inputs.flete));
    const aplicaFlete = inputs.aplicaFlete.value; // costo | descuento
    const otrosLote = parseNumber(inputs.otrosLote);
    const aplicaOtros = inputs.aplicaOtros.value; // costo | descuento

    const ventaVerde = Math.max(0, parseNumber(inputs.ventaVerde));
    const margenObjetivo = clamp(parseNumber(inputs.margenObjetivo), 0, 95);

    // Corrección por humedad
    let pesoBaseSeco = 0;
    if (humedad >= 0 && humedad < 99) {
      const factor = (100 - humedad) / (100 - humedadObjetivo);
      pesoBaseSeco = pesoNeto * factor;
    }

    // Equivalente verde
    const kgVerde = pesoBaseSeco * rendDecimal;

    // Subtotal y ajustes
    const subtotal = precioKgPerg * pesoBaseSeco;
    const ajusteBonif = bonifKg * pesoBaseSeco;
    const retencion = subtotal * (retencionPct / 100);
    const comision = subtotal * (comisionPct / 100);

    const descuentoFlete = aplicaFlete === 'descuento' ? flete : 0;
    const costoFlete = aplicaFlete === 'costo' ? flete : 0;

    const descuentoOtros = aplicaOtros === 'descuento' ? Math.max(0, otrosLote) : 0;
    const costoOtros = aplicaOtros === 'costo' ? Math.max(0, otrosLote) : 0;

    const pagoProductor = subtotal + ajusteBonif - retencion - descuentoFlete - descuentoOtros;
    const costoTotal = subtotal + ajusteBonif + costoFlete + costoOtros + comision;

    const costoUnitKgPerg = pesoBaseSeco > 0 ? (costoTotal / pesoBaseSeco) : 0;
    const costoUnitKgVerde = kgVerde > 0 ? (costoTotal / kgVerde) : 0;
    const precioCompraEqVerde = kgVerde > 0 ? (subtotal / kgVerde) : 0;

    let margenTotal = 0;
    let margenPct = 0;
    if (ventaVerde > 0 && kgVerde > 0) {
      const ingreso = ventaVerde * kgVerde;
      margenTotal = ingreso - costoTotal;
      margenPct = ingreso > 0 ? (margenTotal / ingreso) * 100 : 0;
    }

    let precioReqVerde = 0;
    if (kgVerde > 0 && margenObjetivo > 0 && margenObjetivo < 100) {
      const objetivo = margenObjetivo / 100;
      precioReqVerde = (costoTotal / kgVerde) / (1 - objetivo);
    }

    return {
      fecha,
      productor,
      lote,
      notas,
      pesoBruto,
      sacos,
      taraSaco,
      taraAdicional,
      taraTotal,
      pesoNeto,
      humedad,
      humedadObjetivo,
      rendMode: mode,
      rendDecimal,
      tipoPrecio,
      precioValor,
      precioKgPerg,
      bonifKg,
      retencionPct,
      comisionPct,
      flete,
      aplicaFlete,
      otrosLote,
      aplicaOtros,
      ventaVerde,
      margenObjetivo,
      pesoBaseSeco,
      kgVerde,
      subtotal,
      ajusteBonif,
      retencion,
      comision,
      descuentoFlete,
      costoFlete,
      descuentoOtros,
      costoOtros,
      pagoProductor,
      costoTotal,
      costoUnitKgPerg,
      costoUnitKgVerde,
      precioCompraEqVerde,
      margenTotal,
      margenPct,
      precioReqVerde,
    };
  }

  function updateUI(s) {
    outs.outPesoNeto.textContent = NUM2.format(s.pesoNeto);
    outs.outPesoSeco.textContent = NUM2.format(s.pesoBaseSeco);
    outs.outPesoVerde.textContent = `${NUM2.format(s.kgVerde)} kg`;
    outs.outPesoVerdeDetalle.textContent = NUM2.format(s.kgVerde);

    outs.outPrecioKgP.textContent = COP2.format(s.precioKgPerg);
    outs.outPrecioKgV.textContent = COP2.format(s.precioCompraEqVerde);
    outs.outSubtotal.textContent = COP0.format(s.subtotal);

    outs.outPagoProductor.textContent = COP0.format(Math.max(0, Math.round(s.pagoProductor)));
    outs.outCostoTotal.textContent = COP0.format(Math.max(0, Math.round(s.costoTotal)));

    outs.outCostoUnitKgV.textContent = COP2.format(s.costoUnitKgVerde);

    outs.outPrecioReqVerde.textContent = s.precioReqVerde > 0 ? COP2.format(s.precioReqVerde) : '$0';
    const margPct = isFinite(s.margenPct) ? s.margenPct : 0;
    outs.outMargen.textContent = `${COP0.format(Math.round(s.margenTotal))} (${margPct.toFixed(1)}%)`;

    // Badges
    if (s.humedad > s.humedadObjetivo) {
      outs.badgeHumedad.textContent = `Humedad alta: corrige -${(s.humedad - s.humedadObjetivo).toFixed(1)} pts`;
      outs.badgeHumedad.className = 'badge warning';
    } else if (s.humedad > 0) {
      outs.badgeHumedad.textContent = `Humedad OK: ${(s.humedad).toFixed(1)}%`;
      outs.badgeHumedad.className = 'badge success';
    } else {
      outs.badgeHumedad.textContent = '';
      outs.badgeHumedad.className = 'badge hidden';
    }

    const rendPct = s.rendDecimal * 100;
    if (rendPct > 0) {
      outs.badgeRend.textContent = `Rendimiento: ${rendPct.toFixed(1)}%`;
      outs.badgeRend.className = 'badge';
    } else {
      outs.badgeRend.textContent = '';
      outs.badgeRend.className = 'badge hidden';
    }
  }

  function bindRecalc() {
    const recalcables = document.querySelectorAll('.recalc');
    recalcables.forEach(el => {
      el.addEventListener('input', onRecalc);
      el.addEventListener('change', onRecalc);
    });
  }

  function onRecalc() {
    toggleRendInputs();
    const s = computeState();
    updateUI(s);
  }

  function toggleRendInputs() {
    const mode = inputs.rendMode.value;
    if (mode === 'porcentaje') {
      wraps.wrapRendPorc.classList.remove('hidden');
      wraps.wrapFactorRend.classList.add('hidden');
    } else {
      wraps.wrapRendPorc.classList.add('hidden');
      wraps.wrapFactorRend.classList.remove('hidden');
    }
  }

  function savePrefs() {
    if (!inputs.guardarPrefs.checked) return;
    const prefs = {
      humedadObjetivo: parseNumber(inputs.humedadObjetivo),
      taraSaco: parseNumber(inputs.taraSaco),
      rendMode: inputs.rendMode.value,
      rendPorc: parseNumber(inputs.rendPorc),
      factorRend: parseNumber(inputs.factorRend),
      tipoPrecio: inputs.tipoPrecio.value,
      aplicaFlete: inputs.aplicaFlete.value,
      aplicaOtros: inputs.aplicaOtros.value,
    };
    localStorage.setItem('cafeCalc_prefs', JSON.stringify(prefs));
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem('cafeCalc_prefs');
      if (!raw) return;
      const p = JSON.parse(raw);
      if (typeof p.humedadObjetivo === 'number') inputs.humedadObjetivo.value = String(p.humedadObjetivo);
      if (typeof p.taraSaco === 'number') inputs.taraSaco.value = String(p.taraSaco);
      if (p.rendMode) inputs.rendMode.value = p.rendMode;
      if (typeof p.rendPorc === 'number') inputs.rendPorc.value = String(p.rendPorc);
      if (typeof p.factorRend === 'number') inputs.factorRend.value = String(p.factorRend);
      if (p.tipoPrecio) inputs.tipoPrecio.value = p.tipoPrecio;
      if (p.aplicaFlete) inputs.aplicaFlete.value = p.aplicaFlete;
      if (p.aplicaOtros) inputs.aplicaOtros.value = p.aplicaOtros;
    } catch (_) {}
  }

  function addCompraToRegistro() {
    const s = computeState();
    if (s.pesoBaseSeco <= 0 || s.kgVerde <= 0 || s.precioKgPerg <= 0) {
      alert('Complete pesos, rendimiento y precio para agregar al registro.');
      return;
    }
    const item = {
      id: Date.now(),
      fecha: s.fecha,
      productor: s.productor || '-',
      lote: s.lote || '-',
      kgPerg: s.pesoBaseSeco,
      kgVerde: s.kgVerde,
      precioKgPerg: s.precioKgPerg,
      pagoProductor: s.pagoProductor,
      costoTotal: s.costoTotal,
      costoKgVerde: s.costoUnitKgVerde,
      notas: s.notas,
    };
    compras.push(item);
    persistCompras();
    renderRegistro();
  }

  function removeCompra(id) {
    compras = compras.filter(c => c.id !== id);
    persistCompras();
    renderRegistro();
  }

  function clearRegistro() {
    if (!confirm('¿Borrar todo el registro?')) return;
    compras = [];
    persistCompras();
    renderRegistro();
  }

  function persistCompras() {
    localStorage.setItem('cafeCalc_registro', JSON.stringify(compras));
  }

  function loadCompras() {
    try {
      const raw = localStorage.getItem('cafeCalc_registro');
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) compras = arr;
    } catch (_) {}
  }

  function renderRegistro() {
    registroBody.innerHTML = '';
    let sumKgPerg = 0;
    let sumKgVerde = 0;
    let sumPago = 0;
    let sumCosto = 0;

    for (const c of compras) {
      sumKgPerg += c.kgPerg;
      sumKgVerde += c.kgVerde;
      sumPago += c.pagoProductor;
      sumCosto += c.costoTotal;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(c.fecha)}</td>
        <td>${escapeHtml(c.productor)}</td>
        <td title="${escapeHtml(c.notas || '')}">${escapeHtml(c.lote)}</td>
        <td>${NUM2.format(c.kgPerg)}</td>
        <td>${NUM2.format(c.kgVerde)}</td>
        <td>${COP2.format(c.precioKgPerg)}</td>
        <td>${COP0.format(Math.round(c.pagoProductor))}</td>
        <td>${COP0.format(Math.round(c.costoTotal))}</td>
        <td>${COP2.format(c.costoKgVerde)}</td>
        <td><button class="btn btn-ghost" data-id="${c.id}">Eliminar</button></td>
      `;
      registroBody.appendChild(tr);
    }

    totals.totalKgPerg.textContent = NUM2.format(sumKgPerg);
    totals.totalKgVerde.textContent = NUM2.format(sumKgVerde);
    totals.totalPagoProd.textContent = COP0.format(Math.round(sumPago));
    totals.totalCosto.textContent = COP0.format(Math.round(sumCosto));
    const prom = sumKgVerde > 0 ? (sumCosto / sumKgVerde) : 0;
    totals.promCostoKgVerde.textContent = COP2.format(prom);

    registroBody.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => removeCompra(Number(btn.getAttribute('data-id'))));
    });
  }

  function exportCSV() {
    if (!compras.length) {
      alert('No hay registros para exportar.');
      return;
    }
    const header = [
      'Fecha','Productor','Lote','Kg_pergamino','Kg_verde','Precio_kg_perg','Pago_productor','Costo_total','Costo_kg_verde','Notas'
    ];
    const rows = compras.map(c => [
      c.fecha,
      c.productor,
      c.lote,
      round2(c.kgPerg),
      round2(c.kgVerde),
      round2(c.precioKgPerg),
      Math.round(c.pagoProductor),
      Math.round(c.costoTotal),
      round2(c.costoKgVerde),
      (c.notas || '').replace(/\n/g, ' '),
    ]);
    const csv = [header, ...rows].map(r => r.map(csvesc).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compras_cafe_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPage() {
    window.print();
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function csvesc(v) {
    const s = String(v);
    if (/[";\n]/.test(s)) return '"' + s.replaceAll('"', '""') + '"';
    return s;
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function initDefaults() {
    outs.year.textContent = String(new Date().getFullYear());
    if (!inputs.fecha.value) inputs.fecha.value = new Date().toISOString().slice(0,10);
    if (!inputs.humedadObjetivo.value) inputs.humedadObjetivo.value = '12.0';
    if (!inputs.taraSaco.value) inputs.taraSaco.value = '0.50';
    if (!inputs.rendPorc.value) inputs.rendPorc.value = '78.0';
    if (!inputs.tipoPrecio.value) inputs.tipoPrecio.value = 'kg';
  }

  function bindUI() {
    buttons.btnAgregar.addEventListener('click', () => { addCompraToRegistro(); savePrefs(); });
    buttons.btnLimpiar.addEventListener('click', () => setTimeout(() => { onRecalc(); }, 0));
    buttons.btnExportar.addEventListener('click', exportCSV);
    buttons.btnImprimir.addEventListener('click', printPage);
    buttons.btnBorrarTodo.addEventListener('click', clearRegistro);
    inputs.rendMode.addEventListener('change', toggleRendInputs);
  }

  function init() {
    initDefaults();
    loadPrefs();
    loadCompras();
    bindUI();
    bindRecalc();
    toggleRendInputs();
    renderRegistro();
    onRecalc();
  }

  document.addEventListener('DOMContentLoaded', init);
})();