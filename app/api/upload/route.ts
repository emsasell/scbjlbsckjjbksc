import { NextResponse } from 'next/server';import { put } from '@vercel/blob';import { isAdmin } from '@/lib/auth';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!(await isAdmin()))return NextResponse.json({error:'Сессия администратора истекла. Войдите заново.'},{status:401});
 const token=process.env.BLOB_READ_WRITE_TOKEN;if(!token)return NextResponse.json({error:'BLOB_READ_WRITE_TOKEN не настроен'},{status:503});
 try{const form=await req.formData();const file=form.get('file');if(!(file instanceof File))return NextResponse.json({error:'Файл не найден'},{status:400});
 const isImage=file.type.startsWith('image/'),isVideo=file.type.startsWith('video/');if(!isImage&&!isVideo)return NextResponse.json({error:'Можно загружать изображения или видео'},{status:400});
 const limit=isVideo?100:25;if(file.size>limit*1024*1024)return NextResponse.json({error:`Максимальный размер ${isVideo?'видео 100':'изображения 25'} МБ`},{status:413});
 const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-')||'media';const access=(process.env.BLOB_ACCESS||'private').toLowerCase()==='public'?'public':'private';
 const blob=await put(`megamine/${Date.now()}-${safe}`,file,{access,token,addRandomSuffix:true,contentType:file.type} as any);
 const url=access==='private'?`/api/media?url=${encodeURIComponent(blob.url)}`:blob.url;return NextResponse.json({url,type:isVideo?'video':'image'});
 }catch(e:any){console.error('upload',e);return NextResponse.json({error:String(e?.message||'Ошибка загрузки')},{status:500})}
}
