(() => {
  const $ = selector => document.querySelector(selector);
  let client, store, albums=[], photos=[], active='all', busy=false, refreshing=false, generation=0, lastSignature='', signedAt=0;
  let toastTimer;
  function toast(text) { clearTimeout(toastTimer); $('#toast').textContent=text; $('#toast').classList.add('show'); toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500); }
  function status(text, error=false) { $('#syncStatus').textContent=text; $('#syncStatus').classList.toggle('sync-error',error); }
  function fail(error) { const text = error?.message || '连接失败，请检查网络后重试'; status(text,true); toast(text); }
  function setBusy(value) { busy=value; document.querySelectorAll('[data-cloud-action]').forEach(el=>el.disabled=value||!store); }
  async function operation(action) {
    if (!store || busy) return;
    setBusy(true);
    try { await action(); } catch(error) { fail(error); } finally { setBusy(false); }
  }
  function closePreview(){ $('#modal').classList.add('hidden'); $('#preview').removeAttribute('src'); }
  function locked() {
    generation++; store=null; photos=[]; albums=[]; lastSignature='';
    $('#grid').replaceChildren(); $('#tabs').replaceChildren(); closePreview();
    $('#gate').classList.remove('hidden'); $('#cloudContent').inert=true;
    $('#password').value=''; setBusy(false); status('请登录云端相册');
  }
  async function enter(user) {
    const token=++generation;
    const candidate=new CloudAlbumStore(client,user);
    await candidate.authorize();
    if(token!==generation) return;
    store=candidate; $('#gate').classList.add('hidden'); $('#cloudContent').inert=false;
    $('#password').value=''; setBusy(false); lastSignature=''; await refresh();
  }
  function albumControls() {
    if(active!=='all' && !albums.some(a=>a.id===active)) active='all';
    $('#tabs').replaceChildren(...[{id:'all',name:'全部'},...albums].map(album=>{
      const button=document.createElement('button'); button.type='button'; button.className='tab';
      button.classList.toggle('active',active===album.id); button.textContent=album.name;
      button.setAttribute('aria-pressed',String(active===album.id));
      button.onclick=()=>{active=album.id; albumControls(); draw().catch(fail)};
      return button;
    }));
    const selected=$('#uploadAlbum').value;
    $('#uploadAlbum').replaceChildren(...albums.map(album=>{const option=document.createElement('option');option.value=album.id;option.textContent=album.name;return option}));
    $('#uploadAlbum').value=albums.some(a=>a.id===selected)?selected:(active==='all'?albums[0]?.id:active);
  }
  async function draw() {
    const source=store, token=generation, category=active;
    if(!source) return;
    const shown=photos.filter(p=>category==='all'||p.album_id===category);
    const fragment=document.createDocumentFragment();
    for(let start=0;start<shown.length;start+=8){
      const nodes=await Promise.all(shown.slice(start,start+8).map(async photo=>{
        const article=document.createElement('article'); article.className='photo';
        const open=document.createElement('button');open.type='button';open.className='photo-open';open.setAttribute('aria-label','查看照片：'+photo.name);
        const img=document.createElement('img');img.alt=photo.name;img.loading='lazy';
        try { img.src=await source.signedUrl(photo.path); }
        catch { img.alt='照片暂时无法加载，请点击刷新'; }
        img.onerror=()=>{img.alt='照片暂时无法加载，请点击刷新'};
        open.append(img);open.onclick=()=>{if(img.src){$('#preview').src=img.src;$('#preview').alt=photo.name;$('#modal').classList.remove('hidden');$('#modalClose').focus()}};
        const info=document.createElement('div');info.className='photo-info';info.textContent=`${albums.find(a=>a.id===photo.album_id)?.name||'相册'} · ${new Date(photo.created_at).toLocaleDateString()}`;
        const remove=document.createElement('button');remove.type='button';remove.className='photo-delete';remove.textContent='×';remove.setAttribute('aria-label','删除照片：'+photo.name);
        remove.onclick=()=>operation(async()=>{
          if(!confirm('从云端删除这张照片？所有设备都会同步删除'))return;
          await source.remove(photo);lastSignature='';await refresh(true);toast('照片已从云端删除');
        });
        const download=document.createElement('button');download.type='button';download.className='photo-download';download.textContent='↓';download.setAttribute('aria-label','下载原图：'+photo.name);
        download.onclick=()=>operation(async()=>{const blob=await source.download(photo),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=photo.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000)});
        article.append(open,info,remove,download);return article;
      })); fragment.append(...nodes);
    }
    if(token!==generation || source!==store || category!==active) return;
    $('#grid').replaceChildren(fragment);$('#grid').classList.toggle('hidden',!shown.length);$('#empty').classList.toggle('hidden',!!shown.length);
    $('#countText').textContent=`已经珍藏 ${photos.length} 个瞬间`;
  }
  async function refresh(force=false) {
    if(!store || refreshing || (busy&&!force))return;
    refreshing=true; const source=store,token=generation;
    try {
      const nextAlbums=await source.listAlbums(),nextPhotos=await source.listPhotos();
      if(token!==generation||source!==store)return;
      const signature=JSON.stringify([nextAlbums,nextPhotos]);
      albums=nextAlbums;photos=nextPhotos;
      if(force||signature!==lastSignature||Date.now()-signedAt>20*60*1000){albumControls();await draw();lastSignature=signature;signedAt=Date.now()}
      if(token===generation)status('已同步 · '+new Date().toLocaleTimeString());
    } catch(error) { if(token===generation)status('同步失败，已显示的内容可能不是最新，请检查网络后刷新',true); throw error; }
    finally{refreshing=false}
  }
  async function uploadFiles(files) {
    const selected=Array.from(files),albumId=$('#uploadAlbum').value;
    $('#fileInput').value='';
    if(!selected.length)return;
    if(!albumId)throw new Error('请先选择相册');
    let successful=0;const failed=[];
    for(const file of selected){
      status(`正在上传 ${successful+failed.length+1} / ${selected.length}，请保持页面打开`);
      try{await store.upload(file,albumId);successful++}catch(error){failed.push(file.name+'：'+(error.message||'上传失败'))}
    }
    lastSignature='';await refresh(true);
    const message=`已上传 ${successful} 张`+(failed.length?`，${failed.length} 张失败，可重新选择失败文件`:'，其他设备会自动刷新');
    status(message,failed.length>0);toast(message);
    $('#uploadErrors').textContent=failed.join('\n');$('#uploadErrors').hidden=!failed.length;
  }
  async function exportBackup() {
    const list=await store.listPhotos();
    if(list.reduce((sum,p)=>sum+p.size,0)>100*1024*1024)throw new Error('照片总量超过 100 MB，请分次下载原图，避免浏览器内存不足');
    const backup={version:2,format:'baixing-cloud',albums:await store.listAlbums(),photos:[]};
    for(const photo of list){
      status(`正在导出 ${backup.photos.length+1} / ${list.length}`);
      const blob=await store.download(photo);
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
      backup.photos.push({...photo,data});
    }
    const url=URL.createObjectURL(new Blob([JSON.stringify(backup)],{type:'application/json'})),link=document.createElement('a');
    link.href=url;link.download='白星云端相册备份-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('备份已导出，请妥善保管');
  }
  async function importBackup(file) {
    $('#backupInput').value='';if(!file)return;
    if(file.size>150*1024*1024)throw new Error('备份文件过大，最多支持 150 MB');
    const backup=JSON.parse(await file.text());
    if(backup.version!==2||backup.format!=='baixing-cloud'||!Array.isArray(backup.albums)||!Array.isArray(backup.photos))throw new Error('请选择本云同步版本导出的备份');
    const albumIds=new Set();
    for(const album of backup.albums){if(typeof album.id!=='string'||albumIds.has(album.id)||typeof album.name!=='string'||!album.name.trim()||album.name.trim().length>60)throw new Error('备份包含无效相册');albumIds.add(album.id)}
    // Validate every record before creating albums or uploading files
    const parsed=backup.photos.map(p=>{
      if(!albumIds.has(p.album_id)||typeof p.name!=='string'||!p.name||p.name.length>255)throw new Error('备份包含无效照片信息');
      if(!/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(p.data))throw new Error('备份包含无效照片');
      const mime=p.data.slice(5,p.data.indexOf(';')),bytes=Uint8Array.from(atob(p.data.split(',')[1]),c=>c.charCodeAt(0));
      const f=new File([bytes],p.name,{type:mime});validateCloudPhoto(f);return {record:p,file:f};
    });
    if(!confirm('将备份中的照片添加到云端？不会覆盖现有照片，重复导入会产生副本'))return;
    const mapping=new Map();
    for(const album of backup.albums){if(typeof album.name!=='string')throw new Error('无效相册名称');mapping.set(album.id,(await store.createAlbum(album.name)).id)}
    for(let i=0;i<parsed.length;i++){status(`正在导入 ${i+1} / ${parsed.length}`);const entry=parsed[i];const id=mapping.get(entry.record.album_id);if(!id)throw new Error('照片缺少对应相册');await store.upload(entry.file,id)}
    lastSignature='';await refresh(true);toast('导入完成');
  }
  $('#loginForm').onsubmit=async event=>{
    event.preventDefault();if(!client)return;
    $('#unlock').disabled=true;$('#gateMessage').textContent='正在登录';
    try {
      const {data,error}=await client.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});
      if(error)throw new Error('登录失败，请确认邮箱、密码及网络连接');
      await enter(data.user);$('#gateMessage').textContent='';
    } catch(error){locked();$('#gateMessage').textContent=error.message||'登录失败，请重试'}
    finally{$('#unlock').disabled=false}
  };
  $('#togglePassword').onclick=()=>{const p=$('#password');p.type=p.type==='password'?'text':'password';$('#togglePassword').textContent=p.type==='password'?'显示密码':'隐藏密码'};
  $('#addBtn').onclick=$('#heroAdd').onclick=()=>{if(store&&!busy)$('#fileInput').click()};
  $('#fileInput').onchange=event=>operation(()=>uploadFiles(event.target.files));
  $('#newAlbum').onclick=()=>operation(async()=>{const name=prompt('新相册名称，最多 60 个字')?.trim();if(!name)return;const created=await store.createAlbum(name);active=created.id;lastSignature='';await refresh(true);$('#uploadAlbum').value=created.id;toast('相册已同步到云端')});
  $('#refreshBtn').onclick=()=>refresh().catch(fail);
  $('#exportBtn').onclick=()=>operation(exportBackup);
  $('#importBtn').onclick=()=>{if(store&&!busy)$('#backupInput').click()};
  $('#backupInput').onchange=event=>operation(()=>importBackup(event.target.files[0]));
  $('#lockBtn').onclick=async()=>{if(busy)return;locked();const {error}=await client.auth.signOut({scope:'local'});if(error)$('#gateMessage').textContent='页面已锁定，退出会话失败，请关闭此标签页'};
  $('#modalClose').onclick=closePreview;
  $('#modal').onclick=event=>{if(event.target.id==='modal')closePreview()};
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closePreview()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh().catch(()=>{})});
  window.addEventListener('online',()=>refresh().catch(()=>{}));
  window.addEventListener('offline',()=>status('当前离线，上传和同步需要网络连接',true));
  window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue=''}});
  setInterval(()=>{if(!document.hidden)refresh().catch(()=>{})},20000);
  async function init() {
    locked();
    const config=window.BAIXING_CLOUD;
    if(!config?.url||!config?.publishableKey){$('#gateMessage').textContent='云端尚未连接，请先完成项目配置';$('#unlock').disabled=true;return}
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url)||!config.publishableKey.startsWith('sb_publishable_'))throw new Error('请填写正确的项目 URL 和 Publishable key');
    client=supabase.createClient(config.url,config.publishableKey,{auth:{storage:sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')locked()});
    const {data,error}=await client.auth.getSession();if(error)throw error;
    if(data.session)try{await enter(data.session.user)}catch(error){locked();$('#gateMessage').textContent=error.message}
  }
  init().catch(error=>{$('#gateMessage').textContent=error.message||'云端初始化失败';$('#unlock').disabled=true});
})();
