import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { isAdmin } from '../../../lib/auth';
export async function POST(req:Request){
 if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({error:'BLOB_READ_WRITE_TOKEN не настроен'}, {status:503});
 const form=await req.formData(); const file=form.get('file');
 if(!(file instanceof File)) return NextResponse.json({error:'Файл не найден'},{status:400});
 if(file.size>100*1024*1024) return NextResponse.json({error:'Максимальный размер — 100 МБ'},{status:413});
 const blob=await put(`megamine/${Date.now()}-${file.name}`,file,{access:'public'});
 return NextResponse.json({url:blob.url});
}
