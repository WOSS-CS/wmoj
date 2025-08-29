import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/queries"
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form"

export default async function ProfileSettingsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const profile = await getProfile(data.user.id)

  if (!profile) {
    redirect("/profile/setup")
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and profile information.</p>
      </div>

      <ProfileSettingsForm profile={profile} />
    </div>
  )
}
