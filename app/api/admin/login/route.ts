import {NextResponse} from 'next/server';
import {adminCookie,authenticate,logAction} from '../../../../lib/auth';
export async function POST(req:Request){
 const {password}=await req.json().catch(()=>({}));
 const user=await authenticate(String(password||''));
 if(!user){await logAction('Неудачная попытка входа','Неверный пароль администратора');return NextResponse.json({error:'Неверный пароль администратора'},{status:403});}
 await logAction('Вход в админ-панель','Успешный вход'); const res=NextResponse.json({ok:true});res.cookies.set(adminCookie(user));return res;
}
