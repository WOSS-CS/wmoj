import { createClient } from "./client"
import type { Database } from "./types"

type Tables = Database["public"]["Tables"]
type Profile = Tables["profiles"]["Row"]
type Problem = Tables["problems"]["Row"]
type Contest = Tables["contests"]["Row"]
type Submission = Tables["submissions"]["Row"]
type UserProblemStats = Tables["user_problem_stats"]["Row"]

// Profile queries
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error) {
    console.error("Error fetching profile:", error)
    return null
  }

  return data
}

export async function updateProfile(userId: string, updates: Tables["profiles"]["Update"]): Promise<Profile | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single()

  if (error) {
    console.error("Error updating profile:", error)
    return null
  }

  return data
}

// Problem queries
export async function getProblems(filters?: {
  difficulty?: string
  tags?: string[]
  search?: string
}): Promise<Problem[]> {
  const supabase = createClient()
  let query = supabase.from("problems").select("*").eq("is_active", true).order("created_at", { ascending: false })

  if (filters?.difficulty) {
    query = query.eq("difficulty", filters.difficulty)
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags)
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching problems:", error)
    return []
  }

  return data || []
}

export async function getProblem(slug: string): Promise<Problem | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("problems").select("*").eq("slug", slug).eq("is_active", true).single()

  if (error) {
    console.error("Error fetching problem:", error)
    return null
  }

  return data
}

// Contest queries
export async function getContests(): Promise<Contest[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("contests")
    .select("*")
    .eq("is_public", true)
    .order("start_time", { ascending: false })

  if (error) {
    console.error("Error fetching contests:", error)
    return []
  }

  return data || []
}

export async function getContest(slug: string): Promise<Contest | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("contests").select("*").eq("slug", slug).eq("is_public", true).single()

  if (error) {
    console.error("Error fetching contest:", error)
    return null
  }

  return data
}

export async function getContestProblems(
  contestId: string,
): Promise<(Problem & { points: number; order_index: number })[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("contest_problems")
    .select(`
      points,
      order_index,
      problems (*)
    `)
    .eq("contest_id", contestId)
    .order("order_index")

  if (error) {
    console.error("Error fetching contest problems:", error)
    return []
  }

  return (
    data?.map((item) => ({
      ...item.problems,
      points: item.points,
      order_index: item.order_index,
    })) || []
  )
}

export async function getContestRegistrations(contestId: string): Promise<any[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("contest_registrations")
    .select(`
      *,
      profiles (username, display_name, avatar_url)
    `)
    .eq("contest_id", contestId)
    .order("registered_at", { ascending: false })

  if (error) {
    console.error("Error fetching contest registrations:", error)
    return []
  }

  return data || []
}

export async function getContestLeaderboard(contestId: string): Promise<any[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("submissions")
    .select(`
      user_id,
      score,
      submitted_at,
      test_cases_passed,
      total_test_cases,
      profiles!inner (username, display_name, avatar_url)
    `)
    .eq("contest_id", contestId)
    .order("submitted_at", { ascending: true })

  if (error) {
    console.error("Error fetching contest leaderboard:", error)
    return []
  }

  // Group by user and sum scores
  const userScores = new Map()
  data?.forEach((submission) => {
    const userId = submission.user_id
    if (!userScores.has(userId)) {
      userScores.set(userId, {
        user_id: userId,
        username: submission.profiles.username,
        display_name: submission.profiles.display_name,
        avatar_url: submission.profiles.avatar_url,
        total_score: 0,
        last_submission: submission.submitted_at,
      })
    }
    const isAccepted = (submission.total_test_cases && submission.test_cases_passed === submission.total_test_cases) || submission.score > 0
    userScores.get(userId).total_score += isAccepted ? submission.score : 0
  })

  return Array.from(userScores.values()).sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score
    return new Date(a.last_submission).getTime() - new Date(b.last_submission).getTime()
  })
}

export async function isUserRegisteredForContest(userId: string, contestId: string): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("contest_registrations")
    .select("id")
    .eq("user_id", userId)
    .eq("contest_id", contestId)
    .single()

  return !!data && !error
}

// Submission queries
export async function getUserSubmissions(userId: string, problemId?: string): Promise<Submission[]> {
  const supabase = createClient()
  let query = supabase.from("submissions").select("*").eq("user_id", userId).order("submitted_at", { ascending: false })

  if (problemId) {
    query = query.eq("problem_id", problemId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching submissions:", error)
    return []
  }

  return data || []
}

export async function createSubmission(submission: Tables["submissions"]["Insert"]): Promise<Submission | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("submissions").insert(submission).select().single()

  if (error) {
    console.error("Error creating submission:", error)
    return null
  }

  return data
}

export async function getSubmission(submissionId: string): Promise<Submission | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("submissions")
    .select(`
      *,
      problems (title, slug, difficulty),
      contests (title, slug)
    `)
    .eq("id", submissionId)
    .single()

  if (error) {
    console.error("Error fetching submission:", error)
    return null
  }

  return data
}

// User stats queries
export async function getUserProblemStats(userId: string): Promise<UserProblemStats[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("user_problem_stats").select("*").eq("user_id", userId)

  if (error) {
    console.error("Error fetching user problem stats:", error)
    return []
  }

  return data || []
}

export async function updateUserProblemStats(userId: string, problemId: string, status: string): Promise<void> {
  const supabase = createClient()

  // Upsert user problem stats
  await supabase
    .from("user_problem_stats")
    .upsert({
      user_id: userId,
      problem_id: problemId,
      status,
      last_attempted: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("problem_id", problemId)
}

export async function getUserStats(userId: string) {
  const supabase = createClient()

  // Get problem stats
  const { data: problemStats } = await supabase
    .from("user_problem_stats")
    .select("status, problems!inner(difficulty)")
    .eq("user_id", userId)

  // Get submission stats
  const { data: submissions } = await supabase
    .from("submissions")
    .select("score, test_cases_passed, total_test_cases, submitted_at")
    .eq("user_id", userId)

  const stats = {
    totalSolved: problemStats?.filter((p) => p.status === "solved").length || 0,
    totalAttempted: problemStats?.filter((p) => p.status !== "not_attempted").length || 0,
    easySolved: problemStats?.filter((p) => p.status === "solved" && p.problems.difficulty === "Easy").length || 0,
    mediumSolved: problemStats?.filter((p) => p.status === "solved" && p.problems.difficulty === "Medium").length || 0,
    hardSolved: problemStats?.filter((p) => p.status === "solved" && p.problems.difficulty === "Hard").length || 0,
    totalSubmissions: submissions?.length || 0,
    acceptedSubmissions:
      submissions?.filter((s: any) => (s.total_test_cases && s.test_cases_passed === s.total_test_cases) || s.score === 100).length || 0,
    recentSubmissions: submissions?.slice(0, 10) || [],
  }

  return stats
}

// Learning resource queries
export async function getLearningResources(filters?: {
  category?: string
  difficulty?: string
  tags?: string[]
  search?: string
}): Promise<Tables["learning_resources"]["Row"][]> {
  const supabase = createClient()
  let query = supabase
    .from("learning_resources")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })

  if (filters?.category) {
    query = query.eq("category", filters.category)
  }

  if (filters?.difficulty) {
    query = query.eq("difficulty", filters.difficulty)
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags)
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching learning resources:", error)
    return []
  }

  return data || []
}

export async function getLearningResource(slug: string): Promise<Tables["learning_resources"]["Row"] | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("learning_resources")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single()

  if (error) {
    console.error("Error fetching learning resource:", error)
    return null
  }

  return data
}

export async function getUserLearningProgress(userId: string): Promise<Tables["user_learning_progress"]["Row"][]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("user_learning_progress")
    .select(`
      *,
      learning_resources (title, slug, category, difficulty, estimated_time)
    `)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching user learning progress:", error)
    return []
  }

  return data || []
}

// Global leaderboard queries
export async function getGlobalLeaderboard(): Promise<any[]> {
  const supabase = createClient()
  
  // Get user stats with problem counts
  const { data, error } = await supabase
    .from("user_problem_stats")
    .select(`
      user_id,
      status,
      problems!inner (difficulty),
      profiles!inner (username, display_name, avatar_url)
    `)

  if (error) {
    console.error("Error fetching global leaderboard:", error)
    return []
  }

  // Group by user and calculate stats
  const userStats = new Map()
  data?.forEach((stat) => {
    const userId = stat.user_id
    if (!userStats.has(userId)) {
      userStats.set(userId, {
        user_id: userId,
        username: stat.profiles.username,
        display_name: stat.profiles.display_name,
        avatar_url: stat.profiles.avatar_url,
        total_solved: 0,
        easy_solved: 0,
        medium_solved: 0,
        hard_solved: 0,
      })
    }

    if (stat.status === "solved") {
      const userStat = userStats.get(userId)
      userStat.total_solved++
      if (stat.problems.difficulty === "Easy") userStat.easy_solved++
      if (stat.problems.difficulty === "Medium") userStat.medium_solved++
      if (stat.problems.difficulty === "Hard") userStat.hard_solved++
    }
  })

  return Array.from(userStats.values())
    .filter(user => user.total_solved > 0)
    .sort((a, b) => {
      // Sort by total solved, then by hard problems, then medium, then easy
      if (b.total_solved !== a.total_solved) return b.total_solved - a.total_solved
      if (b.hard_solved !== a.hard_solved) return b.hard_solved - a.hard_solved
      if (b.medium_solved !== a.medium_solved) return b.medium_solved - a.medium_solved
      return b.easy_solved - a.easy_solved
    })
}

// Calendar and Event queries
export async function getCalendarEvents(startDate?: string, endDate?: string): Promise<Tables["calendar_events"]["Row"][]> {
  const supabase = createClient()
  
  let query = supabase
    .from("calendar_events")
    .select("*")
    .eq("is_public", true)
    .order("start_time", { ascending: true })
  
  if (startDate) {
    query = query.gte("start_time", startDate)
  }
  
  if (endDate) {
    query = query.lte("start_time", endDate)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error("Error fetching calendar events:", error)
    return []
  }
  
  return data || []
}

export async function getUpcomingEvents(limit: number = 10): Promise<Tables["calendar_events"]["Row"][]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("is_public", true)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(limit)
  
  if (error) {
    console.error("Error fetching upcoming events:", error)
    return []
  }
  
  return data || []
}

export async function getUserEventRegistrations(userId: string): Promise<any[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("event_registrations")
    .select(`
      *,
      calendar_events (*)
    `)
    .eq("user_id", userId)
    .eq("registration_status", "registered")
  
  if (error) {
    console.error("Error fetching user event registrations:", error)
    return []
  }
  
  return data || []
}

export async function registerForEvent(eventId: string, userId: string, notes?: string): Promise<Tables["event_registrations"]["Row"] | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("event_registrations")
    .insert({
      event_id: eventId,
      user_id: userId,
      registration_status: "registered",
      notes: notes || null,
    })
    .select()
    .single()
  
  if (error) {
    console.error("Error registering for event:", error)
    return null
  }
  
  return data
}

export async function cancelEventRegistration(eventId: string, userId: string): Promise<Tables["event_registrations"]["Row"] | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("event_registrations")
    .update({ registration_status: "cancelled" })
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .select()
    .single()
  
  if (error) {
    console.error("Error cancelling event registration:", error)
    return null
  }
  
  return data
}
