// Styles for the Leotards page (monthly sheets + stock tab).
// Colours are tokens on .lsw-page, redefined for dark mode under html.dark.
export const LEOTARD_CSS = `
.lsw-page{
  --lsw-ink:#3b2230;--lsw-muted:#8c6b7a;--lsw-rose:#d4667a;--lsw-rose2:#ec9aae;--lsw-gold:#c9a27a;
  --lsw-card:#ffffff;--lsw-blush:#fff5f7;--lsw-line:#f2dfe5;--lsw-head:#fce4eb;--lsw-zebra:#fffafb;
  --lsw-hover:#fdeef2;--lsw-shadow:0 8px 28px rgba(185,95,120,.09);--lsw-shadow-sm:0 2px 10px rgba(185,95,120,.07);
  --lsw-grad:linear-gradient(135deg,#ec9aae 0%,#d4667a 100%);
  --txt1:var(--lsw-ink);--txt2:var(--lsw-muted);--border:var(--lsw-line);--surface:var(--lsw-card);
  --bg-card:var(--lsw-blush);--bg-page:var(--lsw-blush);--bg-popup:var(--lsw-card);
  position:relative;padding:28px 32px 32px;min-height:100%;color:var(--lsw-ink);
  background:radial-gradient(1200px 420px at 75% -120px,#fde3ea 0%,transparent 70%),linear-gradient(180deg,#fff8fa 0%,#fdf2f5 100%);
}
html.dark .lsw-page{
  --lsw-ink:#f7eaf0;--lsw-muted:#c3a6b3;--lsw-card:#1c1720;--lsw-blush:#241c26;--lsw-line:rgba(255,255,255,.09);
  --lsw-head:#3a2331;--lsw-zebra:#201b24;--lsw-hover:#2c1f2a;
  --lsw-shadow:0 8px 28px rgba(0,0,0,.35);--lsw-shadow-sm:0 2px 10px rgba(0,0,0,.3);
  background:radial-gradient(1100px 420px at 75% -120px,rgba(212,102,122,.18) 0%,transparent 70%),var(--lsw-bg,#120f17);
}

/* Header */
.lsw-top{position:relative;display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-bottom:22px;min-height:92px}
.lsw-ribbon{position:absolute;inset-inline-end:220px;top:-28px;width:440px;height:150px;pointer-events:none;opacity:.9}
.lsw-page.rtl .lsw-ribbon{transform:scaleX(-1)}
html.dark .lsw-ribbon{opacity:.45}
.lsw-brand{position:relative;display:flex;align-items:center;gap:16px;margin-inline-end:auto}
.lsw-logo{width:64px;height:64px;border-radius:18px;background:var(--lsw-grad);color:#fff;display:grid;place-items:center;font:600 30px/1 Georgia,'Times New Roman',serif;box-shadow:0 10px 24px rgba(212,102,122,.35),inset 0 1px 0 rgba(255,255,255,.35)}
.lsw-brand h1{margin:0;color:var(--lsw-ink);font:600 34px/1.1 'Playfair Display',Georgia,'Times New Roman',serif;letter-spacing:.2px}
.lsw-page.rtl .lsw-brand h1{font-family:inherit;font-weight:800;font-size:30px}
.lsw-crumb{display:flex;align-items:center;gap:8px;margin-top:6px;color:var(--lsw-muted);font-size:13.5px}
.lsw-crumb a{display:inline-flex;color:var(--lsw-rose)}
.lsw-crumb a:hover{opacity:.8}
.lsw-tools{position:relative;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.lsw-sync{position:relative;font-size:12.5px;font-weight:600;border-radius:999px;padding:6px 12px;white-space:nowrap;border:1px solid var(--lsw-line);color:var(--lsw-muted);background:var(--lsw-card)}
.lsw-sync.ok{color:#2f9a6d;background:color-mix(in srgb,#3dab7e 10%,var(--lsw-card));border-color:#3dab7e40}
.lsw-sync.bad{color:#e04040;background:color-mix(in srgb,#e04040 10%,var(--lsw-card));border-color:#e0404050}

/* Buttons */
.lsw-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 20px;border:0;border-radius:14px;background:var(--lsw-grad);color:#fff;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;box-shadow:0 8px 20px rgba(212,102,122,.32);transition:transform .15s,box-shadow .15s,filter .15s}
.lsw-btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(212,102,122,.4)}
.lsw-btn:focus-visible{outline:2px solid var(--lsw-rose);outline-offset:2px}
.lsw-btn:disabled{opacity:.6;cursor:default;transform:none}
.lsw-btn.ghost{background:var(--lsw-card);color:var(--lsw-ink);border:1px solid var(--lsw-line);box-shadow:var(--lsw-shadow-sm);font-weight:600}
.lsw-btn.ghost:hover{border-color:var(--lsw-rose2);color:var(--lsw-rose)}

/* Search + filters */
.lsw-filters{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:22px}
.lsw-search{display:flex;align-items:center;gap:10px;height:48px;flex:0 1 300px;min-width:240px;padding:0 18px;border:1px solid var(--lsw-line);border-radius:999px;background:var(--lsw-card);color:var(--lsw-muted);box-shadow:var(--lsw-shadow-sm);transition:border-color .15s,box-shadow .15s}
.lsw-search:focus-within{border-color:var(--lsw-rose);box-shadow:0 0 0 3px rgba(212,102,122,.18)}
.lsw-search input{border:0;outline:0;background:transparent;font:inherit;font-size:14px;color:var(--lsw-ink);width:100%;height:100%}
.lsw-search input::placeholder{color:var(--lsw-muted)}
.lsw-filter{position:relative;display:inline-flex;align-items:center;gap:8px;height:48px;padding-inline-start:16px;border:1px solid var(--lsw-line);border-radius:999px;background:var(--lsw-card);color:var(--lsw-muted);font-size:14px;white-space:nowrap;cursor:pointer;box-shadow:var(--lsw-shadow-sm);transition:border-color .15s,box-shadow .15s,background .15s}
.lsw-filter svg{color:var(--lsw-rose);flex-shrink:0}
.lsw-filter:hover{border-color:var(--lsw-rose2)}
.lsw-filter:focus-within{border-color:var(--lsw-rose);box-shadow:0 0 0 3px rgba(212,102,122,.18)}
.lsw-filter select{appearance:none;-webkit-appearance:none;border:0;outline:0;height:46px;border-radius:999px;font:inherit;font-size:14px;font-weight:700;color:var(--lsw-ink);cursor:pointer;padding:0 40px 0 2px;background:transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23c9748a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 16px center}
.lsw-page.rtl .lsw-filter select{background-position:left 16px center;padding:0 2px 0 40px}
.lsw-filter option,.lsw-modal option{background:var(--lsw-card);color:var(--lsw-ink);font-weight:400}
.lsw-filter.on{border-color:var(--lsw-rose);background:color-mix(in srgb,var(--lsw-rose) 10%,var(--lsw-card));color:var(--lsw-rose)}
.lsw-filter.on select{color:var(--lsw-rose)}
.lsw-clear{border:0;background:none;color:var(--lsw-rose);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;height:40px;padding:0 12px;border-radius:999px}
.lsw-clear:hover{background:color-mix(in srgb,var(--lsw-rose) 10%,transparent)}
.lsw-fcount{margin-inline-start:auto;color:var(--lsw-muted);font-size:13px;font-variant-numeric:tabular-nums}

/* Stat cards */
.lsw-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:18px;margin-bottom:22px}
.lsw-stat{--tone:var(--lsw-rose);position:relative;overflow:hidden;display:flex;align-items:center;gap:16px;min-height:112px;background:var(--lsw-card);border:1px solid var(--lsw-line);border-radius:20px;padding:18px 20px;box-shadow:var(--lsw-shadow);isolation:isolate}
.lsw-stat::after{content:"";position:absolute;z-index:-1;inset-inline-end:-18%;bottom:-58%;width:95%;height:95%;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--tone) 16%,transparent),transparent)}
.lsw-stat .ic{flex-shrink:0;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:var(--tone);background:color-mix(in srgb,var(--tone) 15%,var(--lsw-card))}
.lsw-stat .tx{min-width:0}
.lsw-stat span{display:block;color:var(--lsw-muted);font-size:14px;font-weight:500;line-height:1.3}
.lsw-stat b{display:block;margin-top:6px;font-size:26px;line-height:1.15;font-weight:700;color:var(--lsw-ink);font-variant-numeric:tabular-nums}
.lsw-stat.click{appearance:none;font:inherit;text-align:start;cursor:pointer;width:100%;transition:border-color .15s,box-shadow .15s,transform .15s}
.lsw-stat.click:hover{border-color:color-mix(in srgb,var(--tone) 55%,transparent);transform:translateY(-1px)}
.lsw-stat.click:focus-visible{outline:2px solid var(--tone);outline-offset:2px}
.lsw-stat.click[aria-pressed=true]{border-color:var(--tone);box-shadow:0 0 0 2px var(--tone),var(--lsw-shadow)}
.lsw-stat.pink{--tone:#d4667a}
.lsw-stat.info{--tone:#9b6bd6}
.lsw-stat.ok{--tone:#2f9a6d}
.lsw-stat.ok b{color:#2f9a6d}
.lsw-stat.amber{--tone:#e8960a}
.lsw-stat.amber b{color:#e08a00}
.lsw-stat.lav{--tone:#8a7ad8}
.lsw-stat.warn{--tone:#e04040}
.lsw-stat.warn b{color:#e04040}
.lsw-stat.click.calm b{color:var(--lsw-ink)}
html.dark .lsw-stat.ok b{color:#5fd3a0}
html.dark .lsw-stat.amber b{color:#f2b04a}

/* Messages */
.lsw-err{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 12px;padding:10px 14px;border-radius:12px;background:color-mix(in srgb,#e04040 9%,var(--lsw-card));border:1px solid #e0404045;color:#e04040;font-size:13px;font-weight:600}
.lsw-err button{border:0;border-radius:8px;background:#e04040;color:#fff;font:inherit;font-weight:700;padding:6px 14px;cursor:pointer}

/* Sheet */
.lsw-wrap{--cell:var(--lsw-card);background:var(--lsw-card);border:1px solid var(--lsw-line);border-radius:20px;overflow:auto;max-height:max(380px,calc(100vh - 430px));box-shadow:var(--lsw-shadow);scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--lsw-rose) 40%,transparent) transparent}
.lsw-wrap table{direction:ltr;border-collapse:separate;border-spacing:0;width:100%;min-width:1380px}
.lsw-wrap th,.lsw-wrap td{border-bottom:1px solid var(--lsw-line);padding:0 12px;height:54px;text-align:center;white-space:nowrap;background:var(--cell);color:var(--lsw-ink);font-size:14px}
.lsw-wrap thead th{position:sticky;top:0;z-index:2;height:58px;background:var(--lsw-head);color:var(--lsw-ink);font-weight:700;font-size:14.5px;letter-spacing:.1px;border-bottom:0}
.lsw-wrap thead th.sm{font-size:12.5px}
.lsw-wrap thead th.idx{width:64px}
.lsw-hash{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--lsw-grad);color:#fff;font-size:13px;font-weight:700;box-shadow:0 4px 10px rgba(212,102,122,.35)}
.lsw-wrap tbody tr:nth-child(even) td{background:var(--lsw-zebra)}
.lsw-wrap tbody tr:hover td{background:var(--lsw-hover)}
.lsw-wrap tbody tr:last-child td{border-bottom:0}
.lsw-wrap td.idx{width:64px;color:var(--lsw-muted);font-variant-numeric:tabular-nums}
.lsw-wrap td.num,.lsw-wrap tfoot td{font-variant-numeric:tabular-nums}
.lsw-wrap td.due{color:#e04040;font-weight:700}
.lsw-wrap td.zero{color:var(--lsw-muted)}
.lsw-wrap td input::placeholder{color:var(--lsw-muted);opacity:.7}
.lsw-wrap td input.blank{color:var(--lsw-muted)}
.lsw-wrap tfoot td{position:sticky;bottom:0;z-index:2;background:color-mix(in srgb,var(--lsw-rose) 8%,var(--lsw-card));font-weight:700;border-top:1px solid var(--lsw-line);border-bottom:0}
.lsw-wrap th:nth-child(2),.lsw-wrap td:nth-child(2){position:sticky;left:0;z-index:1;border-right:1px solid var(--lsw-line)}
.lsw-wrap thead th:nth-child(2),.lsw-wrap tfoot td:nth-child(2){z-index:3}
.lsw-wrap td.act,.lsw-wrap th.act{width:56px;padding:0 8px;position:sticky;right:0;z-index:1;border-left:1px solid var(--lsw-line)}
.lsw-wrap thead th.act,.lsw-wrap tfoot td.act{z-index:3}
.lsw-del{display:inline-grid;place-items:center;border:1px solid #e0404035;background:color-mix(in srgb,#e04040 8%,var(--lsw-card));color:#e04040;cursor:pointer;width:34px;height:34px;border-radius:10px;transition:background .15s,color .15s}
.lsw-del:hover,.lsw-del:focus-visible{background:#e04040;color:#fff;outline:0}
.lsw-wrap td input{width:100%;height:36px;border:1px solid transparent;border-radius:10px;background:transparent;font:inherit;text-align:center;color:inherit;padding:0 6px;transition:border-color .15s,background .15s}
.lsw-wrap td input:hover{border-color:var(--lsw-line);background:var(--lsw-card)}
.lsw-wrap td input:focus,.lsw-wrap td select:focus{outline:2px solid var(--lsw-rose);outline-offset:1px;border-color:transparent;background:var(--lsw-card)}
.lsw-wrap td input[type=number]{width:88px;-moz-appearance:textfield;appearance:textfield}
.lsw-wrap td input[type=number]::-webkit-inner-spin-button{display:none}
.lsw-wrap td input[name=name]{min-width:160px}
html.dark .lsw-wrap td input[type=date]{color-scheme:dark}

/* Cell chips (colours mirror the paper sheet) */
.lsw-chip{position:relative;display:inline-block;--bg:#e8eaed;--fg:#3d3d3d}
.lsw-chip select{appearance:none;-webkit-appearance:none;border:0;border-radius:999px;background:var(--bg);color:var(--fg);font:inherit;font-weight:600;font-size:13.5px;height:30px;min-width:104px;padding:0 14px 0 30px;text-align:center;text-align-last:center;cursor:pointer}
.lsw-chip.wide select{min-width:140px}
.lsw-chip::after{content:"";position:absolute;left:12px;top:50%;margin-top:-2px;border:5px solid transparent;border-top-color:var(--fg);border-bottom:0;pointer-events:none}
.lsw-chip.empty select{background:transparent;color:var(--lsw-muted);box-shadow:inset 0 0 0 1px var(--lsw-line)}
.lsw-chip.empty::after{border-top-color:var(--lsw-muted);opacity:.7}
.lsw-chip option{background:#fff;color:#1f1f1f}
.lsw-pill{display:inline-block;border-radius:999px;background:var(--bg);color:var(--fg);font-weight:600;font-size:13.5px;height:30px;line-height:30px;min-width:104px;padding:0 14px;cursor:default}
.lsw-toggle{border:0;border-radius:999px;height:30px;min-width:104px;padding:0 14px;font:inherit;font-weight:600;font-size:13.5px;cursor:pointer;background:transparent;color:color-mix(in srgb,var(--lsw-muted) 75%,transparent);box-shadow:inset 0 0 0 1px var(--lsw-line);transition:background .15s,color .15s}
.lsw-toggle:hover{color:var(--lsw-ink)}
.lsw-toggle[aria-pressed=true]{background:var(--bg);color:var(--fg);box-shadow:none}
.lsw-toggle:focus-visible{outline:2px solid var(--lsw-rose);outline-offset:1px}

/* Empty state */
.lsw-empty{display:flex;flex-direction:column;align-items:center;padding:36px 20px 44px;text-align:center;color:var(--lsw-ink);font-size:16px}
.lsw-empty > svg{width:220px;max-width:70%;height:auto;margin-bottom:14px}
.lsw-empty .lsw-btn{margin-top:20px}

/* Stock tab container */
.lsw-stockpane{background:var(--lsw-card);border:1px solid var(--lsw-line);border-radius:20px;padding:24px;box-shadow:var(--lsw-shadow)}
.lsw-page .lst-tools select{appearance:none;-webkit-appearance:none;cursor:pointer;background:var(--lsw-blush) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23c9748a' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 12px center;padding:0 34px 0 12px;text-overflow:ellipsis}
.lsw-page.rtl .lst-tools select{background-position:left 12px center;padding:0 12px 0 34px}
.lsw-page .lst-tools select:hover{border-color:var(--lsw-rose2)}
.lsw-page .lst-tools option{background:var(--lsw-card);color:var(--lsw-ink)}
.lsw-stockpane .lst-stats .lsw-stat{display:block;min-height:0;padding:14px 18px;box-shadow:none;background:var(--lsw-blush)}
.lsw-stockpane .lst-stats .lsw-stat b{font-size:22px;margin-top:2px}

/* Month tabs */
.lsw-tabbar{display:flex;align-items:center;gap:6px;margin-top:18px;padding:8px;background:var(--lsw-card);border:1px solid var(--lsw-line);border-radius:20px;box-shadow:var(--lsw-shadow)}
.lsw-tabnav{flex-shrink:0;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;border:1px solid var(--lsw-line);background:var(--lsw-card);color:var(--lsw-rose);cursor:pointer;transition:background .15s}
.lsw-tabnav:hover{background:var(--lsw-hover)}
.lsw-tabs{display:flex;gap:4px;overflow-x:auto;flex:1;min-width:0;padding:2px;scroll-behavior:smooth;scrollbar-width:none}
.lsw-tabs::-webkit-scrollbar{display:none}
.lsw-tab{display:inline-flex;align-items:center;gap:8px;border:0;background:none;font:inherit;font-size:14.5px;padding:0 20px;height:46px;border-radius:14px;cursor:pointer;color:var(--lsw-ink);white-space:nowrap;transition:background .15s,color .15s}
.lsw-tab:hover{background:var(--lsw-hover)}
.lsw-tab:focus-visible{outline:2px solid var(--lsw-rose);outline-offset:-2px}
.lsw-tab[aria-selected=true]{background:var(--lsw-grad);color:#fff;font-weight:700;box-shadow:0 6px 16px rgba(212,102,122,.35)}
.lsw-tabn{display:inline-block;min-width:22px;padding:0 7px;border-radius:999px;background:color-mix(in srgb,var(--lsw-rose) 14%,transparent);color:var(--lsw-rose);font-size:11.5px;font-weight:700;line-height:22px;text-align:center}
.lsw-tab[aria-selected=true] .lsw-tabn{background:rgba(255,255,255,.28);color:#fff}
.lsw-addmonth{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;height:46px;border:1px solid var(--lsw-line);border-radius:14px;background:var(--lsw-card);color:var(--lsw-rose);font:inherit;font-size:14.5px;font-weight:700;padding:0 18px;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s}
.lsw-addmonth:hover{background:var(--lsw-hover);border-color:var(--lsw-rose2)}

/* Modals */
.lsw-overlay{position:fixed;inset:0;background:rgba(40,16,28,.45);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
.lsw-modal{background:var(--lsw-card);border:1px solid var(--lsw-line);border-radius:22px;padding:26px;box-shadow:0 24px 60px rgba(60,20,40,.3);width:100%;max-width:380px;text-align:center}
.lsw-modal p{margin:0}
.lsw-modal .fields{display:flex;gap:10px;justify-content:center;margin-top:18px}
.lsw-modal label{display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--lsw-muted);text-align:start}
.lsw-modal select{appearance:none;-webkit-appearance:none;height:42px;min-width:130px;border:1px solid var(--lsw-line);border-radius:12px;padding:0 34px 0 12px;font:inherit;font-size:14px;color:var(--lsw-ink);cursor:pointer;background:var(--lsw-blush) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23c9748a' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 12px center}
.lsw-page.rtl .lsw-modal select{background-position:left 12px center;padding:0 12px 0 34px}
.lsw-modal select:focus{outline:0;border-color:var(--lsw-rose);box-shadow:0 0 0 3px rgba(212,102,122,.18)}
.lsw-modal .btns{display:flex;gap:10px;justify-content:center;margin-top:20px}
.lsw-modal button{border-radius:12px;padding:10px 22px;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer}

/* Tablet */
@media (max-width:1100px){
.lsw-ribbon{display:none}
.lsw-stats{grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
}
/* Phone */
@media (max-width:640px){
.lsw-page{padding:16px 16px 24px}
.lsw-top{min-height:0;margin-bottom:16px}
.lsw-logo{width:48px;height:48px;border-radius:14px;font-size:22px}
.lsw-brand h1{font-size:26px}
.lsw-page.rtl .lsw-brand h1{font-size:24px}
.lsw-tools{width:100%}
.lsw-tools .lsw-btn{flex:1}
.lsw-btn{height:42px}
.lsw-filters{gap:8px}
.lsw-search{flex:1 1 100%;min-width:0;height:44px}
.lsw-filter{flex:1 1 calc(50% - 4px);justify-content:space-between;height:44px;padding-inline-start:12px;font-size:13px;min-width:0}
.lsw-filter select{height:42px;padding:0 30px 0 2px;background-position:right 10px center;min-width:0}
.lsw-page.rtl .lsw-filter select{padding:0 2px 0 30px;background-position:left 10px center}
.lsw-fcount{width:100%;margin:0}
.lsw-stats{grid-template-columns:repeat(2,1fr);gap:10px}
.lsw-stat{min-height:0;gap:10px;padding:12px;border-radius:16px}
.lsw-stat .ic{width:30px;height:30px}
.lsw-stat .ic svg{width:14px;height:14px}
.lsw-stat span{font-size:12.5px}
.lsw-stat b{font-size:19px;margin-top:2px}
.lsw-stats > .lsw-stat:last-child{grid-column:1/-1}
.lsw-wrap{max-height:70vh;border-radius:16px}
.lsw-wrap th,.lsw-wrap td{height:48px;font-size:13.5px;padding:0 8px}
.lsw-wrap thead th{font-size:13px;height:50px}
.lsw-wrap td input[name=name]{min-width:120px}
.lsw-empty > svg{width:170px}
.lsw-empty{font-size:14.5px}
.lsw-stockpane{padding:14px;border-radius:16px}
.lsw-tabbar{border-radius:16px;padding:6px}
.lsw-tabnav{display:none}
.lsw-tab{height:42px;padding:0 14px;font-size:13.5px}
.lsw-addmonth{height:42px;padding:0 12px;font-size:13.5px}
}
`
