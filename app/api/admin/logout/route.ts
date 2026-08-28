import { NextResponse } from 'next/server';
import {logAction,isAdmin} from '@/lib/auth';
export async function POST(){if(await isAdmin())await logAction('Выход из админ-панели','Сессия завершена');const res=NextResponse.json({ok:true});res.cookies.set({name:process.env.ADMIN_COOKIE||'megamine_admin',value:'',httpOnly:true,expires:new Date(0),path:'/'});return res;}
