import { requireActiveManager } from '@/lib/staffAuth';
import ManagerCreateProblemClient from './ManagerCreateProblemClient';

export default async function ManagerCreateProblemPage() {
  // Guard only — this page renders a create form and reads nothing.
  await requireActiveManager();

  return <ManagerCreateProblemClient />;
}
