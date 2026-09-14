(function (global) {
  const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  function checked(result) { if (result.error) throw result.error; return result.data; }
  function validateFile(file) {
    if (!TYPES.includes(file.type)) throw new Error('请选择 JPG、PNG、WebP 或 GIF 照片');
    if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('每张照片需要小于或等于 10 MB');
    if (!file.name || file.name.length > 255) throw new Error('照片文件名过长');
  }
  class CloudAlbumStore {
    constructor(client, user) { this.client = client; this.user = user; this.bucket = client.storage.from('baixing-private'); }
    async authorize() { const spaces=checked(await this.client.from('baixing_spaces').select('*').order('created_at').limit(1)); if(!spaces.length) throw new Error('还没有共享空间，请先运行共享空间 SQL'); this.space=spaces[0]; if(!checked(await this.client.rpc('is_baixing_member',{check_space:this.space.id}))) throw new Error('这个账号尚未加入共享空间'); }
    async createAlbum(name) {
      name = name.trim();
      if (!name || name.length > 60) throw new Error('相册名称需要 1 至 60 个字');
      const result = await this.client.from('baixing_albums').insert({user_id:this.user.id,space_id:this.space.id,name}).select().single();
      if (result.error?.code === '23505') return checked(await this.client.from('baixing_albums').select('*').eq('name',name).eq('space_id',this.space.id).single());
      return checked(result);
    }
    async listAlbums() {
      let albums = checked(await this.client.from('baixing_albums').select('*').eq('space_id',this.space.id).order('created_at'));
      if (!albums.length) { await this.createAlbum('生活'); await this.createAlbum('风景'); albums = checked(await this.client.from('baixing_albums').select('*').eq('space_id',this.space.id).order('created_at')); }
      return albums;
    }
    async listPhotos() {
      const all = [];
      for (let offset=0; ;offset+=500) {
        const page = checked(await this.client.from('baixing_photos').select('*').eq('space_id',this.space.id).order('created_at',{ascending:false}).order('id').range(offset,offset+499));
        all.push(...page); if(page.length<500) return all;
      }
    }
    async upload(file, albumId) {
      validateFile(file);
      const id = global.crypto.randomUUID(), path = `${this.space.id}/${id}`;
      checked(await this.bucket.upload(path,file,{contentType:file.type,upsert:false}));
      const result = await this.client.from('baixing_photos').insert({id,user_id:this.user.id,space_id:this.space.id,album_id:albumId,path,name:file.name,type:file.type,size:file.size});
      if (result.error) {
        // A timeout may happen after the insert committed, so check before cleanup
        const lookup = await this.client.from('baixing_photos').select('id').eq('id',id).eq('space_id',this.space.id).maybeSingle();
        if (lookup.data?.id) return id;
        if (!lookup.error) await this.bucket.remove([path]);
        throw new Error('照片未确认保存，请刷新检查后再重试');
      }
      return id;
    }
    async remove(photo) {
      if (photo.space_id !== this.space.id || !photo.path.startsWith(this.space.id+'/')) throw new Error('无权操作这张照片');
      checked(await this.bucket.remove([photo.path]));
      checked(await this.client.from('baixing_photos').delete().eq('id',photo.id).eq('space_id',this.space.id));
    }
    async signedUrl(path) { return checked(await this.bucket.createSignedUrl(path,3600)).signedUrl; }
    async download(photo) { return checked(await this.bucket.download(photo.path)); }
  }
  global.CloudAlbumStore=CloudAlbumStore;
  global.validateCloudPhoto=validateFile;
})(typeof window !== 'undefined' ? window : globalThis);
