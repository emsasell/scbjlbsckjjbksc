import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { sessionUser } from '../../../lib/auth';

export const runtime = 'nodejs';

export async function POST(req:Request){
 const user=await sessionUser(); if(!user) return NextResponse.json({error:'Войдите в аккаунт для загрузки файлов.'},{status:401}); if(!(user.owner||user.is_admin||user.is_creator)) return NextResponse.json({error:'У этого аккаунта нет права загружать файлы.'},{status:403});
 const token=process.env.BLOB_READ_WRITE_TOKEN;
 if(!token) return NextResponse.json({error:'BLOB_READ_WRITE_TOKEN не подключён к этому Vercel Project.'}, {status:503});
 try{
  const form=await req.formData(); const file=form.get('file');
  if(!(file instanceof File)) return NextResponse.json({error:'Файл не найден'},{status:400});
  if(!file.type.startsWith('image/')&&!file.type.startsWith('video/')) return NextResponse.json({error:'Можно загружать изображения и видео'},{status:400});
  if(file.size>100*1024*1024) return NextResponse.json({error:'Максимальный размер файла — 100 МБ'},{status:413});
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'-') || 'image';
  const access=(process.env.BLOB_ACCESS||'private').toLowerCase()==='public'?'public':'private';
  const blob=await put(`megamine/${Date.now()}-${safeName}`,file,{access,token,addRandomSuffix:true,contentType:file.type} as any);
  const url=access==='private'?`/api/media?url=${encodeURIComponent(blob.url)}`:blob.url;
  return NextResponse.json({url,access});
 }catch(error:any){
  console.error('Blob upload failed:',error);
  const raw=String(error?.message||'Не удалось загрузить изображение');
  if(/unauthorized|forbidden|401|403|credentials|token/i.test(raw)) return NextResponse.json({error:'Vercel Blob отклонил доступ. Проверьте, что Blob Store подключён именно к этому Project, а BLOB_READ_WRITE_TOKEN относится к этому Store и добавлен в Production.'},{status:503});
  return NextResponse.json({error:raw},{status:500});
 }
}
