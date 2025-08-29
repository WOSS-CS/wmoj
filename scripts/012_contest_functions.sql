-- Contest management functions

-- Function to update contest standings after a submission
CREATE OR REPLACE FUNCTION update_contest_standings(
  p_contest_id UUID,
  p_user_id UUID,
  p_problem_id UUID,
  p_submission_verdict TEXT,
  p_submission_time TIMESTAMP WITH TIME ZONE,
  p_time_from_start INTEGER
) RETURNS VOID AS $$
DECLARE
  v_problem_points INTEGER;
  v_penalty_minutes INTEGER;
  v_is_first_ac BOOLEAN := false;
  v_current_attempts INTEGER;
BEGIN
  -- Get problem points and penalty
  SELECT points, penalty_minutes INTO v_problem_points, v_penalty_minutes
  FROM contest_problems 
  WHERE contest_id = p_contest_id AND problem_id = p_problem_id;

  -- Update contest problem results
  INSERT INTO contest_problem_results (contest_id, user_id, problem_id, attempts, is_solved, first_ac_time, points_earned, penalty_time)
  VALUES (p_contest_id, p_user_id, p_problem_id, 1, 
          p_submission_verdict = 'accepted', 
          CASE WHEN p_submission_verdict = 'accepted' THEN p_time_from_start ELSE NULL END,
          CASE WHEN p_submission_verdict = 'accepted' THEN v_problem_points ELSE 0 END,
          CASE WHEN p_submission_verdict = 'accepted' THEN 0 ELSE v_penalty_minutes END)
  ON CONFLICT (contest_id, user_id, problem_id) DO UPDATE SET
    attempts = contest_problem_results.attempts + 1,
    is_solved = CASE WHEN p_submission_verdict = 'accepted' AND NOT contest_problem_results.is_solved 
                     THEN true ELSE contest_problem_results.is_solved END,
    first_ac_time = CASE WHEN p_submission_verdict = 'accepted' AND NOT contest_problem_results.is_solved 
                         THEN p_time_from_start ELSE contest_problem_results.first_ac_time END,
    points_earned = CASE WHEN p_submission_verdict = 'accepted' AND NOT contest_problem_results.is_solved 
                         THEN v_problem_points ELSE contest_problem_results.points_earned END,
    penalty_time = CASE WHEN p_submission_verdict = 'accepted' AND NOT contest_problem_results.is_solved 
                        THEN contest_problem_results.penalty_time
                        WHEN p_submission_verdict != 'accepted' AND NOT contest_problem_results.is_solved
                        THEN contest_problem_results.penalty_time + v_penalty_minutes
                        ELSE contest_problem_results.penalty_time END,
    updated_at = NOW();

  -- Check if this is the first AC for this user-problem combination
  SELECT NOT is_solved INTO v_is_first_ac FROM contest_problem_results 
  WHERE contest_id = p_contest_id AND user_id = p_user_id AND problem_id = p_problem_id;

  -- Update overall contest standings
  INSERT INTO contest_standings (contest_id, user_id, rank, total_score, total_penalty, problems_solved, last_submission_time)
  SELECT 
    p_contest_id,
    p_user_id,
    1, -- Will be recalculated
    COALESCE(SUM(cpr.points_earned), 0),
    COALESCE(SUM(cpr.penalty_time + CASE WHEN cpr.is_solved THEN cpr.first_ac_time ELSE 0 END), 0),
    COUNT(CASE WHEN cpr.is_solved THEN 1 END),
    p_submission_time
  FROM contest_problem_results cpr
  WHERE cpr.contest_id = p_contest_id AND cpr.user_id = p_user_id
  ON CONFLICT (contest_id, user_id) DO UPDATE SET
    total_score = (
      SELECT COALESCE(SUM(cpr.points_earned), 0)
      FROM contest_problem_results cpr
      WHERE cpr.contest_id = p_contest_id AND cpr.user_id = p_user_id
    ),
    total_penalty = (
      SELECT COALESCE(SUM(cpr.penalty_time + CASE WHEN cpr.is_solved THEN cpr.first_ac_time ELSE 0 END), 0)
      FROM contest_problem_results cpr
      WHERE cpr.contest_id = p_contest_id AND cpr.user_id = p_user_id
    ),
    problems_solved = (
      SELECT COUNT(CASE WHEN cpr.is_solved THEN 1 END)
      FROM contest_problem_results cpr
      WHERE cpr.contest_id = p_contest_id AND cpr.user_id = p_user_id
    ),
    last_submission_time = p_submission_time,
    updated_at = NOW();

  -- Recalculate ranks for all participants in the contest
  WITH ranked_standings AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (
        ORDER BY total_score DESC, total_penalty ASC, last_submission_time ASC
      ) as new_rank
    FROM contest_standings
    WHERE contest_id = p_contest_id
  )
  UPDATE contest_standings 
  SET rank = ranked_standings.new_rank
  FROM ranked_standings
  WHERE contest_standings.contest_id = p_contest_id 
    AND contest_standings.user_id = ranked_standings.user_id;

END;
$$ LANGUAGE plpgsql;

-- Function to check if user can register for contest
CREATE OR REPLACE FUNCTION can_register_for_contest(
  p_contest_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_contest_record RECORD;
  v_current_participants INTEGER;
BEGIN
  -- Get contest details
  SELECT * INTO v_contest_record
  FROM contests 
  WHERE id = p_contest_id AND is_public = true;

  -- Check if contest exists and is public
  IF v_contest_record IS NULL THEN
    RETURN false;
  END IF;

  -- Check if registration is open
  IF NOW() NOT BETWEEN v_contest_record.registration_start AND v_contest_record.registration_end THEN
    RETURN false;
  END IF;

  -- Check if already registered
  IF EXISTS (SELECT 1 FROM contest_registrations WHERE contest_id = p_contest_id AND user_id = p_user_id) THEN
    RETURN false;
  END IF;

  -- Check participant limit if set
  IF v_contest_record.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_participants
    FROM contest_registrations
    WHERE contest_id = p_contest_id;
    
    IF v_current_participants >= v_contest_record.max_participants THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get contest status for a user
CREATE OR REPLACE FUNCTION get_contest_status(
  p_contest_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_contest RECORD;
  v_is_registered BOOLEAN := false;
BEGIN
  SELECT * INTO v_contest FROM contests WHERE id = p_contest_id;
  
  IF v_contest IS NULL THEN
    RETURN 'not_found';
  END IF;

  -- Check if user is registered (if user_id provided)
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM contest_registrations 
      WHERE contest_id = p_contest_id AND user_id = p_user_id
    ) INTO v_is_registered;
  END IF;

  -- Determine contest status
  IF NOW() < v_contest.registration_start THEN
    RETURN 'registration_not_started';
  ELSIF NOW() BETWEEN v_contest.registration_start AND v_contest.registration_end THEN
    IF p_user_id IS NOT NULL AND v_is_registered THEN
      RETURN 'registered';
    ELSE
      RETURN 'registration_open';
    END IF;
  ELSIF NOW() < v_contest.start_time THEN
    IF p_user_id IS NOT NULL AND v_is_registered THEN
      RETURN 'registered_waiting';
    ELSE
      RETURN 'registration_closed';
    END IF;
  ELSIF NOW() BETWEEN v_contest.start_time AND v_contest.end_time THEN
    IF p_user_id IS NOT NULL AND v_is_registered THEN
      RETURN 'participating';
    ELSE
      RETURN 'running';
    END IF;
  ELSE
    RETURN 'finished';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update standings when a contest submission is made
CREATE OR REPLACE FUNCTION trigger_update_contest_standings() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.verdict != NEW.verdict) THEN
    PERFORM update_contest_standings(
      NEW.contest_id,
      NEW.user_id, 
      NEW.problem_id,
      NEW.verdict,
      NEW.submitted_at,
      NEW.time_from_start
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contest_submission_standings_trigger
  AFTER INSERT OR UPDATE ON contest_submissions
  FOR EACH ROW EXECUTE FUNCTION trigger_update_contest_standings();
