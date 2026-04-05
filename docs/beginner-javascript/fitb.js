(function(){
document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('.fitb-block').forEach(function(el){
    var answers=JSON.parse(el.dataset.answers||'[]');
    var inputs=el.querySelectorAll('.fitb-input');
    var checkBtn=el.querySelector('.fitb-check-btn');
    var result=el.querySelector('.fitb-result');
    inputs.forEach(function(inp){
      inp.addEventListener('input',function(){
        result.hidden=true;
        inputs.forEach(function(i){i.classList.remove('fitb-correct','fitb-incorrect');});
      });
      inp.addEventListener('keydown',function(e){if(e.key==='Enter')checkBtn.click();});
    });
    checkBtn.addEventListener('click',function(){
      var all=true;
      inputs.forEach(function(inp,i){
        var ok=(answers[i]||'').trim().toLowerCase()===(inp.value||'').trim().toLowerCase();
        inp.classList.toggle('fitb-correct',ok);
        inp.classList.toggle('fitb-incorrect',!ok);
        if(!ok)all=false;
      });
      result.hidden=false;
      result.textContent=all?'✓ Correct!':'✗ Not quite — try again.';
      result.className='fitb-result '+(all?'fitb-result-correct':'fitb-result-incorrect');
    });
  });
});
})();