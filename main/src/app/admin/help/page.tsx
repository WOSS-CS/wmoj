import { requireActiveAdmin } from '@/lib/staffAuth';
import HelpClient from './HelpClient';

export default async function AdminHelpPage() {
  // `AdminGuard` deliberately does not re-check the role — it documents that
  // access control is enforced server-side in every admin `page.tsx`. This is
  // that gate.
  await requireActiveAdmin();

  return <HelpClient />;
}
