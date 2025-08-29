import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileSetupForm } from "@/components/profile/profile-setup-form"

export default async function ProfileSetupPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Complete Your Profile</h1>
        <p className="text-muted-foreground">Let's set up your profile to get started with coding challenges.</p>
      </div>

      <ProfileSetupForm userId={data.user.id} email={data.user.email || ""} />
    </div>
  )
}
