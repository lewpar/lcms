
(function(){
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('.hint-block').forEach(function(el){
      el.addEventListener('click',function(){
        el.classList.add('revealed');
      });
    });
  });
})();