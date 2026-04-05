
(function(){
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('.accordion-block').forEach(function(el){
      el.querySelectorAll('.acc-header').forEach(function(btn){
        btn.addEventListener('click',function(){
          var item=btn.closest('.acc-item');
          var isOpen=item.classList.contains('open');
          el.querySelectorAll('.acc-item').forEach(function(i){
            i.classList.remove('open');
            i.querySelector('.acc-header').setAttribute('aria-expanded','false');
          });
          if(!isOpen){item.classList.add('open');btn.setAttribute('aria-expanded','true')}
        });
      });
    });
  });
})();