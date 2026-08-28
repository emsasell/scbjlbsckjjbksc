import {NextResponse} from 'next/server';import {sessionUser} from '@/lib/auth';
export async function GET(){const u=await sessionUser();if(!u)return NextResponse.json({error:'Unauthorized'},{status:401});return NextResponse.json({user:{...u,login:u.username}})}
