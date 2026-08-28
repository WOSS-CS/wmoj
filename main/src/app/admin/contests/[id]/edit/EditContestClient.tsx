'use client';

import { ContestEditForm, type ContestEditFormProps } from '@/components/staff/ContestEditForm';

export default function EditContestClient(props: Omit<ContestEditFormProps, 'tree'>) {
  return <ContestEditForm {...props} tree="admin" />;
}
