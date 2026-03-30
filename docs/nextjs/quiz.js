
(function(){
  function initQuiz(el){
    var questions=JSON.parse(el.getAttribute('data-questions')||'[]');
    var n=questions.length;if(!n)return;
    var quizId=el.getAttribute('data-quiz-id')||Math.random().toString(36).slice(2);
    var storageKey='lcms-quiz-'+quizId;
    var current=0,answers=new Array(n).fill(-1),selectedOption=-1,answered=false;

    var startScreen=el.querySelector('.qs-start');
    var questionScreen=el.querySelector('.qs-question');
    var resultsScreen=el.querySelector('.qs-results');
    var fill=el.querySelector('.qs-progress-fill');
    var progressText=el.querySelector('.qs-progress-text');
    var qText=el.querySelector('.qs-q-text');
    var optsList=el.querySelector('.qs-options');
    var submitBtn=el.querySelector('.qs-submit');
    var feedbackEl=el.querySelector('.qs-feedback');
    var explanationEl=el.querySelector('.qs-explanation');
    var nextNav=el.querySelector('.qs-next-nav');
    var nextBtn=el.querySelector('.qs-next');
    var finishBtn=el.querySelector('.qs-finish');

    function saveState(phase){
      try{localStorage.setItem(storageKey,JSON.stringify({current,answers,phase,selectedOption}))}catch(e){}
    }
    function loadState(){
      try{
        var s=JSON.parse(localStorage.getItem(storageKey)||'null');
        if(s&&Array.isArray(s.answers)&&s.answers.length===n){
          current=s.current||0;answers=s.answers;
          return s.phase||'start';
        }
      }catch(e){}
      return'start';
    }
    function clearState(){try{localStorage.removeItem(storageKey)}catch(e){}}

    function show(screen){[startScreen,questionScreen,resultsScreen].forEach(function(x){x.hidden=true});screen.hidden=false}

    var LETTERS=['A','B','C','D','E','F','G','H'];

    function renderQ(idx){
      answered=false;selectedOption=-1;
      var q=questions[idx];
      fill.style.width=((idx/n)*100)+'%';
      progressText.textContent=(idx+1)+' / '+n;
      qText.textContent=q.question;
      optsList.innerHTML='';
      q.options.forEach(function(opt,i){
        var li=document.createElement('li');
        var btn=document.createElement('button');
        btn.type='button';btn.className='qs-option';btn.dataset.idx=i;
        var letterEl=document.createElement('span');
        letterEl.className='qs-option-letter';
        letterEl.textContent=LETTERS[i]||String.fromCharCode(65+i);
        var textEl=document.createElement('span');
        textEl.className='qs-option-text';
        textEl.textContent=opt;
        btn.appendChild(letterEl);btn.appendChild(textEl);
        li.appendChild(btn);optsList.appendChild(li);
      });
      submitBtn.disabled=true;
      feedbackEl.hidden=true;feedbackEl.className='qs-feedback';
      explanationEl.hidden=true;
      nextNav.hidden=true;nextBtn.hidden=true;finishBtn.hidden=true;
      saveState('question');
    }

    function submitAnswer(){
      if(selectedOption===-1||answered)return;
      answered=true;answers[current]=selectedOption;
      var correct=questions[current].correctIndex;
      Array.from(optsList.querySelectorAll('.qs-option')).forEach(function(btn,i){
        btn.disabled=true;btn.classList.remove('qs-selected');
        if(i===correct)btn.classList.add('qs-correct');
        else if(i===selectedOption)btn.classList.add('qs-incorrect');
      });
      submitBtn.disabled=true;
      feedbackEl.hidden=false;
      feedbackEl.className='qs-feedback '+(selectedOption===correct?'qs-correct':'qs-incorrect');
      feedbackEl.textContent=selectedOption===correct?'✓ Correct!':'✗ Incorrect — the correct answer is highlighted.';
      var expl=questions[current].explanation;
      if(expl){explanationEl.hidden=false;explanationEl.textContent=expl}
      nextNav.hidden=false;
      if(current<n-1)nextBtn.hidden=false;else finishBtn.hidden=false;
      saveState('question');
    }

    function showResults(){
      var ok=answers.filter(function(a,i){return a===questions[i].correctIndex}).length;
      var pct=Math.round((ok/n)*100);
      el.querySelector('.qs-score-num').textContent=ok+'/'+n;
      el.querySelector('.qs-score-pct').textContent=pct+'% — '+(pct>=80?'Excellent!':(pct>=60?'Good effort!':'Keep practising!'));
      fill.style.width='100%';
      var review=el.querySelector('.qs-review');review.innerHTML='';
      questions.forEach(function(q,i){
        var isOk=answers[i]===q.correctIndex;
        var givenIdx=answers[i];
        var givenText=givenIdx>=0&&q.options[givenIdx]?q.options[givenIdx]:'No answer';
        var correctText=q.options[q.correctIndex]||'';
        var qText=q.question.length>72?q.question.slice(0,72)+'…':q.question;
        var detail=isOk
          ? '<span class="qs-review-answer">Your answer: '+givenText+'</span>'
          : '<span class="qs-review-answer">Your answer: '+givenText+'</span><span class="qs-review-correct">Correct: '+correctText+'</span>';
        var div=document.createElement('div');div.className='qs-review-item '+(isOk?'correct':'incorrect');
        div.innerHTML='<span class="qs-review-marker">'+(isOk?'✓':'✗')+'</span><span class="qs-review-body"><span class="qs-review-q">'+qText+'</span>'+detail+'</span>';
        review.appendChild(div);
      });
      saveState('results');
      show(resultsScreen);
    }

    function reset(){
      current=0;answers=new Array(n).fill(-1);answered=false;selectedOption=-1;
      fill.style.width='0%';clearState();
      show(questionScreen);renderQ(0);
    }

    var resumeEl=el.querySelector('.qs-resume');
    var resumeStatus=el.querySelector('.qs-resume-status');
    var startBtn=el.querySelector('.qs-start-btn');

    function showResume(savedPhase){
      startBtn.hidden=true;
      resumeEl.hidden=false;
      if(savedPhase==='results'){
        var ok=answers.filter(function(a,i){return a===questions[i].correctIndex}).length;
        resumeStatus.textContent='You completed this quiz — '+ok+'/'+n+' correct. Continue to review your results.';
      } else {
        resumeStatus.textContent='You left off at question '+(current+1)+' of '+n+'. Pick up where you left off.';
      }
    }

    // Event listeners
    startBtn.addEventListener('click',function(){
      show(questionScreen);renderQ(0);saveState('question');
    });
    el.querySelector('.qs-continue-btn').addEventListener('click',function(){
      var s=JSON.parse(localStorage.getItem(storageKey)||'null');
      var phase=s&&s.phase;
      if(phase==='results')showResults();
      else{show(questionScreen);renderQ(current);}
    });
    el.querySelector('.qs-restart-btn').addEventListener('click',function(){
      current=0;answers=new Array(n).fill(-1);answered=false;selectedOption=-1;
      clearState();
      resumeEl.hidden=true;startBtn.hidden=false;
    });
    optsList.addEventListener('click',function(e){
      var btn=e.target.closest('.qs-option');
      if(!btn||btn.disabled||answered)return;
      Array.from(optsList.querySelectorAll('.qs-option')).forEach(function(b){b.classList.remove('qs-selected')});
      btn.classList.add('qs-selected');
      selectedOption=parseInt(btn.dataset.idx,10);
      submitBtn.disabled=false;
    });
    submitBtn.addEventListener('click',submitAnswer);
    nextBtn.addEventListener('click',function(){current++;renderQ(current)});
    finishBtn.addEventListener('click',showResults);
    el.querySelector('.qs-retry-btn').addEventListener('click',reset);

    // Restore saved state — show resume prompt instead of auto-jumping
    var savedPhase=loadState();
    if(savedPhase==='results'||savedPhase==='question'){
      showResume(savedPhase);
    }
    // else stay on fresh start screen
  }
  document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('.quiz-block').forEach(initQuiz)});
})();
