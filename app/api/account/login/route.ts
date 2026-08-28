import {NextResponse} from 'next/server';
import {loginUser,adminCookie,validAdminPassword} from '@/lib/auth';

export async function POST(req:Request){
  try{
    const {login,password}=await req.json();
    const username=String(login||'').trim();
    const pass=String(password||'');
    if(!username||!pass)return NextResponse.json({error:'Введите логин и пароль'},{status:400});
    // Explicit owner check remains synchronous for compatibility.
    if(username==='0'&&!validAdminPassword(pass))return NextResponse.json({error:'Неверный логин или пароль'},{status:401});
    const user=await loginUser(username,pass);
    if(!user)return NextResponse.json({error:'Неверный логин или пароль'},{status:401});
    const res=NextResponse.json({ok:true,user:{id:user.id,login:user.username,username:user.username,role:user.role,district_id:user.district_id,is_admin:user.is_admin,is_creator:user.is_creator}});
    res.cookies.set(adminCookie(user));
    return res;
  }catch(e:any){return NextResponse.json({error:e?.message||'Ошибка входа'},{status:500})}
}
