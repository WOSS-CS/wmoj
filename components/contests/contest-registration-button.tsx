"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Clock, Users, Trophy, Star, AlertCircle, CheckCircle } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

interface Contest {
  id: string
  slug: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  registration_start: string
  registration_end: string
  max_participants: number | null
  participant_count: number
  is_public: boolean
  is_rated: boolean
  contest_type: string
  difficulty_level: string
  prize_pool: number
}

interface ContestRegistrationButtonProps {
  contest: Contest
  isRegistered?: boolean
  onRegistrationChange?: () => void
}

export function ContestRegistrationButton({ 
  contest, 
  isRegistered = false,
  onRegistrationChange
}: ContestRegistrationButtonProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(isRegistered)

  const now = new Date()
  const registrationStart = new Date(contest.registration_start)
  const registrationEnd = new Date(contest.registration_end)
  const contestStart = new Date(contest.start_time)
  const contestEnd = new Date(contest.end_time)

  // Determine registration status
  const canRegister = now >= registrationStart && now <= registrationEnd && 
                     (!contest.max_participants || contest.participant_count < contest.max_participants)
  const registrationClosed = now > registrationEnd
  const contestStarted = now >= contestStart
  const contestEnded = now >= contestEnd

  const handleRegistration = async () => {
    if (!user) {
      alert("Please log in to register for contests")
      return
    }

    setLoading(true)
    try {
      const action = registered ? "unregister" : "register"
      const response = await fetch(`/api/contests/${contest.slug}/register`, {
        method: registered ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        setRegistered(!registered)
        onRegistrationChange?.()
        
        if (action === "register") {
          alert("Successfully registered for the contest!")
        } else {
          alert("Successfully unregistered from the contest")
        }
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getButtonText = () => {
    if (!user) return "Login to Register"
    if (loading) return registered ? "Unregistering..." : "Registering..."
    if (contestEnded) return "Contest Ended"
    if (contestStarted) return registered ? "Participating" : "Contest Started"
    if (registrationClosed) return "Registration Closed"
    if (!canRegister && contest.max_participants && contest.participant_count >= contest.max_participants) 
      return "Contest Full"
    if (registered) return "Unregister"
    return "Register"
  }

  const getButtonVariant = () => {
    if (!user || contestEnded || contestStarted || registrationClosed || 
        (!canRegister && contest.max_participants && contest.participant_count >= contest.max_participants)) {
      return "secondary"
    }
    return registered ? "outline" : "default"
  }

  const isButtonDisabled = () => {
    return loading || !user || contestEnded || registrationClosed ||
           (!canRegister && contest.max_participants && contest.participant_count >= contest.max_participants) ||
           (contestStarted && !registered)
  }

  return (
    <div className="space-y-4">
      {/* Registration Status Alert */}
      {user && !contestEnded && (
        <Alert className={registered ? "border-green-200 bg-green-50" : ""}>
          <div className="flex items-center gap-2">
            {registered ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {registered 
                ? "You are registered for this contest!"
                : canRegister 
                  ? "Registration is open - join now!"
                  : registrationClosed
                    ? "Registration period has ended"
                    : contest.max_participants && contest.participant_count >= contest.max_participants
                      ? "Contest is full"
                      : `Registration opens on ${registrationStart.toLocaleString()}`
              }
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Registration Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Contest Registration</span>
            {registered && <Badge className="bg-green-100 text-green-800">Registered</Badge>}
          </CardTitle>
          <CardDescription>
            Registration Period: {registrationStart.toLocaleString()} - {registrationEnd.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg">{contest.participant_count}</div>
              <div className="text-muted-foreground">Registered</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">
                {contest.max_participants || "∞"}
              </div>
              <div className="text-muted-foreground">Max</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">
                {Math.round((new Date(contest.end_time).getTime() - new Date(contest.start_time).getTime()) / (1000 * 60))}
              </div>
              <div className="text-muted-foreground">Minutes</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">${contest.prize_pool}</div>
              <div className="text-muted-foreground">Prize</div>
            </div>
          </div>

          <Button 
            onClick={handleRegistration}
            disabled={isButtonDisabled()}
            variant={getButtonVariant()}
            className="w-full"
            size="lg"
          >
            {getButtonText()}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>Contest: {contestStart.toLocaleString()} - {contestEnd.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Duration: {Math.round((new Date(contest.end_time).getTime() - new Date(contest.start_time).getTime()) / (1000 * 60))} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-3 w-3" />
              <span>{contest.is_rated ? "Rated" : "Unrated"} • {contest.contest_type.toUpperCase()} Style</span>
            </div>
            {contest.prize_pool > 0 && (
              <div className="flex items-center gap-2">
                <Trophy className="h-3 w-3" />
                <span>Prize Pool: ${contest.prize_pool}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
