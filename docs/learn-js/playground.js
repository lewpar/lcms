(function(){
var KW=/\b(function|return|if|else|for|while|do|let|const|var|class|new|this|true|false|null|undefined|typeof|instanceof|import|export|default|try|catch|finally|throw|async|await|of|in|break|continue|switch|case)\b/;
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function highlight(code){
  var r='',i=0,n=code.length;
  while(i<n){
    var c=code[i];
    if(c==='/'&&code[i+1]==='/'){
      var j=code.indexOf('\n',i);if(j<0)j=n;
      r+='<span class="pg-cm">'+esc(code.slice(i,j))+'</span>';i=j;continue;
    }
    if(c==='/'&&code[i+1]==='*'){
      var j=code.indexOf('*/',i+2);if(j<0)j=n-2;
      r+='<span class="pg-cm">'+esc(code.slice(i,j+2))+'</span>';i=j+2;continue;
    }
    if(c==='"'||c==="'"||c==='`'){
      var q=c,j=i+1;
      while(j<n&&code[j]!==q&&(q==='`'||code[j]!=='\n')){if(code[j]==='\\')j++;j++;}
      r+='<span class="pg-st">'+esc(code.slice(i,j+1))+'</span>';i=j+1;continue;
    }
    if(/[a-zA-Z_$]/.test(c)){
      var j=i;while(j<n&&/[\w$]/.test(code[j]))j++;
      var w=code.slice(i,j);
      r+=KW.test(w)?'<span class="pg-kw">'+w+'</span>':esc(w);i=j;continue;
    }
    if(/[0-9]/.test(c)){
      var j=i;while(j<n&&/[0-9.xXa-fA-FbBoO_]/.test(code[j]))j++;
      r+='<span class="pg-nm">'+esc(code.slice(i,j))+'</span>';i=j;continue;
    }
    r+=esc(c);i++;
  }
  return r;
}
function initPlayground(el){
  var ta=el.querySelector('.pg-textarea');
  var pre=el.querySelector('.pg-pre');
  var lnEl=el.querySelector('.pg-line-numbers');
  var runBtn=el.querySelector('.pg-run-btn');
  var clearBtn=el.querySelector('.pg-clear-btn');
  var out=el.querySelector('.pg-output');
  function updateLn(){
    var lines=ta.value.split('\n').length,h='';
    for(var i=1;i<=lines;i++)h+='<span>'+i+'</span>';
    lnEl.innerHTML=h;
  }
  function sync(){
    pre.innerHTML=highlight(ta.value)+'\n';
    pre.scrollTop=ta.scrollTop;pre.scrollLeft=ta.scrollLeft;
    lnEl.style.transform='translateY(-'+ta.scrollTop+'px)';
    updateLn();
  }
  ta.addEventListener('input',sync);
  ta.addEventListener('scroll',function(){
    pre.scrollTop=ta.scrollTop;pre.scrollLeft=ta.scrollLeft;
    lnEl.style.transform='translateY(-'+ta.scrollTop+'px)';
  });
  ta.addEventListener('keydown',function(e){
    if(e.key==='Tab'){
      e.preventDefault();
      var s=ta.selectionStart,en=ta.selectionEnd;
      ta.value=ta.value.substring(0,s)+'  '+ta.value.substring(en);
      ta.selectionStart=ta.selectionEnd=s+2;sync();
    }
  });
  function str(v){
    if(v===null)return'null';if(v===undefined)return'undefined';
    if(typeof v==='string')return v;
    if(typeof v==='function')return'[Function: '+(v.name||'anonymous')+']';
    try{return JSON.stringify(v,null,2)}catch(e){return String(v)}
  }
  var runId=0;
  runBtn.addEventListener('click',function(){
    out.innerHTML='';
    var thisRun=++runId;
    var hadOutput=false;
    function appendOut(text,type){
      if(runId!==thisRun)return;
      var empty=out.querySelector('.pg-out-empty');if(empty)empty.remove();
      var d=document.createElement('div');d.className='pg-out-line pg-out-'+type;
      if(type!=='empty'){var p=document.createElement('span');p.className='pg-out-prefix';p.textContent='['+type+']';d.appendChild(p);}
      var m=document.createElement('span');m.textContent=text;d.appendChild(m);
      out.appendChild(d);out.scrollTop=out.scrollHeight;
      hadOutput=true;
    }
    var pgConsole={
      log:function(){appendOut(Array.from(arguments).map(str).join(' '),'log');},
      warn:function(){appendOut(Array.from(arguments).map(str).join(' '),'warn');},
      error:function(){appendOut(Array.from(arguments).map(str).join(' '),'error');}
    };
    try{new Function('console',ta.value)(pgConsole);}
    catch(e){appendOut(e.name+': '+e.message,'error');}
    if(!hadOutput){appendOut('(no output)','empty');}
  });
  clearBtn.addEventListener('click',function(){out.innerHTML='';});
  sync();
}
document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('.playground-block').forEach(initPlayground);
});
})();