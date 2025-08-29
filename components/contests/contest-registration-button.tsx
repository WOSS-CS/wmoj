"use client"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useState, useEffect } from "react"
import type { Database } from "@/lib/supabase/types"

type Contest = Database["public"]["Tables"]["contests"]["Row"]

interface ContestRegistrationButtonProps {
  contest: Contest
  userId: string
}

export function ContestRegistrationButton({ contest, userId }: ContestRegistrationButtonProps) {
  const [isRegistered, setIsRegistered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true)

  useEffect(() => {
    checkRegistration()
  }, [contest.id, userId])

  const checkRegistration = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("contest_registrations")
      .select("id")
      .eq("contest_id", contest.id)
      .eq("user_id", userId)
      .single()

    setIsRegistered(!!data)
    setIsCheckingRegistration(false)
  }

  const handleRegistration = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      if (isRegistered) {
        // Unregister
        await supabase.from("contest_registrations").delete().eq("contest_id", contest.id).eq("user_id", userId)
        setIsRegistered(false)
      } else {
        // Register
        await supabase.from("contest_registrations").insert({
          contest_id: contest.id,
          user_id: userId,
        })
        setIsRegistered(true)
      }
    } catch (error) {
      console.error("Registration error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getContestStatus = () => {
    const now = new Date()
    const start = new Date(contest.start_time)
    const end = new Date(contest.end_time)

    if (now < start) return "upcoming"
    if (now >= start && now < end) return "active"
    return "ended"
  }

  const status = getContestStatus()

  if (isCheckingRegistration) {
    return <Button disabled>Loading...</Button>
  }

  if (status === "ended") {
    return (
      <Button disabled variant="secondary">
        Contest Ended
      </Button>
    )
  }

  if (status === "active") {
    return isRegistered ? (
      <Button disabled className="bg-green-600 hover:bg-green-700">
        Participating
      </Button>
    ) : (
      <Button disabled variant="secondary">
        Registration Closed
      </Button>
    )
  }

  return (
    <Button onClick={handleRegistration} disabled={isLoading} variant={isRegistered ? "outline" : "default"}>
      {isLoading ? "Loading..." : isRegistered ? "Unregister" : "Register"}
    </Button>
  )
}
