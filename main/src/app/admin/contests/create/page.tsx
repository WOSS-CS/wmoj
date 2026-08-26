import { requireActiveAdmin } from '@/lib/staffAuth';
import CreateContestClient from './CreateContestClient';

export default async function CreateContestPage() {
  await requireActiveAdmin();

  return <CreateContestClient />;
}
