import {NextResponse} from 'next/server';
import {adminCookie,authenticate} from '../../../../lib/auth';
export async function POST(req:Request){
 const {password}=await req.json().catch(()=>({}));
 const user=await authenticate(String(password||''));
 if(!user)return NextResponse.json({error:'Неверный пароль администратора'},{status:403});
 const res=NextResponse.json({ok:true});res.cookies.set(adminCookie(user));return res;
}
