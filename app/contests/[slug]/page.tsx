import { notFound, redirect } from "next/navigation"
import { getContest, getContestProblems } from "@/lib/supabase/queries"
import { createClient } from "@/lib/supabase/server"
import { ContestHeader } from "@/components/contests/contest-header"
import { ContestTabs } from "@/components/contests/contest-tabs"

interface ContestPageProps {
  params: {
    slug: string
  }
}

export default async function ContestPage({ params }: ContestPageProps) {
  const contest = await getContest(params.slug)

  if (!contest) {
    notFound()
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data?.user) {
    redirect("/auth/login")
  }

  const problems = await getContestProblems(contest.id)

  return (
    <div className="container mx-auto p-6">
      <ContestHeader contest={contest} userId={data.user.id} />
      <ContestTabs contest={contest} problems={problems} userId={data.user.id} />
    </div>
  )
}
