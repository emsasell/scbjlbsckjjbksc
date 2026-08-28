import { NextResponse } from 'next/server';
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
  const response=await fetch(target,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
  if(!response.ok) return NextResponse.json({error:response.status===401?'Blob access denied. Проверьте BLOB_READ_WRITE_TOKEN.':'Media unavailable'},{status:response.status});
  return new NextResponse(response.body,{headers:{'Content-Type':response.headers.get('content-type')||'application/octet-stream','Cache-Control':'private, max-age=300'}});
 }catch{return NextResponse.json({error:'Media unavailable'},{status:502})}
}
