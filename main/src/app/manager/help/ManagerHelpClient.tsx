'use client';

import Link from 'next/link';
import { StaffHelpGuide } from '@/components/staff/StaffHelpGuide';
import { staffRoutes } from '@/lib/staffPolicy';

const routes = staffRoutes('manager');

/**
 * The manager help page: the shared guide plus the six things a manager is told
 * that an admin is not. The divergence is real advice, not a role-noun swap — a
 * manager is the one who approves what admins submit, and the only role that
 * may deactivate a contest — so it stays in this file rather than being
 * reconciled into one paragraph with a branch in it. See
 * `components/staff/StaffHelpGuide.tsx` for everything both roles share.
 */
export default function ManagerHelpClient() {
  return (
    <StaffHelpGuide
      tree="manager"
      title="Manager Help & Operations Guide"
      intro="Everything you need to manage WMOJ."
      problemsSection={
        <>
          <p className="text-text-muted">Go to <Link href={routes.problemsManage} className="text-brand-primary hover:underline">Manage Problems</Link> to review, edit, or deactivate problems.</p>
          <p className="text-text-muted"><strong className="text-foreground">Approving Problems: </strong>When admins create problems (and contests), they are inactive by default until a manager activates it.</p>
        </>
      }
      contestsSection={
        <p className="text-text-muted">Create contests via <Link href={routes.contestsCreate} className="text-brand-primary hover:underline">Create Contest</Link> and manage them in <Link href={routes.contestsManage} className="text-brand-primary hover:underline">Manage Contests</Link>. Manage Contests is also where you approve admin-submitted contests; those remain pending until you review them, so check the queue regularly.</p>
      }
      joinHistoryNote="Deactivate it instead."
      forbiddenLine="Forbidden manager pages: confirm your account is in the managers table."
    />
  );
}
