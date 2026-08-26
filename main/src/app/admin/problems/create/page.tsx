import { requireActiveAdmin } from '@/lib/staffAuth';
import CreateProblemClient from './CreateProblemClient';

export default async function CreateProblemPage() {
  // Guard only — this page renders a create form and reads nothing.
  await requireActiveAdmin();

  return <CreateProblemClient />;
}
