import { requireActiveManager } from '@/lib/staffAuth';
import ManagerCreateNewsPostClient from './ManagerCreateNewsPostClient';

export default async function ManagerCreateNewsPostPage() {
  await requireActiveManager();

  return <ManagerCreateNewsPostClient />;
}
