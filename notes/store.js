((global)=>{
 const check=r=>{if(r.error)throw r.error;return r.data};
 class NotesStore{
  constructor(client,user){this.client=client;this.user=user}
  async authorize(){const spaces=check(await this.client.from('baixing_spaces').select('*').order('created_at').limit(1));if(!spaces.length)throw Error('这个账号还未加入共享空间');this.space=spaces[0];this.canEdit=!!check(await this.client.rpc('is_baixing_editor',{check_space:this.space.id}))}
  async list(){const notes=[];for(let offset=0;;offset+=500){const page=check(await this.client.from('baixing_notes').select('*').eq('space_id',this.space.id).order('updated_at',{ascending:false}).order('id').range(offset,offset+499));notes.push(...page);if(page.length<500)return notes}}
  validate(value){if(!value.title.trim()||value.title.length>120)throw Error('请填写标题，最多 120 个字');if(!RichNotes.text(value.body).trim()||value.body.length>50000)throw Error('请填写正文，正文连同格式最多 50000 个字符');if(!['生活片段','阅读随想','灵感手记'].includes(value.category))throw Error('请选择有效分类')}
  async save(value,existing){if(!this.canEdit)throw Error('当前账号只有阅读权限');this.validate(value);const fields={title:value.title.trim(),body:value.body,category:value.category};
   if(existing.version){const row=check(await this.client.from('baixing_notes').update(fields).eq('id',existing.id).eq('space_id',this.space.id).eq('version',existing.version).select().maybeSingle());if(!row)throw Error('这篇笔记已被朋友修改或删除，你的文字仍保留在编辑框中，请下载草稿后刷新查看最新内容');return row}
   const result=await this.client.from('baixing_notes').insert({...fields,id:existing.id,space_id:this.space.id}).select().single();
   if(result.error){const lookup=await this.client.from('baixing_notes').select('*').eq('id',existing.id).eq('space_id',this.space.id).maybeSingle();if(lookup.data&&Object.entries(fields).every(([key,val])=>lookup.data[key]===val))return lookup.data;throw result.error}return result.data;
  }
  async remove(note){if(!this.canEdit||note.space_id!==this.space.id)throw Error('无权删除这篇笔记');const rows=check(await this.client.from('baixing_notes').delete().eq('id',note.id).eq('space_id',this.space.id).eq('version',note.version).select('id'));if(!rows.length)throw Error('笔记已发生变化，请刷新后重新确认删除')}
 }
 global.NotesStore=NotesStore;
})(typeof window==='undefined'?globalThis:window);
