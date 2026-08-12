/* Tafaß V22 — UI-only enhancer.
   Does not touch Supabase, realtime, state persistence, or backend data logic. */
(function(){
  'use strict';
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function enhanceSearchRows(){
    document.querySelectorAll('.search-result-card').forEach(row=>{
      const action=row.getAttribute('data-action');
      const kind=row.getAttribute('data-kind');
      const id=row.getAttribute('data-id');
      if(action!=='openSearchResult' || !kind || !id) return;
      const old=row.querySelector('.search-open-btn');
      if(!old || old.dataset.uiEnhanced==='1') return;
      let label='Ouvrir', act='openSearchResult', cls='secondary-action';
      if(kind==='Personnes'){ label='Ajouter'; act='addFriend'; cls='primary-action'; }
      else if(kind==='Pages'){ label='Suivre'; act='followPage'; cls='primary-action'; }
      else if(kind==='Groupes'){ label='Rejoindre'; act='joinGroup'; cls='primary-action'; }
      else if(kind==='Publications'||kind==='Photos'||kind==='Reels'){ label='Voir'; act='openSearchResult'; }
      old.outerHTML=`<button type="button" class="btn search-action-btn ${cls}" data-ui-enhanced="1" data-action="${act}" data-id="${esc(id)}" data-kind="${esc(kind)}">${label}</button>`;
    });
  }

  function hideEmptyBadges(){
    document.querySelectorAll('.badge-count').forEach(b=>{
      const n=parseInt((b.textContent||'0').replace(/\D/g,''),10)||0;
      b.classList.toggle('hidden',n===0);
    });
  }

  function cleanPageMentions(){
    document.querySelectorAll('.eyebrow').forEach(x=>x.style.display='none');
    document.querySelectorAll('[data-action="refreshFeed"]').forEach(x=>x.style.display='none');
  }

  const run=()=>{hideEmptyBadges();cleanPageMentions();enhanceSearchRows();};
  new MutationObserver(run).observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
})();
