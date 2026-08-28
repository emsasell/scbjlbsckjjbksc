import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { isAdmin } from '../../../lib/auth';

export const runtime = 'nodejs';

export async function POST(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({error:'BLOB_READ_WRITE_TOKEN не настроен в Vercel Environment Variables'}, {status:503});
 try{
  const form=await req.formData(); const file=form.get('file');
  if(!(file instanceof File)) return NextResponse.json({error:'Файл не найден'},{status:400});
  if(!file.type.startsWith('image/')) return NextResponse.json({error:'Можно загружать только изображения'},{status:400});
  if(file.size>25*1024*1024) return NextResponse.json({error:'Максимальный размер изображения — 25 МБ'},{status:413});
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
  // Private Blob stores reject public access. Configure BLOB_ACCESS=private for a private store.
  const access=(process.env.BLOB_ACCESS==='private'?'private':'public') as any;
  const blob=await put(`megamine/${Date.now()}-${safeName}`,file,{access});
  const url=access==='private'?`/api/media?url=${encodeURIComponent(blob.url)}`:blob.url;
  return NextResponse.json({url});
 }catch(error:any){
  const message=error?.message||'Не удалось загрузить изображение';
  const hint=message.toLowerCase().includes('private')||message.toLowerCase().includes('access')
   ? ' Ваш Blob Store private: добавьте BLOB_ACCESS=private или используйте Public Blob Store.' : '';
  return NextResponse.json({error:message+hint},{status:500});
 }
}
