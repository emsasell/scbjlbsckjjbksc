import { getPublicContent } from '../lib/content';
import HomeClient from '../components/HomeClient';
export const dynamic='force-dynamic';
export default async function Home(){return <HomeClient content={await getPublicContent()}/>;}
