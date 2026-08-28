import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { getAllContent } from '@/lib/content';
import AdminClient from '@/components/AdminClient';
export const dynamic='force-dynamic';
export default async function Admin(){if(!(await isAdmin())) redirect('/admin/login'); return <AdminClient initial={await getAllContent()}/>}
