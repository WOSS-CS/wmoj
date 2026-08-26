import { requireActiveManager } from '@/lib/staffAuth';
import ManagerCreateContestClient from './ManagerCreateContestClient';

export default async function ManagerCreateContestPage() {
  await requireActiveManager();

  return <ManagerCreateContestClient />;
}
