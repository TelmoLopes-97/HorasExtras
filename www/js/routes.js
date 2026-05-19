//INICIALIZAÇÃO DO F7 QUANDO DISPOSITIVO ESTÁ PRONTO
document.addEventListener('deviceready', onDeviceReady, false);
var $$ = Dom7;

var HORAS_LS_KEY = 'horasExtras.v1';

function horasLoadAll() {
  try {
    var raw = localStorage.getItem(HORAS_LS_KEY);
    if (!raw) return { records: [] };
    var o = JSON.parse(raw);
    return o && Array.isArray(o.records) ? o : { records: [] };
  } catch (e1) {
    return { records: [] };
  }
}

function horasSaveAll(data) {
  try {
    localStorage.setItem(HORAS_LS_KEY, JSON.stringify(data));
  } catch (e2) { /* ignore */ }
}

function horasFmtAbsPt(absVal) {
  var n = Math.round(absVal * 100) / 100;
  var body = n % 1 === 0 ? String(n) : String(n).replace('.', ',');
  return body + 'h';
}

function horasFmtSignedTotal(n) {
  if (n === 0 || n === -0) return '0h';
  if (n > 0) return '+' + horasFmtAbsPt(n);
  return '-' + horasFmtAbsPt(Math.abs(n));
}

function horasFmtDdMmY(iso) {
  var str = String(iso);
  if (str.indexOf('/') !== -1) {
    var parts = str.split(' ');
    var datePart = parts[parts.length - 1];
    var p = datePart.split('/');
    if (p.length === 3) {
      var d = new Date(p[2], p[1] - 1, p[0]);
      var dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return dias[d.getDay()] + ' ' + datePart;
    }
    return str;
  }
  var p = str.split('-');
  if (p.length !== 3) return str;
  var dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var d = new Date(p[0], p[1] - 1, p[2]);
  return dias[d.getDay()] + ' ' + p[2] + '/' + p[1] + '/' + p[0];
}

function horasTodayISO() {
  var d = new Date();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

function horasStatsForMonth(records, refMonth) {
  var list = records.filter(function (r) {
    return r.refMonth === refMonth;
  });
  var extra = 0;
  var falta = 0;
  var saldo = 0;
  list.forEach(function (r) {
    var h = r.hours;
    saldo += h;
    if (h > 0) extra += h;
    if (h < 0) falta += h;
  });
  return { extra: extra, falta: falta, saldo: saldo, list: list };
}

function horasWireDateUI(root) {
  var row = root.querySelector('.horas-date-row');
  var combo = root.querySelector('.horas-date-combo');
  if (!row || !combo || combo.getAttribute('data-horas-date-wired') === '1') return;
  combo.setAttribute('data-horas-date-wired', '1');
  var nat = row.querySelector('.horas-date-native');
  var disp = combo.querySelector('.horas-date-display');
  if (!nat || !disp) return;

  function sync() {
    if (nat.value) disp.value = horasFmtDdMmY(nat.value);
  }

  nat.addEventListener('change', sync);
  nat.addEventListener('input', sync);

  function openPicker() {
    if (typeof nat.showPicker === 'function') {
      try { nat.showPicker(); } catch (er1) { nat.focus(); }
    } else {
      nat.focus();
    }
  }

  disp.addEventListener('click', function (e) {
    e.preventDefault();
    openPicker();
  });

  sync();

  var prevBtn = combo.querySelector('.horas-date-prev');
  var nextBtn = combo.querySelector('.horas-date-next');

  function changeDay(offset) {
    if (!nat.value) return;
    var d = new Date(nat.value + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    var m = d.getMonth() + 1;
    var day = d.getDate();
    nat.value = d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
    sync();
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { changeDay(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { changeDay(1); });
}

function horasWireResumoDelete(root) {
  var ul = root.querySelector('#horas-resumo-list');
  if (!ul || ul.getAttribute('data-horas-delete-bound') === '1') return;
  ul.setAttribute('data-horas-delete-bound', '1');
  ul.addEventListener('click', function (ev) {

    // APAGAR
    var del = ev.target.closest('.horas-resumo-delete');
    if (del) {
      ev.preventDefault();
      var id = del.getAttribute('data-horas-delete-id');
      if (!id) return;
      app.dialog.confirm('Apagar este registo?', function () {
        var pack = horasLoadAll();
        pack.records = pack.records.filter(function (x) {
          return String(x.id) !== String(id);
        });
        horasSaveAll(pack);
        horasRefreshUI(root);
      });
      return;
    }

    // EDITAR
    var edit = ev.target.closest('.horas-resumo-edit');
    if (edit) {
      ev.preventDefault();
      var editId = edit.getAttribute('data-horas-edit-id');
      if (!editId) return;
      var pack = horasLoadAll();
      var rec = pack.records.find(function (x) { return String(x.id) === String(editId); });
      if (!rec) return;

      var popup = document.getElementById('horas-edit-popup');
      var dateNat = document.getElementById('horas-edit-date-native');
      var dateDisp = document.getElementById('horas-edit-date');
      var hoursEl = document.getElementById('horas-edit-hours');
      var noteEl = document.getElementById('horas-edit-note');
      var signEl = document.getElementById('horas-edit-sign');

      dateNat.value = rec.dateISO;
      dateDisp.value = horasFmtDdMmY(rec.dateISO).split(' ').slice(1).join(' ');
      hoursEl.value = Math.abs(rec.hours);
      noteEl.value = rec.note || '';
      if (rec.hours < 0) {
        signEl.textContent = '-';
        signEl.style.background = '#f59e0b';
      } else {
        signEl.textContent = '+';
        signEl.style.background = '#3b82f6';
      }

      popup.style.display = 'flex';

      dateDisp.onclick = function () {
        if (typeof dateNat.showPicker === 'function') {
          try { dateNat.showPicker(); } catch (e) { dateNat.focus(); }
        } else { dateNat.focus(); }
      };

      dateNat.onchange = function () {
        if (dateNat.value) {
          var p = dateNat.value.split('-');
          dateDisp.value = p[2] + '/' + p[1] + '/' + p[0];
        }
      };

      signEl.onclick = function () {
        if (signEl.textContent === '+') {
          signEl.textContent = '-';
          signEl.style.background = '#f59e0b';
        } else {
          signEl.textContent = '+';
          signEl.style.background = '#3b82f6';
        }
      };

      document.getElementById('horas-edit-cancel').onclick = function () {
        popup.style.display = 'none';
      };

      document.getElementById('horas-edit-save').onclick = function () {
        var rawDate = dateNat.value || dateDisp.value;
        var newDate;
        if (rawDate.indexOf('/') !== -1) {
          var dp = rawDate.split('/');
          newDate = dp[2] + '-' + dp[1] + '-' + dp[0];
        } else {
          newDate = rawDate;
        }
        var newHours = parseFloat(hoursEl.value);
        if (signEl.textContent === '-') newHours = -Math.abs(newHours);
        else newHours = Math.abs(newHours);
        var newNote = noteEl.value;
        if (!newDate || !isFinite(newHours) || newHours === 0) {
          app.dialog.alert('Preenche todos os campos corretamente.');
          return;
        }
        var pack2 = horasLoadAll();
        var idx = pack2.records.findIndex(function (x) { return String(x.id) === String(editId); });
        if (idx !== -1) {
          pack2.records[idx].dateISO = newDate;
          pack2.records[idx].hours = newHours;
          pack2.records[idx].note = newNote;
        }
        horasSaveAll(pack2);
        popup.style.display = 'none';
        horasRefreshUI(root);
      };
    }
  });
}

function horasRefreshUI(root) {
  var sel = root.querySelector('.horas-mes-select');
  if (!sel) return;
  var refMonth = sel.value;
  if (!refMonth) return;

  var data = horasLoadAll();
  var st = horasStatsForMonth(data.records, refMonth);

  var elExtra = root.querySelector('[data-horas-bind="extra"]');
  var elFalta = root.querySelector('[data-horas-bind="falta"]');
  var elSaldo = root.querySelector('[data-horas-bind="saldo"]');
  if (elExtra) elExtra.textContent = '+' + horasFmtAbsPt(st.extra);
  if (elFalta) {
    elFalta.textContent = st.falta === 0 ? '-0h' : horasFmtSignedTotal(st.falta);
  }
  if (elSaldo) {
    elSaldo.textContent = horasFmtSignedTotal(st.saldo);
    elSaldo.classList.remove('saldo-positive', 'saldo-negative', 'saldo-zero');
    if (st.saldo > 0) elSaldo.classList.add('saldo-positive');
    else if (st.saldo < 0) elSaldo.classList.add('saldo-negative');
    else elSaldo.classList.add('saldo-zero');
  }

  var ul = root.querySelector('#horas-resumo-list');
  var emptyEl = root.querySelector('#horas-resumo-empty');
  if (!ul || !emptyEl) return;

  var sorted = st.list.slice().sort(function (a, b) {
    if (a.dateISO !== b.dateISO) return a.dateISO < b.dateISO ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  });

  ul.innerHTML = '';
  if (!sorted.length) {
    emptyEl.classList.remove('is-hidden');
  } else {
    emptyEl.classList.add('is-hidden');
    sorted.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'horas-resumo-item';

      var left = document.createElement('div');
      left.className = 'horas-resumo-left';
      var line = document.createElement('div');
      line.className = 'horas-resumo-line';
      var dSpan = document.createElement('span');
      dSpan.className = 'horas-resumo-date';
      dSpan.textContent = horasFmtDdMmY(r.dateISO);
      line.appendChild(dSpan);
      if (r.note) {
        var sep = document.createElement('span');
        sep.className = 'horas-resumo-sep';
        sep.textContent = ' · ';
        line.appendChild(sep);
        var obs = document.createElement('span');
        obs.className = 'horas-resumo-obs';
        obs.textContent = r.note;
        line.appendChild(obs);
      }
      left.appendChild(line);

      var right = document.createElement('div');
      right.className = 'horas-resumo-right';
      var hSpan = document.createElement('span');
      hSpan.className = 'horas-resumo-hours' + (r.hours < 0 ? ' is-neg' : ' is-pos');
      hSpan.textContent = horasFmtSignedTotal(r.hours).replace(/h$/, 'H');

      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'horas-resumo-edit';
      editBtn.setAttribute('data-horas-edit-id', r.id);
      editBtn.setAttribute('aria-label', 'Editar registo');
      editBtn.innerHTML = '<i class="mdi mdi-pencil"></i>';

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'horas-resumo-delete';
      del.setAttribute('data-horas-delete-id', r.id);
      del.setAttribute('aria-label', 'Apagar registo');
      del.innerHTML = '<i class="mdi mdi-close"></i>';

      right.appendChild(hSpan);
      right.appendChild(editBtn);
      right.appendChild(del);

      li.appendChild(left);
      li.appendChild(right);
      ul.appendChild(li);
    });
  }
}

function initHorasIndexPage(pageEl) {
  var el = pageEl && pageEl.length ? pageEl[0] : pageEl;
  if (!el || !el.querySelector) return;
  var root = el.classList && el.classList.contains('page-horas') ? el : el.querySelector('.page-horas');
  if (!root) return;

  var sel = root.querySelector('.horas-mes-select');
  if (!sel) return;

  if (sel.getAttribute('data-horas-meses') !== '1') {
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    var now = new Date();
    var currentKey = now.getFullYear() * 12 + now.getMonth();
    for (var i = -12; i <= 12; i++) {
      var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      var m = d.getMonth() + 1;
      var y = d.getFullYear();
      var val = y + '-' + (m < 10 ? '0' : '') + m;
      var opt = document.createElement('option');
      opt.value = val;
      var label;
      try {
        label = d.toLocaleDateString('pt-PT', { month: 'long' }) + ' ' + y;
      } catch (e2) {
        label = val;
      }
      if (label && label.length) {
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }
      opt.textContent = label || val;
      sel.appendChild(opt);
      if (d.getFullYear() * 12 + d.getMonth() === currentKey) {
        opt.selected = true;
      }
    }
    sel.setAttribute('data-horas-meses', '1');
  }

  var dateNat = root.querySelector('.horas-date-native');
  if (dateNat && !dateNat.getAttribute('data-horas-date-init')) {
    dateNat.value = horasTodayISO();
    dateNat.setAttribute('data-horas-date-init', '1');
  }

  if (root.getAttribute('data-horas-app') !== '1') {
    root.setAttribute('data-horas-app', '1');

    horasWireDateUI(root);
    horasWireResumoDelete(root);

    sel.addEventListener('change', function () {
      horasRefreshUI(root);
    });

    var prev = root.querySelector('.horas-chevron-prev');
    var next = root.querySelector('.horas-chevron-next');
    if (prev) {
      prev.addEventListener('click', function () {
        if (sel.selectedIndex > 0) {
          sel.selectedIndex -= 1;
          sel.dispatchEvent(new Event('change'));
        }
      });
    }
    if (next) {
      next.addEventListener('click', function () {
        if (sel.selectedIndex < sel.options.length - 1) {
          sel.selectedIndex += 1;
          sel.dispatchEvent(new Event('change'));
        }
      });
    }

    root.querySelectorAll('.horas-quick-row .horas-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var inp = root.querySelector('.horas-input-hours');
        if (!inp) return;
        var m = btn.textContent.match(/^([+-]?)([\d.,]+)/);
        if (!m) return;
        var sign = m[1] === '-' ? '-' : '';
        var num = m[2].replace(',', '.');
        inp.value = sign + num;
      });
    });

    var signBtn = root.querySelector('.horas-sign-toggle');
    if (signBtn) {
      signBtn.addEventListener('click', function (e) {
        e.preventDefault();
        signBtn.classList.toggle('is-falta-mode');
        var ic = signBtn.querySelector('i');
        if (!ic) return;
        if (signBtn.classList.contains('is-falta-mode')) {
          ic.className = 'mdi mdi-minus';
          signBtn.setAttribute('aria-label', 'Modo falta');
        } else {
          ic.className = 'mdi mdi-plus';
          signBtn.setAttribute('aria-label', 'Modo extra');
        }
      });
    }

    var btnReg = root.querySelector('.horas-btn-registar');
    if (btnReg) {
      btnReg.addEventListener('click', function () {
        var refMonth = sel.value;
        var dateEl = root.querySelector('.horas-date-native');
        var hrsEl = root.querySelector('.horas-input-hours');
        var noteEl = root.querySelector('input[name="horas-observacao"]');
        if (!dateEl || !dateEl.value) {
          app.dialog.alert('Escolha a data de registo.');
          return;
        }
        var raw = hrsEl && hrsEl.value ? String(hrsEl.value).trim().replace(',', '.') : '';
        var hoursNum = parseFloat(raw);
        if (!isFinite(hoursNum) || hoursNum === 0) {
          app.dialog.alert('Indique as horas.');
          return;
        }
        var signToggle = root.querySelector('.horas-sign-toggle');
        var faltaMode = signToggle && signToggle.classList.contains('is-falta-mode');
        var hours = faltaMode ? -Math.abs(hoursNum) : hoursNum;
        var pack = horasLoadAll();
        pack.records.push({
          id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9),
          refMonth: refMonth,
          dateISO: dateEl.value,
          hours: hours,
          note: noteEl ? String(noteEl.value || '').trim() : ''
        });
        horasSaveAll(pack);
        if (hrsEl) hrsEl.value = '';
        if (noteEl) noteEl.value = '';
        horasRefreshUI(root);
      });
    }
  }

  var dispAfter = root.querySelector('.horas-date-display');
  var natAfter = root.querySelector('.horas-date-native');
  if (dispAfter && natAfter && natAfter.value) {
    dispAfter.value = horasFmtDdMmY(natAfter.value);
  }

  horasRefreshUI(root);

  // Botão de ajuda
var helpBtns = root.querySelectorAll('.navbar-horas .link.icon-only');
var helpBtnReal = helpBtns[helpBtns.length - 1];
if (helpBtnReal) {
    helpBtnReal.addEventListener('click', function(e) {
        e.preventDefault();
        var popup = document.getElementById('horas-help-popup');
        if (popup) popup.style.display = 'flex';
    });
}
var helpClose = document.getElementById('horas-help-close');
if (helpClose) {
    helpClose.onclick = function() {
        var popup = document.getElementById('horas-help-popup');
        if (popup) popup.style.display = 'none';
    };
}

}

var app = new Framework7({
  el: '#app',
  name: 'My App',
  id: 'com.myapp.test',
  panel: { swipe: true },
  dialog: {
    buttonOk: 'Sim',
    buttonCancel: 'Cancelar',
    title: ' ',
  },
  routes: [
    {
      path: '/index/',
      url: 'index.html',
      on: {
        pageBeforeIn: function (event, page) {},
        pageAfterIn: function (event, page) {
          var n = page.$el && page.$el[0] ? page.$el[0] : null;
          if (!n) return;
          var root = n.classList && n.classList.contains('page-horas') ? n : n.querySelector('.page-horas');
          if (root) horasRefreshUI(root);
        },
        pageInit: function (event, page) {
          initHorasIndexPage(page.$el);
        },
        pageBeforeRemove: function (event, page) {}
      }
    },
    {
      path: '/grafico/',
      url: 'grafico.html',
      on: {
        pageBeforeIn: function (event, page) {},
        pageAfterIn: function (event, page) {},
        pageInit: function (event, page) {
          initGraficoPage(page.$el);
        },
        pageBeforeRemove: function (event, page) {}
      }
    },
    {
      path: '/notificacoes/',
      url: 'notificacoes.html',
      on: {
        pageBeforeIn: function (event, page) {},
        pageAfterIn: function (event, page) {},
        pageInit: function (event, page) {},
        pageBeforeRemove: function (event, page) {}
      }
    }
  ]
});

var mainView = app.views.create('.view-main', { url: '/index/' });

app.on('routeChange', function (route) {
  var currentRoute = route.url;
  document.querySelectorAll('.item-panel').forEach(function (el) {
    el.classList.remove('active');
  });
  var targetEl = document.querySelector('.item-panel[href="' + currentRoute + '"]');
  if (targetEl) targetEl.classList.add('active');
});

function onDeviceReady() {
  var mainView = app.views.create('.view-main', { url: '/index/' });
  document.addEventListener("backbutton", function (e) {
    if (mainView.router.currentRoute.path === '/index/') {
      e.preventDefault();
      app.dialog.confirm('Deseja sair do aplicativo?', function () {
        navigator.app.exitApp();
      });
    } else {
      e.preventDefault();
      mainView.router.back({ force: true });
    }
  }, false);
}

function initGraficoPage(pageEl) {
  var el = pageEl && pageEl.length ? pageEl[0] : pageEl;
  if (!el || !el.querySelector) return;

  var sel = el.querySelector('#grafico-mes-select');
  if (!sel) return;

  if (sel.getAttribute('data-grafico-meses') !== '1') {
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    var now = new Date();
    var currentKey = now.getFullYear() * 12 + now.getMonth();
    for (var i = -12; i <= 12; i++) {
      var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      var m = d.getMonth() + 1;
      var y = d.getFullYear();
      var val = y + '-' + (m < 10 ? '0' : '') + m;
      var opt = document.createElement('option');
      opt.value = val;
      var label;
      try {
        label = d.toLocaleDateString('pt-PT', { month: 'long' }) + ' ' + y;
      } catch (e) { label = val; }
      if (label) label = label.charAt(0).toUpperCase() + label.slice(1);
      opt.textContent = label || val;
      sel.appendChild(opt);
      if (d.getFullYear() * 12 + d.getMonth() === currentKey) opt.selected = true;
    }
    sel.setAttribute('data-grafico-meses', '1');
  }

  var prev = el.querySelector('.horas-chevron-prev');
  var next = el.querySelector('.horas-chevron-next');
  if (prev) prev.addEventListener('click', function () {
    if (sel.selectedIndex > 0) { sel.selectedIndex -= 1; renderGrafico(el, sel.value); }
  });
  if (next) next.addEventListener('click', function () {
    if (sel.selectedIndex < sel.options.length - 1) { sel.selectedIndex += 1; renderGrafico(el, sel.value); }
  });
  sel.addEventListener('change', function () { renderGrafico(el, sel.value); });

  renderGrafico(el, sel.value);
}

function renderGrafico(root, refMonth) {
  var data = horasLoadAll();
  var st = horasStatsForMonth(data.records, refMonth);

  var elExtra = root.querySelector('#grafico-extra');
  var elFalta = root.querySelector('#grafico-falta');
  var elSaldo = root.querySelector('#grafico-saldo');
  if (elExtra) elExtra.textContent = '+' + horasFmtAbsPt(st.extra);
  if (elFalta) elFalta.textContent = st.falta === 0 ? '-0h' : horasFmtSignedTotal(st.falta);
  if (elSaldo) elSaldo.textContent = horasFmtSignedTotal(st.saldo);

  var canvas = root.querySelector('#grafico-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth * window.devicePixelRatio;
  canvas.height = 260 * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  var w = canvas.offsetWidth;
  var h = 260;
  ctx.clearRect(0, 0, w, h);

  var records = st.list;
  if (!records.length) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sem registos neste mês', w / 2, h / 2);
    return;
  }

  var byDay = {};
  records.forEach(function (r) {
    if (!byDay[r.dateISO]) byDay[r.dateISO] = { pos: 0, neg: 0 };
    if (r.hours >= 0) byDay[r.dateISO].pos += r.hours;
    else byDay[r.dateISO].neg += r.hours;
  });
  var days = Object.keys(byDay).sort();
  var values = days.map(function (d) { return byDay[d]; });
  var maxVal = Math.max.apply(null, days.map(function (d) {
    return Math.max(byDay[d].pos, Math.abs(byDay[d].neg));
  }));
  if (maxVal === 0) maxVal = 1;

  var barW = Math.floor((w - 32) / days.length) - 4;

  // Verificar se há valores negativos
  var hasNeg = days.some(function(d) { return byDay[d].neg < 0; });
  var hasPos = days.some(function(d) { return byDay[d].pos > 0; });

  // Ajustar midY dinamicamente:
  // só positivos → linha de base a 80% da altura
  // só negativos → linha de base a 20% da altura
  // ambos → linha de base ao meio
  var midY;
  var labelZoneBottom = 20; // espaço para label do dia + label de valor
  var labelZoneTop = 20;    // espaço para label de valor no topo
  if (hasPos && !hasNeg) {
    midY = h - labelZoneBottom - 14; // linha de base perto do fundo
  } else if (!hasPos && hasNeg) {
    midY = labelZoneTop;
  } else {
    midY = h / 2 - 10;
  }

  days.forEach(function (day, i) {
    var pos = values[i].pos;
    var neg = values[i].neg;
    var x = 16 + i * (barW + 4);

    if (pos > 0) {
      var areaUp = midY - labelZoneTop;
      var barHPos = pos / maxVal * (areaUp - 20);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x, midY - barHPos, barW, barHPos);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(pos).replace('.', ','), x + barW / 2, midY - barHPos - 4);
    }

    if (neg < 0) {
      var areaDown = h - midY - labelZoneBottom - 28;
      var barHNeg = Math.abs(neg) / maxVal * (areaDown - 10);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x, midY + 18, barW, barHNeg);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      var labelY = Math.min(midY + 18 + barHNeg + 12, h - 4);
      ctx.fillText(String(Math.abs(neg)).replace('.', ','), x + barW / 2, labelY);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    var dayNum = day.split('-')[2];
    ctx.fillText(dayNum, x + barW / 2, midY + 14);
  });

  ctx.strokeStyle = '#334a6a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(w, midY);
  ctx.stroke();
  renderGraficoAnual(root);
}

function renderGraficoAnual(root) {
    var canvas = root.querySelector('#grafico-anual-canvas');
    if (!canvas) return;

    var data = horasLoadAll();
    var now = new Date();
    var year = now.getFullYear();
    var meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    var ctx = canvas.getContext('2d');
    var w = canvas.offsetWidth;

    // Se houver faltas, precisa de mais espaço para as barras e labels em baixo
    var tempData = horasLoadAll();
    var tempYear = now.getFullYear();
    var tempMeses2 = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    var hasFaltas = false;
    for (var ti = 0; ti < 12; ti++) {
      var tRef = tempYear + '-' + (ti < 9 ? '0' : '') + (ti + 1);
      var tSt = horasStatsForMonth(tempData.records, tRef);
      if (tSt.falta < 0) { hasFaltas = true; break; }
    }
    var h = hasFaltas ? 280 : 220;
    canvas.width = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;
    canvas.style.height = h + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, w, h);

    var monthData = [];
    for (var i = 0; i < 12; i++) {
        var refMonth = year + '-' + (i < 9 ? '0' : '') + (i + 1);
        var st = horasStatsForMonth(data.records, refMonth);
        monthData.push({ extra: st.extra, falta: Math.abs(st.falta), label: meses[i] });
    }

    var maxVal = Math.max.apply(null, monthData.map(function(m) {
        return Math.max(m.extra, m.falta);
    }));
    if (maxVal === 0) maxVal = 1;

    var barW = Math.floor((w - 32) / 12) - 4;

    // Verificar se há valores negativos e positivos no ano
    var hasNegAnual = monthData.some(function(m) { return m.falta > 0; });
    var hasPosAnual = monthData.some(function(m) { return m.extra > 0; });

    var midY;
    if (hasPosAnual && !hasNegAnual) {
      midY = h - 34;
    } else if (!hasPosAnual && hasNegAnual) {
      midY = 20;
    } else {
      // Quando há ambos, dar 60% para cima e 40% para baixo
      midY = Math.round(h * 0.55);
    }

    monthData.forEach(function(m, i) {
        var x = 16 + i * (barW + 4);

        // Barra extra (azul, para cima)
        if (m.extra > 0) {
            var areaUp = midY - 20;
            var barHPos = m.extra / maxVal * (areaUp - 14);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(x, midY - barHPos, barW, barHPos);
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(String(m.extra).replace('.', ','), x + barW / 2, Math.max(midY - barHPos - 3, 10));
        }

        // Barra falta (laranja, para baixo)
        if (m.falta > 0) {
            var areaDown = h - midY - 34;
            var barHNeg = m.falta / maxVal * (areaDown - 10);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(x, midY + 18, barW, barHNeg);
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            var labelY = Math.min(midY + 18 + barHNeg + 10, h - 18);
            ctx.fillText(String(m.falta).replace('.', ','), x + barW / 2, labelY);
        }

        // Label mês
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.label, x + barW / 2, midY + 14);
    });

    // Linha central
    ctx.strokeStyle = '#334a6a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();
}