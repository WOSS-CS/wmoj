import LoginClient from './LoginClient';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ disabled?: string }>;
}) {
  const params = await searchParams;
  return <LoginClient accountDisabled={params?.disabled === '1'} />;
}
