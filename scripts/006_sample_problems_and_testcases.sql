-- Sample problems with test cases for development and testing

-- Insert sample problems
INSERT INTO public.problems (id, title, slug, description, difficulty, tags, input_format, output_format, constraints, sample_input, sample_output, explanation, time_limit, memory_limit)
VALUES 
(
  uuid_generate_v4(),
  'Two Sum',
  'two-sum',
  'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.',
  'Easy',
  ARRAY['Array', 'Hash Table'],
  'The first line contains an integer n (2 ≤ n ≤ 10^4), the length of the array.
The second line contains n space-separated integers nums[i] (-10^9 ≤ nums[i] ≤ 10^9).
The third line contains an integer target (-10^9 ≤ target ≤ 10^9).',
  'Output two space-separated integers representing the indices (0-indexed) of the two numbers that add up to target.',
  '• 2 ≤ nums.length ≤ 10^4
• -10^9 ≤ nums[i] ≤ 10^9
• -10^9 ≤ target ≤ 10^9
• Only one valid answer exists',
  '4
2 7 11 15
9',
  '0 1',
  'Because nums[0] + nums[1] == 2 + 7 == 9, we return [0, 1].',
  2000,
  256
),
(
  uuid_generate_v4(),
  'Add Two Numbers',
  'add-two-numbers',
  'You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.

You may assume the two numbers do not contain any leading zero, except the number 0 itself.',
  'Medium',
  ARRAY['Linked List', 'Math', 'Recursion'],
  'The first line contains the digits of the first number in reverse order.
The second line contains the digits of the second number in reverse order.',
  'Output the digits of the sum in reverse order.',
  '• The number of nodes in each linked list is in the range [1, 100]
• 0 ≤ Node.val ≤ 9
• It is guaranteed that the list represents a number that does not have leading zeros',
  '2 4 3
5 6 4',
  '7 0 8',
  'The numbers are 342 and 465. 342 + 465 = 807, which is represented as 7 → 0 → 8.',
  3000,
  256
),
(
  uuid_generate_v4(),
  'Longest Substring Without Repeating Characters',
  'longest-substring-without-repeating-characters',
  'Given a string s, find the length of the longest substring without repeating characters.',
  'Medium',
  ARRAY['Hash Table', 'String', 'Sliding Window'],
  'A single line containing a string s.',
  'Output a single integer representing the length of the longest substring without repeating characters.',
  '• 0 ≤ s.length ≤ 5 * 10^4
• s consists of English letters, digits, symbols and spaces',
  'abcabcbb',
  '3',
  'The answer is "abc", with the length of 3.',
  2000,
  256
),
(
  uuid_generate_v4(),
  'Median of Two Sorted Arrays',
  'median-of-two-sorted-arrays',
  'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two arrays.

The overall run time complexity should be O(log (m+n)).',
  'Hard',
  ARRAY['Array', 'Binary Search', 'Divide and Conquer'],
  'The first line contains an integer m, the size of the first array.
The second line contains m space-separated integers representing nums1.
The third line contains an integer n, the size of the second array.
The fourth line contains n space-separated integers representing nums2.',
  'Output the median as a decimal number with exactly one decimal place.',
  '• nums1.length == m
• nums2.length == n
• 0 ≤ m ≤ 1000
• 0 ≤ n ≤ 1000
• 1 ≤ m + n ≤ 2000
• -10^6 ≤ nums1[i], nums2[i] ≤ 10^6',
  '2
1 3
2
2 4',
  '2.5',
  'The merged array is [1,2,3,4] and the median is (2 + 3) / 2 = 2.5.',
  5000,
  256
),
(
  uuid_generate_v4(),
  'Palindromic Substrings',
  'palindromic-substrings',
  'Given a string s, return the number of palindromic substrings in it.

A string is a palindrome when it reads the same backward as forward.

A substring is a contiguous sequence of characters within the string.',
  'Medium',
  ARRAY['String', 'Dynamic Programming'],
  'A single line containing a string s.',
  'Output a single integer representing the number of palindromic substrings.',
  '• 1 ≤ s.length ≤ 1000
• s consists of lowercase English letters',
  'abc',
  '3',
  'Three palindromic strings: "a", "b", "c".',
  2000,
  256
)
ON CONFLICT (slug) DO NOTHING;

-- Get problem IDs for test cases
DO $$
DECLARE
    two_sum_id UUID;
    add_two_id UUID;
    longest_substr_id UUID;
    median_id UUID;
    palindromic_id UUID;
BEGIN
    -- Get problem IDs
    SELECT id INTO two_sum_id FROM public.problems WHERE slug = 'two-sum';
    SELECT id INTO add_two_id FROM public.problems WHERE slug = 'add-two-numbers';
    SELECT id INTO longest_substr_id FROM public.problems WHERE slug = 'longest-substring-without-repeating-characters';
    SELECT id INTO median_id FROM public.problems WHERE slug = 'median-of-two-sorted-arrays';
    SELECT id INTO palindromic_id FROM public.problems WHERE slug = 'palindromic-substrings';

    -- Test cases for Two Sum
    IF two_sum_id IS NOT NULL THEN
        INSERT INTO public.test_cases (problem_id, input, expected_output, is_sample, order_index) VALUES
        (two_sum_id, E'4\n2 7 11 15\n9', '0 1', true, 1),
        (two_sum_id, E'3\n3 2 4\n6', '1 2', false, 2),
        (two_sum_id, E'2\n3 3\n6', '0 1', false, 3),
        (two_sum_id, E'4\n-1 -2 -3 -4\n-6', '2 3', false, 4),
        (two_sum_id, E'5\n1 2 3 4 5\n8', '2 4', false, 5)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Test cases for Add Two Numbers
    IF add_two_id IS NOT NULL THEN
        INSERT INTO public.test_cases (problem_id, input, expected_output, is_sample, order_index) VALUES
        (add_two_id, E'2 4 3\n5 6 4', '7 0 8', true, 1),
        (add_two_id, E'0\n0', '0', false, 2),
        (add_two_id, E'9 9 9 9 9 9 9\n9 9 9 9', '8 9 9 9 0 0 0 1', false, 3),
        (add_two_id, E'2 4\n5 6 4', '7 0 5', false, 4)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Test cases for Longest Substring
    IF longest_substr_id IS NOT NULL THEN
        INSERT INTO public.test_cases (problem_id, input, expected_output, is_sample, order_index) VALUES
        (longest_substr_id, 'abcabcbb', '3', true, 1),
        (longest_substr_id, 'bbbbb', '1', false, 2),
        (longest_substr_id, 'pwwkew', '3', false, 3),
        (longest_substr_id, '', '0', false, 4),
        (longest_substr_id, 'au', '2', false, 5),
        (longest_substr_id, 'dvdf', '3', false, 6)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Test cases for Median of Two Sorted Arrays
    IF median_id IS NOT NULL THEN
        INSERT INTO public.test_cases (problem_id, input, expected_output, is_sample, order_index) VALUES
        (median_id, E'2\n1 3\n2\n2 4', '2.5', true, 1),
        (median_id, E'2\n1 2\n2\n3 4', '2.5', false, 2),
        (median_id, E'0\n\n1\n1', '1.0', false, 3),
        (median_id, E'1\n2\n0\n', '2.0', false, 4)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Test cases for Palindromic Substrings
    IF palindromic_id IS NOT NULL THEN
        INSERT INTO public.test_cases (problem_id, input, expected_output, is_sample, order_index) VALUES
        (palindromic_id, 'abc', '3', true, 1),
        (palindromic_id, 'aaa', '6', false, 2),
        (palindromic_id, 'aba', '4', false, 3),
        (palindromic_id, 'racecar', '10', false, 4),
        (palindromic_id, 'a', '1', false, 5)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
