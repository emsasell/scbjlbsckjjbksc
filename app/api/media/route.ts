import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export const runtime='nodejs';

export async function GET(req:Request){
 const raw=new URL(req.url).searchParams.get('url');
 if(!raw) return NextResponse.json({error:'Missing url'},{status:400});
 let target:URL;
 try{target=new URL(raw)}catch{return NextResponse.json({error:'Invalid url'},{status:400})}
 if(!/(^|\.)blob\.vercel-storage\.com$/i.test(target.hostname)) return NextResponse.json({error:'Unsupported media host'},{status:400});
 const token=process.env.BLOB_READ_WRITE_TOKEN;
 if(!token) return NextResponse.json({error:'Blob token is not configured'},{status:503});
 try{
  const result:any=await get(raw,{access:'private',token} as any);
  if(!result || result.statusCode!==200 || !result.stream) return NextResponse.json({error:'Media unavailable'},{status:404});
  return new NextResponse(result.stream,{headers:{
   'Content-Type':result.blob?.contentType||result.contentType||'application/octet-stream',
   'Cache-Control':'private, max-age=300'
  }});
 }catch(error){
  console.error('Private blob read failed:',error);
  return NextResponse.json({error:'Media unavailable'},{status:502});
 }
}
