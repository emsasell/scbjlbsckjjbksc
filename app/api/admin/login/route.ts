import {NextResponse} from 'next/server';
import {adminCookie,authenticate} from '../../../../lib/auth';
export async function POST(req:Request){
 const {username,password}=await req.json().catch(()=>({}));
 const user=await authenticate(String(username||''),String(password||''));
 if(!user||!(user.owner||user.is_admin||user.role==='admin'))return NextResponse.json({error:'Нет доступа к админ-панели'},{status:403});
 const res=NextResponse.json({ok:true,username:user.username});res.cookies.set(adminCookie(user));return res;
}