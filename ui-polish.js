/* Tafaß UI-only polish layer.
   IMPORTANT: this file does not call Supabase, modify database state, Realtime,
   authentication, tables, or backend logic. It only changes presentation/DOM. */
(function(){
  'use strict';

  const STORE='TAFASS_V4_STATE';
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function readState(){
    try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(_){return {};}
  }

  /* Theme is presentation-only. Existing settings remain the source of truth.
     No preference => dark by default. "Système" follows the device. */
  window.applyTheme=function(){
    const s=readState();
    const pref=s?.settings?.['preferences-0'];
    let dark;
    if(pref==='Clair') dark=false;
    else if(pref==='Système') dark=!!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    else if(pref==='Sombre') dark=true;
    else dark=true; // requested default
    document.body.classList.toggle('dark',dark);
    document.documentElement.dataset.theme=dark?'dark':'light';
  };

  function hideZeroBadges(){
    document.querySelectorAll('.badge-count').forEach(el=>{
      const n=parseInt((el.textContent||'').replace(/\D/g,''),10)||0;
      el.classList.toggle('hidden',n===0);
    });
  }

  function cleanDecorations(){
    document.querySelectorAll('.eyebrow,.page-context-brand small,.page-context-brand > div').forEach(el=>el.classList.add('ui-hide-decoration'));
    document.querySelectorAll('[data-action="refreshFeed"]').forEach(el=>el.classList.add('ui-hide-decoration'));
  }

  function buildSearchSuggestions(q=''){
    const box=document.getElementById('searchSuggest');
    if(!box)return;
    const s=readState();
    const users=Array.isArray(s.users)?s.users:[];
    const pages=Array.isArray(s.pages)?s.pages:[];
    const groups=Array.isArray(s.groups)?s.groups:[];
    const term=String(q||'').trim().toLowerCase();
    let items=[
      ...users.filter(x=>x.id!==s.current).map(x=>({kind:'Personnes',id:x.id,name:[x.firstName,x.lastName].filter(Boolean).join(' ')||x.name||x.username||'Compte',sub:'@'+(x.username||'user'),avatar:x.avatar||'',action:'profile'})),
      ...pages.map(x=>({kind:'Pages',id:x.id,name:x.name||'Page',sub:x.category||'Page',avatar:x.avatar||x.cover||'',action:'page'})),
      ...groups.map(x=>({kind:'Groupes',id:x.id,name:x.name||'Groupe',sub:'Groupe',avatar:x.avatar||'',action:'group'}))
    ];
    if(term) items=items.filter(x=>(x.name+' '+x.sub+' '+x.kind).toLowerCase().includes(term));
    items=items.slice(0,6);
    if(!items.length){
      box.innerHTML=term?`<div class="search-suggest-empty">Aucun résultat suggéré</div>`:`<div class="search-suggest-title">Suggestions</div><div class="search-suggest-empty">Recherchez une personne ou une Page</div>`;
    }else{
      box.innerHTML=`<div class="search-suggest-title">${term?'Suggestions':'Suggestions pour vous'}</div>`+
        items.map(x=>`<button type="button" class="search-suggest-row" data-suggest-action="${x.action}" data-suggest-id="${esc(x.id)}"><span class="search-suggest-avatar">${x.avatar?`<img src="${esc(x.avatar)}" alt="">`:'T'}</span><span class="search-suggest-copy"><b>${esc(x.name)}</b><small>${esc(x.sub)} · ${esc(x.kind)}</small></span><span class="search-suggest-arrow">›</span></button>`).join('');
    }
    box.classList.remove('hidden');
    box.querySelectorAll('[data-suggest-action]').forEach(btn=>btn.onclick=()=>{
      const act=btn.dataset.suggestAction,id=btn.dataset.suggestId;
      box.classList.add('hidden');
      if(act==='profile' && typeof window.routeToProfile==='function') return window.routeToProfile(id);
      if(act==='page'){try{window.editingPageId=id;window.routeTo('pageView');}catch(_){} return;}
      if(act==='group'){try{window.routeTo('groups');}catch(_){} return;}
    });
  }

  function attachGlobalSearch(){
    const input=document.getElementById('globalSearch');
    const box=document.getElementById('searchSuggest');
    if(!input || input.dataset.uiBound==='1')return;
    input.dataset.uiBound='1';
    input.setAttribute('autocomplete','off');
    input.placeholder='Rechercher sur Tafaß';
    input.addEventListener('focus',()=>buildSearchSuggestions(input.value));
    input.addEventListener('input',()=>buildSearchSuggestions(input.value));
    input.addEventListener('keydown',(e)=>{
      if(e.key!=='Enter')return;
      const q=input.value.trim();
      if(!q)return;
      e.preventDefault();e.stopPropagation();
      if(box)box.classList.add('hidden');
      window.globalSearchQuery=q;
      const loader=document.createElement('div');
      loader.className='search-loading-screen';
      loader.innerHTML='<div class="search-loading-spinner"></div><b>Recherche en cours…</b><small>Préparation des résultats</small>';
      document.body.appendChild(loader);
      setTimeout(()=>{
        loader.classList.add('hide');
        setTimeout(()=>loader.remove(),220);
        try{window.routeTo('search');}catch(_){}
      },520);
    },true);
    document.addEventListener('click',(e)=>{
      if(box && !e.target.closest('.global-search'))box.classList.add('hidden');
    });
  }

  function syncThemeSettingLabel(){
    const pref=readState()?.settings?.['preferences-0'];
    if(pref) return;
    const page=document.querySelector('.settings-premium-v90');
    if(!page)return;
    const groups=page.querySelectorAll('.settings-group-v90');
    if(groups.length){
      const row=groups[0].querySelector('.setting-row-v91');
      if(row){const current=row.querySelector('.setting-current-v91'); if(current) current.textContent='Sombre';}
    }
  }

  function prepareSearchPage(){
    const page=document.querySelector('.search-premium-v90');
    if(!page)return;
    const input=document.getElementById('pageSearchInput');
    const filters=page.querySelector('.search-filter-grid-v90');
    const results=page.querySelector('.search-result-stack-v90');
    if(filters){
      const q=(input?.value||window.globalSearchQuery||'').trim();
      filters.classList.toggle('ui-search-filters-hidden',!q);
    }
    if(results && !results.dataset.uiGrouped){
      const cards=[...results.querySelectorAll('.search-result-card')];
      if(cards.length){
        const order=['Personnes','Groupes','Pages','Publications','Photos','Reels','Comptes'];
        const groups={};
        cards.forEach(c=>{const k=c.dataset.kind||'Autres';(groups[k]??=[]).push(c);});
        results.innerHTML='';
        order.filter(k=>groups[k]?.length).forEach(k=>{
          const sec=document.createElement('section');
          sec.className='search-section-ui';
          sec.dataset.kind=k;
          const title=document.createElement('div');
          title.className='search-section-title-ui';
          title.innerHTML=`<h2>${esc(k)}</h2><button type="button" class="search-see-all-ui">Voir tout</button>`;
          sec.appendChild(title);
          const list=document.createElement('div');
          list.className=(k==='Photos')?'search-photo-grid-ui':'search-section-list-ui';
          groups[k].forEach(c=>list.appendChild(c));
          sec.appendChild(list);
          results.appendChild(sec);
          title.querySelector('button').onclick=()=>{
            sec.classList.toggle('show-all');
            title.querySelector('button').textContent=sec.classList.contains('show-all')?'Réduire':'Voir tout';
          };
        });
        Object.keys(groups).filter(k=>!order.includes(k)).forEach(k=>{
          const sec=document.createElement('section');sec.className='search-section-ui';
          const title=document.createElement('div');title.className='search-section-title-ui';title.innerHTML=`<h2>${esc(k)}</h2>`;
          const list=document.createElement('div');list.className='search-section-list-ui';groups[k].forEach(c=>list.appendChild(c));sec.append(title,list);results.appendChild(sec);
        });
        results.dataset.uiGrouped='1';
      }
    }
  }

  function polishSearchActions(){
    document.querySelectorAll('.search-result-card').forEach(row=>{
      const kind=row.dataset.kind;
      const id=row.dataset.id;
      const old=row.querySelector('.search-open-btn');
      if(!old || !kind || !id)return;
      let label='Voir',act='openSearchResult';
      if(kind==='Personnes'){label='Ajouter';act='addFriend';}
      else if(kind==='Pages'){label='Suivre';act='followPage';}
      else if(kind==='Groupes'){label='Rejoindre';act='joinGroup';}
      old.className='btn search-action-btn primary-action';
      old.dataset.action=act;old.dataset.id=id;old.dataset.kind=kind;old.textContent=label;
    });
  }

  function run(){
    hideZeroBadges();cleanDecorations();attachGlobalSearch();prepareSearchPage();polishSearchActions();syncThemeSettingLabel();
    applyTheme();
  }

  const mo=new MutationObserver(()=>{
    clearTimeout(window.__tfaUiTimer);
    window.__tfaUiTimer=setTimeout(run,30);
  });
  mo.observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('storage',applyTheme);
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',applyTheme);
})();
