import { NextResponse } from 'next/server';
import { adminCookie, validPassword } from '@/lib/auth';
export async function POST(req:Request){
 const {password}=await req.json().catch(()=>({}));
 if(!validPassword(String(password||''))) return NextResponse.json({error:'Неверный пароль'}, {status:401});
 const res=NextResponse.json({ok:true}); const c=adminCookie(); res.cookies.set(c); return res;
}
