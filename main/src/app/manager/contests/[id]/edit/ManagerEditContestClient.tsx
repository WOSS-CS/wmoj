'use client';

import { ContestEditForm, type ContestEditFormProps } from '@/components/staff/ContestEditForm';

export default function ManagerEditContestClient(props: Omit<ContestEditFormProps, 'tree'>) {
  return <ContestEditForm {...props} tree="manager" />;
}
