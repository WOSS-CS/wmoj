import { requireActiveManager } from '@/lib/staffAuth';
import ManagerHelpClient from './ManagerHelpClient';

export default async function ManagerHelpPage() {
  // `ManagerGuard` deliberately does not re-check the role — it documents that
  // access control is enforced server-side in every manager `page.tsx`. This is
  // that gate.
  await requireActiveManager();

  return <ManagerHelpClient />;
}
