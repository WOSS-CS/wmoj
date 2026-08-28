import { requireActiveManager } from '@/lib/staffAuth';
import ManagerHelpClient from './ManagerHelpClient';

export default async function ManagerHelpPage() {
  // Access control for the manager tree is enforced server-side in every manager
  // `page.tsx`, before the client component renders. This is that gate; the
  // client deliberately does not re-check the role.
  await requireActiveManager();

  return <ManagerHelpClient />;
}
