/* ============================================================
 * core.js — K-FuelCell HR Suite 공통 모듈
 *
 *  KFS.store(key)   localStorage 래퍼 (저장 시각 _meta 스탬프)
 *  KFS.d            날짜 유틸 (iso / 월키 / 최근 N개월 / D-day)
 *  KFS.shell(cfg)   사이드바·탑바 공통 셸 렌더링
 *  KFS.ui           KPI 카드·스파크라인·신호등·모달 헬퍼
 *  KFS.chart        Chart.js 공통 설정·팔레트(색각검증 완료)·팩토리
 *  KFS.xl           SheetJS 업로드/다운로드 헬퍼
 *  KFS.ext          타 대시보드 데이터 연동 (인력현황 명부 등)
 * ========================================================== */
'use strict';
window.KFS = (function () {

  /* ───────── 기본 유틸 ───────── */
  const $  = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmt = (n) => Number(n || 0).toLocaleString('ko-KR');
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  /* 만원 단위 금액 → "12.4억" / "9,870만" */
  const eok = (man) => {
    man = Number(man) || 0;
    if (Math.abs(man) >= 10000) return (man / 10000).toFixed(1).replace(/\.0$/, '') + '억';
    return fmt(Math.round(man)) + '만';
  };

  /* ───────── 날짜 ───────── */
  const d = {
    today(){ const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); },
    toD(s){ if (!s) return null; const x = new Date(String(s).slice(0, 10) + 'T00:00:00'); return isNaN(x) ? null : x; },
    iso(x){ return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); },
    kdate(x){ return x.getFullYear() + '. ' + String(x.getMonth() + 1).padStart(2, '0') + '. ' + String(x.getDate()).padStart(2, '0'); },
    mkey(x){ return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); },
    norm(v){                                        /* 엑셀 날짜 정규화 */
      if (v == null || v === '') return '';
      if (v instanceof Date && !isNaN(v)) return d.iso(v);
      if (typeof v === 'number') { const x = new Date(Math.round((v - 25569) * 86400 * 1000)); return isNaN(x) ? '' : d.iso(x); }
      const s = String(v).trim().replace(/[./]/g, '-').replace(/-+$/, '');
      const m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
      if (!m) return '';
      return m[1] + '-' + m[2].padStart(2, '0') + (m[3] ? '-' + m[3].padStart(2, '0') : '');
    },
    lastMonths(n){                                   /* 최근 n개월 [{key,label,start,end}] */
      const now = d.today(), out = [];
      for (let i = n - 1; i >= 0; i--) {
        const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        out.push({ key: d.mkey(s), label: String(s.getFullYear()).slice(2) + '.' + String(s.getMonth() + 1).padStart(2, '0'), start: s, end: e > now ? now : e });
      }
      return out;
    },
    dday(s){ const t = d.toD(s); if (!t) return null; return Math.round((t - d.today()) / 86400000); }
  };

  /* ───────── 저장소 ───────── */
  function store(key){
    return {
      load(def){
        try {
          const raw = localStorage.getItem(key);
          if (raw) return Object.assign({}, def, JSON.parse(raw));
        } catch (e) { /* 손상 시 기본값 */ }
        return JSON.parse(JSON.stringify(def));
      },
      save(data){
        try {
          data._meta = { updated: new Date().toISOString() };
          localStorage.setItem(key, JSON.stringify(data));
          return true;
        } catch (e) { alert('데이터 저장에 실패했습니다. 브라우저 저장공간을 확인하세요.'); return false; }
      }
    };
  }
  function readRaw(key){
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }

  /* ───────── 팔레트 (validate_palette.js 검증 완료) ───────── */
  const C = {
    CAT:    ['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#008300','#6250d6'],
    TEAL4:  ['#7fb5c4','#4f9aad','#2a7f92','#0b6275'],
    FUNNEL6:['#85bac8','#66a8b8','#4a94a6','#2f8093','#186b7f','#07576a'],
    BRAND:'#0b7285', HIRE:'#1baf7a', EXIT:'#e34948', SLATE:'#5d7486',
    INK:'#17242e', INK2:'#5b6d7a', GRID:'#e9eef1',
    GOOD:'#0ca30c', WARN:'#fab219', SERIOUS:'#ec835a'
  };

  /* ───────── 공통 셸 ───────── */
  const NAV = [
    { id:'index',       href:'index.html',       label:'허브',             icon:'home' },
    { id:'payroll',     href:'payroll.html',     label:'③ 인건비·보상',    icon:'won' },
    { id:'recruit',     href:'recruit.html',     label:'④ 채용 파이프라인', icon:'funnel' },
    { id:'performance', href:'performance.html', label:'⑥ 성과평가',       icon:'award' },
    { id:'retention',   href:'retention.html',   label:'⑦ 이직률·리텐션',  icon:'repeat' },
    { id:'training',    href:'training.html',    label:'⑧ 교육·법정의무',  icon:'book' },
    { id:'compliance',  href:'compliance.html',  label:'⑨ 노무 컴플라이언스', icon:'shield' },
    { id:'scorecard',   href:'scorecard.html',   label:'⑩ 경영진 종합',    icon:'bar' }
  ];
  const ICONS = {
    home:  '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    won:   '<path d="M3 7l3.5 10L10 7l3.5 10L17 7"/><path d="M2 11h16M2 14.5h16"/>',
    funnel:'<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
    award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5"/>',
    repeat:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    book:  '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    shield:'<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="M9 11.5l2 2 4-4.5"/>',
    bar:   '<path d="M3 21h18"/><rect x="5" y="11" width="3.5" height="10" rx="1"/><rect x="10.5" y="6" width="3.5" height="15" rx="1"/><rect x="16" y="14" width="3.5" height="7" rx="1"/>'
  };
  const svg = (name) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';

  function shell(cfg){
    /* 사이드바 */
    const side = $('#side');
    side.innerHTML =
      '<div class="logo"><div class="co"><span class="sq">K</span><div><b>케이퓨얼셀</b><div class="tag">HR Suite · 경영지원팀</div></div></div></div>' +
      '<nav class="nav">' + NAV.map(n =>
        '<a class="navbtn' + (n.id === cfg.active ? ' on' : '') + '" href="' + n.href + '">' + svg(n.icon) + esc(n.label) + '</a>'
      ).join('') + '</nav>' +
      (cfg.sideActions && cfg.sideActions.length
        ? '<div class="sect">데이터 관리</div><div class="dlist">' +
          cfg.sideActions.map(a => '<button class="dbtn" id="' + a.id + '">' + esc(a.label) + '</button>').join('') + '</div>'
        : '') +
      '<div class="foot">STEP 1 · 브라우저 저장(localStorage)<br>동일 도메인 배포 시 대시보드 간 자동 연동</div>';

    /* 탑바 */
    const top = $('#topbar');
    top.innerHTML =
      '<div><h1>' + esc(cfg.title) + '</h1><div class="sub">' + esc(cfg.sub || '') + '</div></div>' +
      '<span class="sp"></span><span class="asof">' + d.kdate(d.today()) + ' 기준</span>' +
      (cfg.actions || []).map(a =>
        '<button class="btn' + (a.primary ? ' primary' : '') + '" id="' + a.id + '">' + esc(a.label) + '</button>'
      ).join('');
    document.title = cfg.title + ' · K-FuelCell HR';
  }

  /* ───────── UI 컴포넌트 ───────── */
  const ui = {
    spark(values, color){
      if (!values || values.length < 2) return '';
      const w = 80, h = 25, min = Math.min(...values), max = Math.max(...values), span = (max - min) || 1;
      const pts = values.map((v, i) =>
        (i / (values.length - 1) * (w - 2) + 1).toFixed(1) + ',' + ((1 - (v - min) / span) * (h - 6) + 3).toFixed(1)
      ).join(' ');
      return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polyline points="' + pts +
        '" fill="none" stroke="' + (color || C.BRAND) + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    },
    pill(delta, suffix, invert){            /* invert: 감소가 긍정인 지표(이직률 등) */
      const good = invert ? delta < 0 : delta > 0;
      const cls = delta === 0 ? 'flat' : good ? 'up' : 'down';
      const txt = delta === 0 ? '—' : (delta > 0 ? '▲ ' : '▼ ') + Math.abs(delta) + (suffix || '');
      return '<span class="pill ' + cls + '">' + txt + '</span>';
    },
    kpis(sel, cards){
      $(sel).innerHTML = cards.map(c =>
        '<div class="kpi"><div class="l">' + esc(c.l) + '</div>' +
        '<div class="row"><div class="v">' + c.v + '<small>' + (c.u || '') + '</small></div>' + (c.p || '') + '</div>' +
        '<div class="cap">' + (c.cap || '') + '</div>' + (c.extra || '') + '</div>'
      ).join('');
    },
    light(level, label){                     /* level: good | warn | bad | na */
      return '<span class="lt ' + level + '"><i></i>' + esc(label) + '</span>';
    },
    modal(overlaySel){
      const ov = $(overlaySel);
      ov.addEventListener('click', ev => { if (ev.target === ov) ov.hidden = true; });
      document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !ov.hidden) ov.hidden = true; });
      return { open(){ ov.hidden = false; }, close(){ ov.hidden = true; } };
    }
  };

  /* ───────── 차트 ───────── */
  const chart = (function () {
    const ok = typeof Chart !== 'undefined';
    const registry = {};
    if (ok) {
      if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);
      Chart.defaults.set('plugins.datalabels', { display: false });
      Chart.register({                        /* 도넛 중앙 텍스트 플러그인 */
        id: 'centerText',
        afterDraw(c, a, opt){
          if (!opt || !opt.lines) return;
          const { ctx, chartArea } = c;
          const x = (chartArea.left + chartArea.right) / 2, y = (chartArea.top + chartArea.bottom) / 2;
          ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = C.INK; ctx.font = "800 20px 'Pretendard','Malgun Gothic',sans-serif";
          ctx.fillText(opt.lines[0], x, y - 6);
          ctx.fillStyle = C.INK2; ctx.font = "600 11px 'Pretendard','Malgun Gothic',sans-serif";
          ctx.fillText(opt.lines[1], x, y + 12);
          ctx.restore();
        }
      });
      Chart.defaults.font.family = "'Pretendard','Malgun Gothic',sans-serif";
      Chart.defaults.color = C.INK2;
      Chart.defaults.borderColor = C.GRID;
    }
    function mk(id, cfg){
      if (!ok) return null;
      if (registry[id]) registry[id].destroy();
      registry[id] = new Chart($('#' + id), cfg);
      return registry[id];
    }
    /* 값 직접표기 datalabels 프리셋 */
    const dl = {
      top:  { display: ctx => ctx.dataset.data[ctx.dataIndex] > 0, anchor: 'end', align: 'top', offset: 0, color: C.INK2, font: { weight: 700, size: 10.5 }, formatter: v => fmt(v) },
      end:  { display: true, anchor: 'end', align: 'end', offset: 2, color: C.INK2, font: { weight: 700, size: 10.5 }, formatter: v => fmt(v) },
      pct:  { display: true, anchor: 'end', align: 'end', offset: 2, color: C.INK2, font: { weight: 700, size: 10.5 }, formatter: v => v + '%' }
    };
    function doughnutOpts(centerValue, centerUnit, unitLabel){
      return {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          centerText: { lines: [String(centerValue), centerUnit] },
          legend: {
            position: 'right',
            labels: {
              boxWidth: 11, boxHeight: 11, padding: 9, font: { size: 11.5 }, color: C.INK2,
              generateLabels(ch){
                const base = Chart.overrides.doughnut.plugins.legend.labels.generateLabels(ch);
                const data = ch.data.datasets[0].data;
                base.forEach((lb, i) => { lb.text = lb.text + ' · ' + fmt(data[i]) + (unitLabel || '명'); });
                return base;
              }
            }
          },
          tooltip: { callbacks: { label(ctx){
            const v = ctx.parsed, sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
            return ' ' + ctx.label + ': ' + fmt(v) + (unitLabel || '명') + ' (' + (sum ? (v / sum * 100).toFixed(0) : 0) + '%)';
          } } }
        }
      };
    }
    return { ok, mk, dl, doughnutOpts };
  })();

  /* ───────── 엑셀 IO ───────── */
  const xl = {
    async read(file){
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    },
    pick(row, keys){ for (const k of keys) { if (row[k] !== undefined && row[k] !== '') return row[k]; } return ''; },
    down(rows, opt){
      const ws = XLSX.utils.json_to_sheet(rows, { header: opt.headers });
      if (opt.widths) ws['!cols'] = opt.widths.map(w => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, opt.sheet || 'Sheet1');
      XLSX.writeFile(wb, opt.file);
    }
  };

  /* ───────── 타 대시보드 연동 ───────── */
  const ext = {
    /* 인력현황(①) 명부: kfc_headcount_v1 — 없으면 ok:false */
    roster(){
      const raw = readRaw('kfc_headcount_v1');
      const emps = raw && Array.isArray(raw.employees) ? raw.employees : null;
      const isActiveAt = (e, at) => {
        const j = d.toD(e.joinDate); if (!j || j > at) return false;
        const l = d.toD(e.leaveDate); return !l || l >= at;
      };
      const tenure = (e, until) => {
        const j = d.toD(e.joinDate); if (!j) return 0;
        const end = d.toD(e.leaveDate) && d.toD(e.leaveDate) < until ? d.toD(e.leaveDate) : until;
        return Math.max(0, (end - j) / (365.25 * 86400000));
      };
      return { ok: !!(emps && emps.length), employees: emps || [], isActiveAt, tenure, sample: !!(raw && raw.sample) };
    },
    meta(key){ const raw = readRaw(key); return raw && raw._meta ? raw._meta.updated : null; }
  };

  return { $, $$, esc, uid, fmt, eok, rgba, d, store, readRaw, C, shell, ui, chart, xl, ext, NAV };
})();
