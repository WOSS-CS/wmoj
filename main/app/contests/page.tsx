import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/supabase/queries"
import { ContestList } from "@/components/contests/contest-list"

export default async function ContestsPage() {
  // Check if user is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userRole = user ? await getUserRole(user.id) : "user"
  const isAdmin = userRole === "admin"

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contests</h1>
        <p className="text-muted-foreground">
          Participate in programming contests to test your skills and compete with others.
        </p>
      </div>
      
      <ContestList isAdmin={isAdmin} />
    </div>
  )
}
