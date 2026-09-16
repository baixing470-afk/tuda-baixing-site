(()=>{
 const prefix='BAIXING-RICH-1\n';
 const formats=['font','size','bold','italic','underline','strike','background','header','list','blockquote'];
 const Font=Quill.import('formats/font');Font.whitelist=['song','kai'];Quill.register(Font,true);
 function decode(body){
  if(body.startsWith(prefix)){try{const ops=JSON.parse(body.slice(prefix.length));if(Array.isArray(ops)&&ops.every(o=>typeof o.insert==='string'))return ops.map(o=>({insert:o.insert,attributes:Object.fromEntries(Object.entries(o.attributes||{}).filter(([k,v])=>formats.includes(k)&&(['string','boolean','number'].includes(typeof v))))}))}catch{}}
  return [{insert:body}];
 }
 const editor=new Quill('#note-body',{theme:'snow',formats,placeholder:'写下想留住的片刻',modules:{toolbar:[[{font:[false,'song','kai']},{size:['small',false,'large','huge']}],['bold','italic','underline','strike'],[{background:[false,'#fff1a8','#d8edff','#e3f2dc']}],[{header:[1,2,false]},{list:'ordered'},{list:'bullet'},'blockquote'],['clean']],history:{userOnly:true}}});
 const viewer=new Quill('#reader-body',{readOnly:true,formats,modules:{toolbar:false}});
 const labels=['字体','字号','加粗','斜体','下划线','删除线','高亮','标题','编号列表','项目列表','引用','清除格式'];
 document.querySelectorAll('.ql-toolbar button,.ql-toolbar select').forEach((el,i)=>{el.title=labels[i]||'文字格式';el.setAttribute('aria-label',el.title)});
 const actions=document.createElement('div');actions.className='rich-history';
 for(const [name,label] of [['undo','撤销'],['redo','重做']]){const b=document.createElement('button');b.type='button';b.className='action';b.textContent=label;b.onclick=()=>editor.history[name]();actions.append(b)}
 document.querySelector('.ql-toolbar').append(actions);
 const toolbar=document.querySelector('.ql-toolbar');
 const groups=toolbar.querySelectorAll('.ql-formats');
 groups[0].append(toolbar.querySelector('.ql-header'));
 toolbar.querySelector('.ql-background .ql-picker-label').setAttribute('aria-label','高亮颜色');
 Object.defineProperty(document.querySelector('#note-body'),'value',{get(){return prefix+JSON.stringify(editor.getContents().ops)},set(body){editor.setContents(decode(body));editor.history.clear()}});
 window.RichNotes={text:body=>decode(body).map(o=>o.insert).join(''),show:body=>viewer.setContents(decode(body))};
})();

