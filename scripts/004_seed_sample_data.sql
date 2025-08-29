-- Insert sample problems
INSERT INTO public.problems (title, slug, description, difficulty, tags, input_format, output_format, constraints, sample_input, sample_output, explanation, time_limit, memory_limit) VALUES
('Two Sum', 'two-sum', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.', 'Easy', '{"array", "hash-table"}', 'First line contains n (length of array) and target. Second line contains n integers.', 'Two integers representing the indices.', '2 ≤ nums.length ≤ 10^4, -10^9 ≤ nums[i] ≤ 10^9, -10^9 ≤ target ≤ 10^9', '4 9\n2 7 11 15', '0 1', 'nums[0] + nums[1] = 2 + 7 = 9, so we return [0, 1].', 1000, 256),

('Add Two Numbers', 'add-two-numbers', 'You are given two non-empty linked lists representing two non-negative integers. Add the two numbers and return the sum as a linked list.', 'Medium', '{"linked-list", "math", "recursion"}', 'Two lines, each containing space-separated integers representing linked list nodes.', 'Space-separated integers representing the result linked list.', '1 ≤ number of nodes ≤ 100, 0 ≤ Node.val ≤ 9', '2 4 3\n5 6 4', '7 0 8', 'The sum is 342 + 465 = 807, represented as 7 -> 0 -> 8.', 2000, 256),

('Longest Substring Without Repeating Characters', 'longest-substring-without-repeating-characters', 'Given a string s, find the length of the longest substring without repeating characters.', 'Medium', '{"hash-table", "string", "sliding-window"}', 'A single line containing the string s.', 'An integer representing the length of the longest substring.', '0 ≤ s.length ≤ 5 * 10^4, s consists of English letters, digits, symbols and spaces.', 'abcabcbb', '3', 'The answer is "abc", with the length of 3.', 1000, 256),

('Median of Two Sorted Arrays', 'median-of-two-sorted-arrays', 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.', 'Hard', '{"array", "binary-search", "divide-and-conquer"}', 'First line contains m and n. Second line contains m integers (nums1). Third line contains n integers (nums2).', 'A single number representing the median.', '0 ≤ m ≤ 1000, 0 ≤ n ≤ 1000, 1 ≤ m + n ≤ 2000, -10^6 ≤ nums1[i], nums2[i] ≤ 10^6', '2 1\n1 3\n2', '2.0', 'The merged array is [1,2,3] and the median is 2.', 2000, 256),

('Valid Parentheses', 'valid-parentheses', 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.', 'Easy', '{"string", "stack"}', 'A single line containing the string s.', '"true" if valid, "false" otherwise.', '1 ≤ s.length ≤ 10^4, s consists of parentheses only "()[]{}"', '()[]{}', 'true', 'All brackets are properly matched and nested.', 1000, 256);

-- Insert sample contest
INSERT INTO public.contests (title, slug, description, start_time, end_time, registration_start, registration_end, max_participants, is_public) VALUES
('Weekly Contest 1', 'weekly-contest-1', 'Our first weekly programming contest featuring 4 problems of varying difficulty.', 
 NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 2 hours', 
 NOW(), NOW() + INTERVAL '1 day', 
 1000, true);

-- Get the contest ID for linking problems
DO $$
DECLARE
    contest_uuid UUID;
    problem_uuids UUID[];
BEGIN
    -- Get contest ID
    SELECT id INTO contest_uuid FROM public.contests WHERE slug = 'weekly-contest-1';
    
    -- Get problem IDs
    SELECT ARRAY_AGG(id ORDER BY 
        CASE difficulty 
            WHEN 'Easy' THEN 1 
            WHEN 'Medium' THEN 2 
            WHEN 'Hard' THEN 3 
        END
    ) INTO problem_uuids 
    FROM public.problems;
    
    -- Link problems to contest
    INSERT INTO public.contest_problems (contest_id, problem_id, points, order_index) VALUES
    (contest_uuid, problem_uuids[1], 100, 1),
    (contest_uuid, problem_uuids[2], 200, 2),
    (contest_uuid, problem_uuids[3], 200, 3),
    (contest_uuid, problem_uuids[4], 300, 4);
END $$;
