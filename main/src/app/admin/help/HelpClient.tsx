'use client';

import Link from 'next/link';
import { StaffHelpGuide } from '@/components/staff/StaffHelpGuide';
import { staffRoutes } from '@/lib/staffPolicy';

const routes = staffRoutes('admin');

/**
 * The admin help page: the shared guide plus the six things an admin is told
 * that a manager is not. The divergence is real advice, not a role-noun swap —
 * an admin's problems and contests land pending and wait for a manager, and an
 * admin cannot deactivate a contest — so it stays in this file rather than
 * being reconciled into one paragraph with a branch in it. See
 * `components/staff/StaffHelpGuide.tsx` for everything both roles share.
 */
export default function HelpClient() {
  return (
    <StaffHelpGuide
      tree="admin"
      title="Admin Help & Operations Guide"
      intro="Everything you need to administer WMOJ."
      problemsSection={
        <p className="text-text-muted">Go to <Link href={routes.problemsManage} className="text-brand-primary hover:underline">Manage Problems</Link> to review, edit, or deactivate problems. Problems you create land here as pending and are not visible publicly until a manager approves them. You can still edit them while pending.</p>
      }
      contestsSection={
        <p className="text-text-muted">Create contests via <Link href={routes.contestsCreate} className="text-brand-primary hover:underline">Create Contest</Link> and manage them in <Link href={routes.contestsManage} className="text-brand-primary hover:underline">Manage Contests</Link>. Like problems, contests you create stay pending until a manager approves them.</p>
      }
      joinHistoryNote="Ask a manager to deactivate it instead."
      forbiddenLine="Forbidden admin pages: confirm your account is in the admins table."
    />
  );
}
