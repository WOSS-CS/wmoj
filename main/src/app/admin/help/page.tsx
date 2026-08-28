import { requireActiveAdmin } from '@/lib/staffAuth';
import HelpClient from './HelpClient';

export default async function AdminHelpPage() {
  // Access control for the admin tree is enforced server-side in every admin
  // `page.tsx`, before the client component renders. This is that gate; the
  // client deliberately does not re-check the role.
  await requireActiveAdmin();

  return <HelpClient />;
}
