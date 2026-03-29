
(function(){
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('.flashcard-block').forEach(function(el){
      var cards=Array.from(el.querySelectorAll('.fc-card'));
      var counter=el.querySelector('.fc-counter');
      var prevBtn=el.querySelector('.fc-prev');
      var nextBtn=el.querySelector('.fc-next');
      var n=cards.length;var current=0;
      function show(idx){
        cards.forEach(function(c){c.classList.remove('active')});
        cards[idx].classList.add('active');
        counter.textContent=(idx+1)+' / '+n;
        prevBtn.disabled=idx===0;nextBtn.disabled=idx===n-1;
      }
      cards.forEach(function(card){
        card.addEventListener('click',function(){card.classList.toggle('flipped')});
      });
      prevBtn.addEventListener('click',function(){if(current>0){current--;cards[current].classList.remove('flipped');show(current)}});
      nextBtn.addEventListener('click',function(){if(current<n-1){current++;cards[current].classList.remove('flipped');show(current)}});
      show(0);
    });
  });
})();