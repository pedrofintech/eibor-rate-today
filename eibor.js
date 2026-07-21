/* =====================================================================
   BrokerMatch - "EIBOR rate today" tool (external bundle)
   Injects CSS + HTML into #bmc-eibor and fetches data from eibor-data.json.
   Same mechanism as the LiteraciaFinanceira "Euribor hoje" bundle:
   the whole tool (code + data) lives on GitHub and is served by jsDelivr.
   Page: https://brokermatch.ae/eibor-rate-today
   ===================================================================== */
(function(){
  "use strict";

  var DATA_URL = "https://cdn.jsdelivr.net/gh/pedrofintech/eibor-rate-today@main/eibor-data.json";

  var CSS = `/* ===================== BMC-EIBOR - styles ===================== */
#bmc-eibor{ font-family:inherit; color:#202432; -webkit-font-smoothing:antialiased; }
#bmc-eibor *{ box-sizing:border-box; }
#bmc-eibor a{ text-decoration:none; }

.bmc-eibor-cardtitle{ font-size:18px; font-weight:500; letter-spacing:-0.2px; line-height:28px; color:#202432; }
.bmc-eibor-topdivider{ width:100%; height:1px; background:#E9ECF1; margin:14px 0 24px; }

/* Hero - big 3M number */
.bmc-eibor-hero-label{ font-weight:700; font-size:13px; letter-spacing:0.05em; text-transform:uppercase; color:#4F5969; }
.bmc-eibor-hero-row{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:10px; }
.bmc-eibor-hero-val{ font-weight:700; font-size:56px; line-height:1; letter-spacing:-0.02em; color:#202432; font-variant-numeric:tabular-nums; }
.bmc-eibor-refline{ margin:14px 0 0; font-size:14px; line-height:1.55; color:#4F5969; font-weight:500; max-width:820px; }
.bmc-eibor-refline strong{ color:#202432; }
.bmc-eibor-chip{ display:inline-flex; align-items:center; gap:4px; font-size:13px; font-weight:600; padding:5px 11px; border-radius:999px; font-variant-numeric:tabular-nums; white-space:nowrap; }

.bmc-eibor-note{ font-size:13px; line-height:1.55; color:#98A2B3; margin:16px 0 0; max-width:820px; }

/* Generic blocks */
.bmc-eibor-block{ margin-top:48px; }
.bmc-eibor-block-head{ display:flex; align-items:flex-end; justify-content:space-between; flex-wrap:wrap; gap:14px; margin-bottom:18px; }
.bmc-eibor-eyebrow{ font-weight:700; font-size:13px; letter-spacing:0.06em; text-transform:uppercase; color:#0E7A46; }
.bmc-eibor-h2{ font-family:inherit; font-weight:700; font-size:30px; line-height:1.15; letter-spacing:-0.02em; color:#202432; margin:6px 0 0; }

/* Tables */
.bmc-eibor-table-wrap{ border:1px solid #E9ECF1; border-radius:12px; overflow:hidden; }
.bmc-eibor-table{ width:100%; border-collapse:collapse; font-size:14px; }
.bmc-eibor-table thead tr{ background:#FCFCFD; border-bottom:1px solid #EAECF0; }
.bmc-eibor-table th{ text-align:right; padding:13px 16px; font-weight:600; font-size:12px; letter-spacing:0.04em; text-transform:uppercase; color:#4F5969; }
.bmc-eibor-table th.bmc-eibor-th-left{ text-align:left; padding-left:24px; }
.bmc-eibor-table th.bmc-eibor-th-right{ padding-right:24px; }
.bmc-eibor-table td{ padding:12px 16px; text-align:right; font-variant-numeric:tabular-nums; color:#394455; border-bottom:1px solid #F2F4F7; }
.bmc-eibor-table td.bmc-eibor-td-label{ text-align:left; padding-left:24px; white-space:nowrap; color:#394455; }
.bmc-eibor-table td.bmc-eibor-td-last{ padding-right:24px; }
.bmc-eibor-table tr.is-today td{ background:#F2FBF6; font-weight:700; color:#202432; }
.bmc-eibor-table tr[data-extra]{ display:none; }
.bmc-eibor-table tr[data-extra].is-shown{ display:table-row; }
.bmc-eibor-morebtn{ display:inline-flex; align-items:center; gap:8px; margin-top:14px; font-size:14px; font-weight:600; color:#4F5969; border:1px solid #D0D5DD; border-radius:10px; padding:9px 16px; }
.bmc-eibor-morebtn:hover{ border-color:#98A2B3; }

/* Chart */
.bmc-eibor-ranges{ display:flex; gap:4px; background:#F2F4F7; border:1px solid #EAECF0; border-radius:12px; padding:4px; }
.bmc-eibor-ranges button{ border:0; background:transparent; font-family:inherit; font-size:13px; font-weight:600; color:#4F5969; padding:7px 14px; border-radius:9px; cursor:pointer; letter-spacing:-0.1px; }
.bmc-eibor-ranges button.is-active{ background:#fff; color:#202432; box-shadow:0 1px 2px rgba(18,23,33,0.10); }
.bmc-eibor-chartcard{ background:#fff; border:1px solid #E9ECF1; border-radius:12px; padding:22px 22px 14px; box-shadow:0 1px 3px rgba(18,23,33,0.06); }
.bmc-eibor-legend{ display:flex; align-items:center; gap:20px; margin-bottom:10px; font-size:13px; font-weight:600; color:#394455; flex-wrap:wrap; }
.bmc-eibor-legend .lg{ display:inline-flex; align-items:center; gap:7px; cursor:pointer; user-select:none; }
.bmc-eibor-legend .lg .dot{ width:11px; height:11px; border-radius:50%; }
.bmc-eibor-legend .lg.is-off{ color:#98A2B3; text-decoration:line-through; }
.bmc-eibor-canvas-wrap{ position:relative; height:340px; }

/* Simulator */
.bmc-eibor-sim{ margin-top:52px; }
.bmc-eibor-sim-h2{ font-family:inherit; font-weight:700; font-size:30px; line-height:1.2; letter-spacing:-0.02em; color:#202432; margin:6px 0 6px; }
.bmc-eibor-sim-sub{ font-size:15px; line-height:1.6; color:#4F5969; margin:0 0 24px; max-width:620px; }
.bmc-eibor-sim-grid{ display:grid; grid-template-columns:1.1fr 0.9fr; gap:20px; align-items:stretch; }
.bmc-eibor-sim-inputs{ background:#fff; border:1px solid #E9ECF1; border-radius:16px; padding:26px 24px; box-shadow:0 1px 3px rgba(18,23,33,0.06); display:flex; flex-direction:column; gap:18px; }
.bmc-eibor-sim-two{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.bmc-eibor-sim-field label{ display:block; font-size:13px; font-weight:600; color:#4F5969; margin-bottom:8px; }
.bmc-eibor-sim-field input{ width:100%; background:#fff; border:1px solid #D0D5DD; border-radius:12px; padding:13px 15px; color:#202432; font-size:16px; font-weight:600; outline:none; font-variant-numeric:tabular-nums; font-family:inherit; }
.bmc-eibor-sim-field input:focus{ border-color:var(--colors--accent-blue,#2E90FA); }
.bmc-eibor-sim-pills{ display:flex; gap:8px; }
.bmc-eibor-sim-pills button{ flex:1; background:#F2F4F7; border:1px solid #EAECF0; color:#4F5969; font-family:inherit; font-size:14px; font-weight:600; padding:12px 8px; border-radius:12px; cursor:pointer; }
.bmc-eibor-sim-pills button.is-active{ background:rgba(14,122,70,.06); border-color:#0E7A46; color:#0E7A46; }
.bmc-eibor-sim-result{ background:#121721; border-radius:16px; padding:26px 24px; display:flex; flex-direction:column; gap:16px; color:#fff; }
.bmc-eibor-sim-row{ display:flex; align-items:center; justify-content:space-between; font-size:14px; }
.bmc-eibor-sim-row span:first-child{ color:rgba(255,255,255,0.6); }
.bmc-eibor-sim-row span:last-child{ font-weight:600; color:#fff; font-variant-numeric:tabular-nums; }
.bmc-eibor-sim-row--rate{ border-top:1px solid #2B3140; padding-top:14px; }
.bmc-eibor-sim-row--rate span:last-child{ color:#75E0A7; font-weight:700; }
.bmc-eibor-sim-prest{ border-top:1px solid #2B3140; padding-top:16px; }
.bmc-eibor-sim-prest-label{ display:block; font-size:13px; color:rgba(255,255,255,0.6); margin-bottom:4px; }
.bmc-eibor-sim-prest-val{ font-family:inherit; font-weight:700; font-size:40px; line-height:1; color:#fff; font-variant-numeric:tabular-nums; letter-spacing:-0.02em; }
.bmc-eibor-sim-shock{ background:rgba(240,68,56,0.14); border:1px solid rgba(253,162,155,0.25); border-radius:12px; padding:12px 14px; font-size:13px; line-height:1.45; color:#FDA29B; }
.bmc-eibor-sim-shock strong{ color:#fff; }
.bmc-eibor-sim-foot{ font-size:12px; line-height:1.55; color:#98A2B3; margin:22px 0 0; }
.bmc-eibor-sim-link{ color:var(--colors--accent-blue,#2E90FA); text-decoration:underline; }

/* ---------- Responsive ---------- */
@media (max-width:767px){
  .bmc-eibor-hero-val{ font-size:44px; }
  .bmc-eibor-h2, .bmc-eibor-sim-h2{ font-size:25px; }
  .bmc-eibor-sim-grid{ grid-template-columns:1fr; gap:22px; }
  .bmc-eibor-sim-prest-val{ font-size:34px; }
  .bmc-eibor-canvas-wrap{ height:280px; }
  .bmc-eibor-table th, .bmc-eibor-table td{ padding:11px 12px; }
  .bmc-eibor-table th.bmc-eibor-th-left, .bmc-eibor-table td.bmc-eibor-td-label{ padding-left:16px; }
  .bmc-eibor-table th.bmc-eibor-th-right, .bmc-eibor-table td.bmc-eibor-td-last{ padding-right:16px; }
}
@media (max-width:479px){
  .bmc-eibor-hero-val{ font-size:38px; }
  .bmc-eibor-sim-two{ grid-template-columns:1fr; }
}`;

  var HTML = `<div class="bmc-eibor-cardtitle">EIBOR today (updated every UAE business day)</div>
  <div class="bmc-eibor-topdivider"></div>

  <!-- ======================= HERO - EIBOR 3M ======================= -->
  <span class="bmc-eibor-hero-label">EIBOR 3 months - the UAE mortgage benchmark</span>
  <div class="bmc-eibor-hero-row">
    <span class="bmc-eibor-hero-val" id="bmc-eibor-hero-val">-</span>
    <span id="bmc-eibor-hero-chip"></span>
  </div>
  <p class="bmc-eibor-refline">Official Central Bank of the UAE fixings. Latest fixing: <strong id="bmc-eibor-refdate">-</strong> &middot; new fixings are published every UAE business day (Mon&ndash;Fri) around 12:15 UAE time; the Friday fixing holds over the weekend.</p>

  <!-- ======================= TODAY - ALL TENORS ======================= -->
  <div class="bmc-eibor-block">
    <div class="bmc-eibor-block-head">
      <div>
        <span class="bmc-eibor-eyebrow">All tenors</span>
        <h2 class="bmc-eibor-h2">EIBOR rates today</h2>
      </div>
    </div>
    <div class="bmc-eibor-table-wrap">
      <table class="bmc-eibor-table">
        <thead>
          <tr>
            <th class="bmc-eibor-th-left">Tenor</th>
            <th>Today</th>
            <th>Previous day</th>
            <th class="bmc-eibor-th-right">Change</th>
          </tr>
        </thead>
        <tbody id="bmc-eibor-today-tbody"></tbody>
      </table>
    </div>
    <p class="bmc-eibor-note">Changes are in percentage points (p.p.) versus the previous business day. A rise in EIBOR makes variable-rate borrowing more expensive; a fall makes it cheaper. Most UAE mortgages track the 3 month tenor (highlighted).</p>
  </div>

  <!-- ======================= CHART ======================= -->
  <div class="bmc-eibor-block">
    <div class="bmc-eibor-block-head">
      <div>
        <span class="bmc-eibor-eyebrow">Chart</span>
        <h2 class="bmc-eibor-h2">EIBOR trend - 1M, 3M, 6M and 12M</h2>
      </div>
      <div class="bmc-eibor-ranges" id="bmc-eibor-ranges">
        <button data-range="30d" class="is-active">Daily</button>
        <button data-range="1y">1 year</button>
      </div>
    </div>
    <div class="bmc-eibor-chartcard">
      <div class="bmc-eibor-legend" id="bmc-eibor-legend"></div>
      <div class="bmc-eibor-canvas-wrap"><canvas id="bmc-eibor-canvas"></canvas></div>
    </div>
    <p class="bmc-eibor-note">Hover the chart to see the values on each date. "Daily" shows the recent official fixings; "1 year" shows monthly averages.</p>
  </div>

  <!-- ======================= DAILY HISTORY ======================= -->
  <div class="bmc-eibor-block">
    <div class="bmc-eibor-block-head">
      <div>
        <span class="bmc-eibor-eyebrow" id="bmc-eibor-table-eyebrow">Last business days</span>
        <h2 class="bmc-eibor-h2">Daily history</h2>
      </div>
    </div>
    <div class="bmc-eibor-table-wrap">
      <table class="bmc-eibor-table">
        <thead>
          <tr>
            <th class="bmc-eibor-th-left">Date</th>
            <th>1 month</th>
            <th>3 months</th>
            <th>6 months</th>
            <th class="bmc-eibor-th-right">12 months</th>
          </tr>
        </thead>
        <tbody id="bmc-eibor-tbody"></tbody>
      </table>
    </div>
    <a href="#" id="bmc-eibor-more" class="bmc-eibor-morebtn">Show more days</a>
  </div>

  <!-- ======================= SIMULATOR ======================= -->
  <div class="bmc-eibor-sim">
    <span class="bmc-eibor-eyebrow">Simulator</span>
    <h2 class="bmc-eibor-sim-h2">How EIBOR moves your mortgage payment</h2>
    <p class="bmc-eibor-sim-sub">Enter your outstanding balance, the remaining term and your bank margin. We apply today's EIBOR for the tenor you pick. It is an estimate - your bank rounds and may apply other conditions.</p>
    <div class="bmc-eibor-sim-grid">
      <div class="bmc-eibor-sim-inputs">
        <div class="bmc-eibor-sim-field">
          <label for="bmc-eibor-bal">Outstanding balance (AED)</label>
          <input id="bmc-eibor-bal" type="text" inputmode="numeric" value="1,500,000">
        </div>
        <div class="bmc-eibor-sim-two">
          <div class="bmc-eibor-sim-field">
            <label for="bmc-eibor-years">Remaining term (years)</label>
            <input id="bmc-eibor-years" type="text" inputmode="numeric" value="20">
          </div>
          <div class="bmc-eibor-sim-field">
            <label for="bmc-eibor-margin">Bank margin (%)</label>
            <input id="bmc-eibor-margin" type="text" inputmode="decimal" value="1.50">
          </div>
        </div>
        <div class="bmc-eibor-sim-field">
          <label>EIBOR tenor (how often your rate resets)</label>
          <div class="bmc-eibor-sim-pills" id="bmc-eibor-pills">
            <button data-tenor="m1">1 month</button>
            <button data-tenor="m3" class="is-active">3 months</button>
            <button data-tenor="m6">6 months</button>
          </div>
        </div>
      </div>
      <div class="bmc-eibor-sim-result">
        <div class="bmc-eibor-sim-row"><span>EIBOR <span id="bmc-eibor-sim-tenorlabel">3 months</span></span><span id="bmc-eibor-sim-eibor">-</span></div>
        <div class="bmc-eibor-sim-row"><span>+ Bank margin</span><span id="bmc-eibor-sim-margin">-</span></div>
        <div class="bmc-eibor-sim-row bmc-eibor-sim-row--rate"><span>= Your rate</span><span id="bmc-eibor-sim-rate">-</span></div>
        <div class="bmc-eibor-sim-prest">
          <span class="bmc-eibor-sim-prest-label">Estimated monthly payment</span>
          <span class="bmc-eibor-sim-prest-val" id="bmc-eibor-sim-pay">-</span>
        </div>
        <div class="bmc-eibor-sim-shock">If EIBOR rises <strong>+0.50 p.p.</strong>, your payment goes up by about <strong id="bmc-eibor-sim-shock">-</strong> per month.</div>
      </div>
    </div>
    <p class="bmc-eibor-sim-foot">Indicative simulation (constant installment / reducing balance). It excludes insurance, fees and bank rounding and is not financial advice. Run the full numbers in our <a href="/mortgage-calculator-uae" class="bmc-eibor-sim-link">mortgage calculator</a> or the <a href="/personal-loan-calculator-uae" class="bmc-eibor-sim-link">personal loan calculator</a>.</p>
  </div>`;

  function run(DATA){
    var SERIES = DATA.series || [];
    var HISTORY = DATA.history || [];

    var TENORS_ALL = [
      { key:'on',  label:'Overnight' },
      { key:'w1',  label:'1 week' },
      { key:'m1',  label:'1 month' },
      { key:'m3',  label:'3 months' },
      { key:'m6',  label:'6 months' },
      { key:'m12', label:'12 months' }
    ];
    var CHART_TENORS = [
      { key:'m1',  label:'1 month',   color:'#17B26A' },
      { key:'m3',  label:'3 months',  color:'#2E90FA' },
      { key:'m6',  label:'6 months',  color:'#F79009' },
      { key:'m12', label:'12 months', color:'#9B8AFB' }
    ];

    /* ---------------- Helpers (en, dot decimals) ---------------- */
    function isNum(v){ return typeof v==='number' && isFinite(v); }
    function fmtPct(v){
      if(v==null) return '-';
      if(typeof v==='string') return v+'%';        /* placeholders like "X.XX" print as-is */
      if(!isFinite(v)) return '-';
      return v.toFixed(3)+'%';
    }
    function fmtPP(delta){
      if(!isNum(delta)) return '';
      var s=(delta>0?'+':delta<0?'-':'')+Math.abs(delta).toFixed(3);
      return s+' p.p.';
    }
    function fmtAED(v){
      if(!isFinite(v)) return '-';
      return 'AED '+Math.round(Math.abs(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
    }
    function parseNum(str){
      if(str==null) return 0;
      return parseFloat(String(str).replace(/[,\s]/g,''))||0;
    }
    function shortDate(s){ var p=s.split('/'); return p[0]+'/'+p[1]; }

    var last = SERIES[SERIES.length-1] || {};
    var prev = SERIES[SERIES.length-2] || last;

    /* ---------------- Hero ---------------- */
    var refEl=document.getElementById('bmc-eibor-refdate');
    if(refEl){
      var rd=DATA.referenceDate || '-';
      var wd='';
      if(/^\d{2}\/\d{2}\/\d{4}$/.test(rd)){
        var p=rd.split('/');
        var dt=new Date(+p[2], +p[1]-1, +p[0]);
        wd=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dt.getDay()]+', ';
      }
      refEl.textContent = wd + rd;
    }
    var heroVal=document.getElementById('bmc-eibor-hero-val');
    if(heroVal) heroVal.textContent = fmtPct(last.m3);

    function chip(a,b,small){
      var el='<span class="bmc-eibor-chip" style="';
      if(!isNum(a)||!isNum(b)){ return el+'color:#98A2B3;background:#F2F4F7;">&#8226; -</span>'; }
      var d=a-b, up=d>0.0004, down=d<-0.0004;
      var color=up?'#F04438':down?'#17B26A':'#98A2B3';
      var bg=up?'#FEF3F2':down?'#ECFDF3':'#F2F4F7';
      var arrow=up?'&#9650;':down?'&#9660;':'&#8226;';
      return el+'color:'+color+';background:'+bg+';">'+arrow+' '+fmtPP(d)+'</span>';
    }
    var heroChip=document.getElementById('bmc-eibor-hero-chip');
    if(heroChip) heroChip.innerHTML = chip(last.m3, prev.m3);

    /* ---------------- Today table (all tenors) ---------------- */
    (function renderToday(){
      var tb=document.getElementById('bmc-eibor-today-tbody'); if(!tb) return;
      var html='';
      TENORS_ALL.forEach(function(t){
        var cls = t.key==='m3' ? ' class="is-today"' : '';
        var d = (isNum(last[t.key])&&isNum(prev[t.key])) ? (last[t.key]-prev[t.key]) : null;
        var dTxt = d==null ? '-' : ((d>0?'+':d<0?'-':'')+Math.abs(d).toFixed(3));
        html+='<tr'+cls+'>'
          +'<td class="bmc-eibor-td-label">'+t.label+'</td>'
          +'<td>'+fmtPct(last[t.key])+'</td>'
          +'<td>'+fmtPct(prev[t.key])+'</td>'
          +'<td class="bmc-eibor-td-last">'+dTxt+'</td></tr>';
      });
      tb.innerHTML=html;
    })();

    /* ---------------- Daily history table ---------------- */
    var INITIAL_ROWS=10;
    (function renderHistory(){
      var tb=document.getElementById('bmc-eibor-tbody'); if(!tb) return;
      var rows=SERIES.slice().reverse().slice(0,30);
      var eb=document.getElementById('bmc-eibor-table-eyebrow');
      if(eb) eb.textContent='Last '+rows.length+' business days';
      var html='';
      rows.forEach(function(r,i){
        var extra=i>=INITIAL_ROWS?' data-extra="1"':'';
        var today=i===0?' class="is-today"':'';
        html+='<tr'+today+extra+'>'
          +'<td class="bmc-eibor-td-label">'+r.d+'</td>'
          +'<td>'+fmtPct(r.m1)+'</td>'
          +'<td>'+fmtPct(r.m3)+'</td>'
          +'<td>'+fmtPct(r.m6)+'</td>'
          +'<td class="bmc-eibor-td-last">'+fmtPct(r.m12)+'</td></tr>';
      });
      tb.innerHTML=html;
      var moreBtn=document.getElementById('bmc-eibor-more');
      var extras=tb.querySelectorAll('tr[data-extra]');
      if(extras.length===0 && moreBtn){ moreBtn.style.display='none'; }
      if(moreBtn){
        moreBtn.addEventListener('click',function(e){
          e.preventDefault();
          var shown=tb.querySelector('tr[data-extra].is-shown');
          if(shown){ extras.forEach(function(t){t.classList.remove('is-shown');}); moreBtn.textContent='Show more days'; }
          else { extras.forEach(function(t){t.classList.add('is-shown');}); moreBtn.textContent='Show fewer days'; }
        });
      }
    })();

    /* ---------------- Chart (Chart.js) ---------------- */
    function loadChartJS(cb){
      if(window.Chart){ cb(); return; }
      var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/chart.js';
      s.onload=cb; document.head.appendChild(s);
    }
    var chart=null, hidden={m1:false,m3:false,m6:false,m12:false}, currentRange='30d';

    function dataForRange(range){
      if(range==='30d'){
        var rows=SERIES.slice(-30);
        return { labels:rows.map(function(r){return shortDate(r.d);}), rows:rows, mode:'d' };
      }
      var rows2=HISTORY.slice(-12);
      return { labels:rows2.map(function(r){ var p=r.d.split('-'); return p[1]+'/'+p[0].slice(2); }), rows:rows2, mode:'m' };
    }
    function buildLegend(){
      var el=document.getElementById('bmc-eibor-legend'); if(!el) return;
      el.innerHTML=CHART_TENORS.map(function(p){
        return '<span class="lg'+(hidden[p.key]?' is-off':'')+'" data-key="'+p.key+'"><span class="dot" style="background:'+p.color+';"></span>'+p.label+'</span>';
      }).join('');
      el.querySelectorAll('.lg').forEach(function(lg){
        lg.addEventListener('click',function(){
          var k=lg.getAttribute('data-key'); hidden[k]=!hidden[k];
          lg.classList.toggle('is-off',hidden[k]); drawChart();
        });
      });
    }
    function drawChart(){
      var d=dataForRange(currentRange);
      var accent=(getComputedStyle(document.documentElement).getPropertyValue('--colors--accent-blue')||'').trim()||'#2E90FA';
      CHART_TENORS[1].color=accent;
      var datasets=CHART_TENORS.filter(function(p){return !hidden[p.key];}).map(function(p){
        return { label:p.label, data:d.rows.map(function(r){return isNum(r[p.key])?r[p.key]:null;}), borderColor:p.color,
          backgroundColor:p.color, borderWidth:2, pointRadius:0, pointHoverRadius:4, tension:0.25, fill:false, spanGaps:true };
      });
      var cfg={ type:'line', data:{ labels:d.labels, datasets:datasets },
        options:{ responsive:true, maintainAspectRatio:false, animation:false,
          interaction:{ mode:'index', intersect:false },
          plugins:{ legend:{display:false},
            tooltip:{ backgroundColor:'#121721', borderRadius:8, padding:10, usePointStyle:true,
              titleColor:'#fff', bodyColor:'#E9ECF1',
              callbacks:{ label:function(c){ return ' '+c.dataset.label+': '+(c.parsed.y==null?'-':c.parsed.y.toFixed(3)+'%'); } } } },
          scales:{
            x:{ grid:{display:false}, ticks:{ color:'#4F5969', font:{family:'Inter',size:11}, maxRotation:0, autoSkip:true, maxTicksLimit:d.mode==='d'?8:9 } },
            y:{ grid:{color:'#E9ECF1'}, ticks:{ color:'#4F5969', font:{family:'Inter',size:11}, callback:function(v){return v.toFixed(2)+'%';} } }
          }
        } };
      if(chart){ chart.data=cfg.data; chart.options=cfg.options; chart.update(); }
      else { chart=new Chart(document.getElementById('bmc-eibor-canvas').getContext('2d'), cfg); }
    }
    (function initChart(){
      var ranges=document.getElementById('bmc-eibor-ranges');
      loadChartJS(function(){ buildLegend(); drawChart(); });
      if(ranges){
        ranges.addEventListener('click',function(e){
          var b=e.target.closest('button'); if(!b) return;
          currentRange=b.getAttribute('data-range');
          ranges.querySelectorAll('button').forEach(function(x){x.classList.remove('is-active');});
          b.classList.add('is-active');
          if(window.Chart) drawChart();
        });
      }
    })();

    /* ---------------- Simulator ---------------- */
    var simTenor='m3';
    var TENOR_LABELS={ m1:'1 month', m3:'3 months', m6:'6 months' };
    function payment(capital, years, ratePct){
      var i=ratePct/100/12, n=Math.round(years*12);
      if(n<=0) return 0;
      if(i<=0) return capital/n;
      return capital*i/(1-Math.pow(1+i,-n));
    }
    function runSim(){
      var eibor=last[simTenor];
      var lbl=document.getElementById('bmc-eibor-sim-tenorlabel');
      if(lbl) lbl.textContent=TENOR_LABELS[simTenor]||'';
      var bal=parseNum(document.getElementById('bmc-eibor-bal').value);
      var years=parseNum(document.getElementById('bmc-eibor-years').value);
      var margin=parseNum(document.getElementById('bmc-eibor-margin').value);
      var elE=document.getElementById('bmc-eibor-sim-eibor');
      var elM=document.getElementById('bmc-eibor-sim-margin');
      var elR=document.getElementById('bmc-eibor-sim-rate');
      var elP=document.getElementById('bmc-eibor-sim-pay');
      var elS=document.getElementById('bmc-eibor-sim-shock');
      if(!isNum(eibor)){
        if(elE) elE.textContent=fmtPct(eibor);
        if(elM) elM.textContent=(margin>0?'+ ':'')+margin.toFixed(2)+'%';
        if(elR) elR.textContent='-';
        if(elP) elP.textContent='-';
        if(elS) elS.textContent='-';
        return;
      }
      var rate=eibor+margin;
      var p0=payment(bal,years,rate);
      var p1=payment(bal,years,rate+0.5);
      if(elE) elE.textContent=fmtPct(eibor);
      if(elM) elM.textContent=(margin>0?'+ ':'')+margin.toFixed(2)+'%';
      if(elR) elR.textContent=rate.toFixed(3)+'%';
      if(elP) elP.textContent=fmtAED(p0);
      if(elS) elS.textContent=fmtAED(p1-p0);
    }
    ['bmc-eibor-bal','bmc-eibor-years','bmc-eibor-margin'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.addEventListener('input',runSim);
    });
    var pills=document.getElementById('bmc-eibor-pills');
    if(pills){
      pills.addEventListener('click',function(e){
        var b=e.target.closest('button'); if(!b) return;
        simTenor=b.getAttribute('data-tenor');
        pills.querySelectorAll('button').forEach(function(x){x.classList.remove('is-active');});
        b.classList.add('is-active'); runSim();
      });
    }
    runSim();
  }

  function boot(DATA){
    if(!document.getElementById('bmc-eibor-style')){
      var st=document.createElement('style'); st.id='bmc-eibor-style'; st.textContent=CSS;
      (document.head||document.documentElement).appendChild(st);
    }
    var root=document.getElementById('bmc-eibor'); if(!root){ return; }
    root.innerHTML=HTML;
    run(DATA);
  }

  function start(){
    fetch(DATA_URL,{cache:'no-store'})
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(boot)
      .catch(function(err){
        console.error('[eibor] failed to load data', err);
        var root=document.getElementById('bmc-eibor');
        if(root){ root.innerHTML='<p style="font:14px/1.5 inherit;color:#98A2B3;margin:0;">Could not load the EIBOR data. Please try again in a moment.</p>'; }
      });
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', start); } else { start(); }
})();
