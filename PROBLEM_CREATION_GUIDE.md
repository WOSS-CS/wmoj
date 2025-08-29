# Problem Creation System Guide

## Overview

The WMOJ platform now supports user-generated problems with comprehensive test case management and real-time code execution validation. Users can create their own programming problems and test them with our custom code execution API.

## Features

### Problem Creation
- **Rich Problem Details**: Title, description, difficulty, tags, constraints
- **Input/Output Formats**: Structured problem statement formatting
- **Sample Cases**: Example inputs and outputs with explanations
- **Time & Memory Limits**: Configurable execution constraints

### Test Case Management
- **Multiple Test Cases**: Support for unlimited test cases
- **Sample vs Hidden**: Mark test cases as sample (visible) or hidden
- **Point System**: Assign points to individual test cases
- **Custom Limits**: Override time/memory limits per test case

### Real-Time Testing
- **Code Testing**: Test solutions against sample inputs before publishing
- **Multi-Language Support**: Support for 15+ programming languages
- **Custom API Integration**: Real code execution and output comparison
- **Instant Feedback**: See execution results immediately

### Problem Management
- **Public/Private**: Control problem visibility
- **User Ownership**: Users own and can edit their problems
- **Slug Generation**: Automatic URL-friendly slug creation
- **Tag System**: Categorize problems with custom tags

## Database Schema

### New Tables

#### `test_cases`
```sql
CREATE TABLE test_cases (
  id UUID PRIMARY KEY,
  problem_id UUID REFERENCES problems(id),
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 1,
  time_limit INTEGER, -- inherits from problem if null
  memory_limit INTEGER, -- inherits from problem if null
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `supported_languages`
```sql
CREATE TABLE supported_languages (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  custom_api_id INTEGER, -- Custom API language ID
  display_name TEXT NOT NULL,
  file_extension TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Updated Tables

#### `problems` (new columns)
- `user_id`: Reference to problem creator
- `is_public`: Control problem visibility

## API Endpoints

### `POST /api/problems`
Create a new problem with test cases.

**Request Body:**
```json
{
  "title": "Two Sum",
  "slug": "two-sum",
  "description": "Given an array of integers...",
  "difficulty": "Easy",
  "tags": ["array", "hash-table"],
  "inputFormat": "First line contains...",
  "outputFormat": "Output the indices...",
  "constraints": "1 <= nums.length <= 10^4",
  "sampleInput": "2 7 11 15\n9",
  "sampleOutput": "0 1",
  "explanation": "nums[0] + nums[1] = 2 + 7 = 9",
  "timeLimit": 2000,
  "memoryLimit": 256,
  "testCases": [
    {
      "input": "2 7 11 15\n9",
      "expectedOutput": "0 1",
      "isSample": true,
      "points": 1
    }
  ]
}
```

**Response:**
```json
{
  "message": "Problem created successfully",
  "problem": {
    "id": "uuid",
    "title": "Two Sum",
    "slug": "two-sum",
    ...
  }
}
```

### `GET /api/problems`
Fetch problems with filtering and pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)
- `difficulty`: Filter by difficulty (Easy, Medium, Hard)
- `tags`: Comma-separated tags
- `search`: Search in title/description

## Components

### `ProblemCreator`
Main component for creating problems with tabbed interface:

1. **Problem Details**: Basic information, tags, limits
2. **Test Cases**: Manage input/output test cases
3. **Test Solution**: Write and test code against sample input
4. **Preview**: Review problem before publishing

**Key Features:**
- Auto-slug generation from title
- Dynamic test case management
- Real-time code testing with custom API
- Form validation and error handling

### Usage in Pages
```tsx
// app/problems/create/page.tsx
import { ProblemCreator } from "@/components/problems/problem-creator"

export default function CreateProblemPage() {
  return <ProblemCreator />
}
```

## Security & Permissions

### Row Level Security (RLS)
- **Public Problems**: Viewable by everyone
- **Private Problems**: Only viewable by creator
- **Problem Management**: Only creators can edit/delete their problems
- **Test Cases**: Inherit visibility from parent problem

### Authentication Requirements
- Users must be logged in to create problems
- User ID automatically assigned to created problems
- Profile setup required for problem creation

## Integration with Code Execution

### Custom API Integration
Problems created through this system automatically work with the existing code execution infrastructure:

1. **Test Case Validation**: Submissions are tested against all test cases
2. **Output Comparison**: Exact string matching with expected outputs
3. **Scoring System**: Points calculated based on passed test cases
4. **Time/Memory Limits**: Enforced per test case or problem default

### Code Editor Compatibility
Problems created through this system work seamlessly with the existing code editor:

- Automatic test case loading
- Sample input/output display
- Real-time testing against hidden test cases
- Submission scoring and feedback

## Getting Started

### 1. Access Problem Creation
- Navigate to `/problems`
- Click "Create Problem" button
- Must be logged in with valid profile

### 2. Fill Problem Details
- Enter title (auto-generates slug)
- Write comprehensive description
- Select difficulty level
- Add relevant tags
- Set time/memory limits

### 3. Create Test Cases
- Add multiple test cases
- Mark sample cases as visible
- Assign points to each test case
- Set custom limits if needed

### 4. Test Your Solution
- Write test code in preferred language
- Run against sample input
- Verify expected output
- Debug any issues

### 5. Preview & Publish
- Review complete problem statement
- Verify all test cases
- Publish problem (makes it public)

## Best Practices

### Problem Design
1. **Clear Description**: Write comprehensive problem statements
2. **Good Examples**: Provide clear sample inputs/outputs with explanations
3. **Appropriate Difficulty**: Match difficulty to problem complexity
4. **Comprehensive Testing**: Include edge cases and boundary conditions

### Test Case Design
1. **Sample Cases**: Include 1-2 sample cases that demonstrate the solution
2. **Edge Cases**: Test minimum/maximum inputs, empty cases, etc.
3. **Performance Cases**: Include large inputs to test time/space complexity
4. **Corner Cases**: Test special conditions specific to your problem

### Code Testing
1. **Test Early**: Use the test solution feature before publishing
2. **Multiple Languages**: Test with different programming languages
3. **Verify Output**: Ensure expected outputs match exactly (including whitespace)
4. **Performance Check**: Verify solutions run within time/memory limits

## Troubleshooting

### Common Issues

#### Slug Conflicts
- Error: "A problem with this slug already exists"
- Solution: Modify the title or manually edit the slug

#### Test Case Failures
- Issue: Code runs but doesn't match expected output
- Check: Whitespace, newlines, output format
- Solution: Use exact string matching, verify output format

#### Custom API Integration
- Issue: Code execution fails
- Check: `.env.local` configuration
- Verify: Custom API credentials and endpoints

#### Permission Errors
- Issue: Cannot create problems
- Check: User authentication status
- Verify: Profile setup completion

### Getting Help
- Check console logs for detailed error messages
- Verify database schema is up to date
- Ensure all environment variables are configured
- Test custom API integration separately if needed

## Future Enhancements

### Planned Features
- **Problem Editorials**: Allow authors to write solution explanations
- **Problem Ratings**: Community rating system
- **Problem Collections**: Group related problems
- **Advanced Testing**: Custom checkers, interactive problems
- **Collaboration**: Co-authors and problem review system

### API Extensions
- **Problem Analytics**: View statistics and solve rates
- **Bulk Operations**: Import/export problems
- **Version Control**: Problem revision history
- **Advanced Filtering**: More sophisticated search and filtering

This comprehensive problem creation system enables users to contribute high-quality programming problems to the WMOJ platform while maintaining the same level of functionality and user experience as built-in problems.
