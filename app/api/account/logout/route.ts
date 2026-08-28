import {NextResponse} from 'next/server';import {clearAdminCookie} from '@/lib/auth';
export async function POST(){const r=NextResponse.json({ok:true});r.cookies.set(clearAdminCookie());return r}
