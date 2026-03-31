
(function(){
  var sidebar=document.getElementById('sidebar');
  var overlay=document.getElementById('overlay');
  function open(){sidebar.classList.add('open');overlay.classList.add('open');document.body.style.overflow='hidden'}
  function close(){sidebar.classList.remove('open');overlay.classList.remove('open');document.body.style.overflow=''}
  var h=document.getElementById('hamburger');var c=document.getElementById('sidebarClose');
  if(h)h.addEventListener('click',open);if(c)c.addEventListener('click',close);if(overlay)overlay.addEventListener('click',close);

  // Desktop sidebar collapse
  var collapseBtn=document.getElementById('sidebarCollapse');
  var CKEY='lcms-sidebar-collapsed';
  function getCollapsed(){try{return localStorage.getItem(CKEY)==='true'}catch(e){return false}}
  function saveCollapsed(v){try{localStorage.setItem(CKEY,String(v))}catch(e){}}
  function applyCollapsed(v){
    if(v){
      document.body.classList.add('sidebar-collapsed');
      if(collapseBtn){collapseBtn.innerHTML='&#x203A;';collapseBtn.title='Expand sidebar';collapseBtn.setAttribute('aria-label','Expand sidebar');}
    }else{
      document.body.classList.remove('sidebar-collapsed');
      if(collapseBtn){collapseBtn.innerHTML='&#x2039;';collapseBtn.title='Collapse sidebar';collapseBtn.setAttribute('aria-label','Collapse sidebar');}
    }
    saveCollapsed(v);
  }
  if(collapseBtn){
    collapseBtn.addEventListener('click',function(){applyCollapsed(!document.body.classList.contains('sidebar-collapsed'));});
  }
  applyCollapsed(getCollapsed());
})();
