# Code Execution System

This document describes the comprehensive code execution and submission system implemented for the online judge platform.

## Overview

The system provides a complete code editor with support for multiple programming languages, real-time code execution, comprehensive submission judging, and detailed feedback to users.

## Features

### Code Editor
- **Multi-language Support**: Python, JavaScript, Java, C++, C, Go, Rust, Kotlin, Swift, C#
- **Syntax Highlighting**: Monospace font with proper formatting
- **Auto-save**: Code is automatically saved to localStorage
- **File Operations**: Upload/Download code files
- **Reset Functionality**: Reset to default template
- **Copy to Clipboard**: Easy code sharing

### Code Execution
- **Run & Test**: Execute code with custom input
- **Sample Input**: Quick testing with provided sample inputs
- **Real-time Output**: See execution results immediately
- **Error Handling**: Detailed error messages for compilation and runtime errors

### Submission System
- **Comprehensive Judging**: Test against multiple test cases
- **Detailed Results**: Runtime, memory usage, test case breakdown
- **Status Tracking**: Real-time submission status updates
- **Score Calculation**: Point-based scoring system

## Architecture

### Components

#### CodeEditor (`/components/problems/code-editor.tsx`)
The main code editor component with three tabs:
- **Code Editor**: Write and edit solutions
- **Run & Test**: Execute code with custom input
- **Submit**: Submit solutions for judging

#### Judge Service (`/lib/judge/index.ts`)
Core judging functionality:
- Code execution simulation
- Test case management
- Result aggregation
- Error handling

#### API Routes
- `/api/code/run`: Execute code with input
- `/api/submissions`: Submit solutions for judging
- `/api/submissions/[id]`: Get submission details
- `/api/languages`: Get supported languages

### Database Schema

#### Test Cases (`test_cases`)
```sql
- id: UUID (Primary Key)
- problem_id: UUID (Foreign Key to problems)
- input: TEXT (Test input)
- expected_output: TEXT (Expected output)
- is_sample: BOOLEAN (Whether it's a sample test case)
- points: INTEGER (Points awarded for passing)
- time_limit: INTEGER (Time limit in milliseconds)
- memory_limit: INTEGER (Memory limit in MB)
- order_index: INTEGER (Execution order)
```

#### Submissions (`submissions`)
```sql
- id: UUID (Primary Key)
- problem_id: UUID (Foreign Key)
- user_id: UUID (Foreign Key)
- language: TEXT (Programming language)
- code: TEXT (Source code)
- status: TEXT (accepted, wrong_answer, etc.)
- runtime: INTEGER (Execution time in ms)
- memory_used: INTEGER (Memory usage in KB)
- test_cases_passed: INTEGER
- total_test_cases: INTEGER
- score: INTEGER (0-100)
- error_message: TEXT
- test_case_results: JSONB (Detailed results)
- submitted_at: TIMESTAMP
```

#### Supported Languages (`supported_languages`)
```sql
- id: UUID (Primary Key)
- name: TEXT (Language identifier)
- display_name: TEXT (Human-readable name)
- version: TEXT (Language version)
- file_extension: TEXT (File extension)
- default_code: TEXT (Template code)
- time_multiplier: DECIMAL (Language-specific time adjustment)
- memory_multiplier: DECIMAL (Language-specific memory adjustment)
- is_active: BOOLEAN
```

## Language Support

### Current Languages
1. **Python 3.9** - Fast prototyping, easy syntax
2. **JavaScript (Node.js 18)** - Web development, scripting
3. **Java 17** - Enterprise applications, OOP
4. **C++ 17** - High performance, competitive programming
5. **C 11** - System programming, low-level control
6. **Go 1.19** - Concurrent programming, web services
7. **Rust 1.65** - Memory safety, system programming
8. **Kotlin 1.7** - Android development, JVM interop
9. **Swift 5.7** - iOS development, modern syntax
10. **C# .NET 6** - Windows development, enterprise

### Language Configuration
Each language has specific configurations:
- **Execution timeout**: Language-specific time limits
- **Memory limits**: Appropriate memory constraints
- **Compilation steps**: For compiled languages
- **Template code**: Starter code templates

## Execution Flow

### Code Execution (Run & Test)
1. User writes code in the editor
2. Clicks "Run Code" with optional custom input
3. Code is sent to `/api/code/run`
4. Judge service executes code with input
5. Results (output, errors, runtime) are returned
6. Results displayed in the UI

### Solution Submission
1. User completes their solution
2. Clicks "Submit Solution"
3. Code is sent to `/api/submissions`
4. Submission record created with "pending" status
5. Judge service runs code against all test cases
6. Results aggregated and submission updated
7. User sees real-time status updates
8. Final results with detailed feedback

### Test Case Execution
1. Fetch test cases from database for the problem
2. Execute code against each test case sequentially
3. Track runtime, memory usage, and correctness
4. Stop on first critical error (compilation, runtime)
5. Continue through all test cases for wrong answers
6. Calculate final score and status

## Mock Execution System

Since we're in development, the system uses sophisticated mocking:

### Pattern Recognition
- **Two Sum**: Recognizes array input patterns
- **String Problems**: Handles palindrome and substring problems
- **Mathematical Problems**: Processes numerical inputs
- **Graph Problems**: Supports adjacency list formats

### Error Simulation
- **Compilation Errors**: Triggered by specific code patterns
- **Runtime Errors**: Simulated crashes and exceptions
- **Time Limit Exceeded**: For infinite loops or slow algorithms
- **Memory Limit Exceeded**: For memory-intensive operations
- **Wrong Answer**: Realistic failure scenarios

### Realistic Metrics
- **Runtime**: 50ms to 5000ms based on language and complexity
- **Memory Usage**: 1MB to 256MB with realistic patterns
- **Success Rates**: 85% success rate for valid code
- **Language Variations**: Different performance characteristics

## Production Considerations

### Real Code Execution
For production deployment, replace the mock execution with:
- **Docker Containers**: Isolated execution environments
- **Security Sandbox**: chroot, seccomp, resource limits
- **Queue System**: Redis/RabbitMQ for submission processing
- **Judge Servers**: Distributed judging infrastructure
- **Code Analysis**: Static analysis and security scanning

### Performance Optimization
- **Caching**: Cache compilation results and test cases
- **Parallel Execution**: Run test cases in parallel
- **Resource Management**: CPU and memory quotas
- **Rate Limiting**: Prevent abuse and ensure fairness

### Security Measures
- **Code Sanitization**: Remove dangerous system calls
- **Network Isolation**: No internet access during execution
- **File System Limits**: Restricted file operations
- **Time Limits**: Prevent resource exhaustion
- **Input Validation**: Sanitize all user inputs

## Usage Examples

### Basic Problem Solving
```python
# Python example for Two Sum problem
def solve():
    n = int(input())
    nums = list(map(int, input().split()))
    target = int(input())
    
    for i in range(n):
        for j in range(i + 1, n):
            if nums[i] + nums[j] == target:
                print(i, j)
                return

solve()
```

### Advanced Features
```cpp
// C++ example with optimizations
#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n, target;
    cin >> n;
    vector<int> nums(n);
    unordered_map<int, int> seen;
    
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }
    cin >> target;
    
    for (int i = 0; i < n; i++) {
        int complement = target - nums[i];
        if (seen.count(complement)) {
            cout << seen[complement] << " " << i << endl;
            return 0;
        }
        seen[nums[i]] = i;
    }
    
    return 0;
}
```

## Troubleshooting

### Common Issues
1. **Compilation Errors**: Check syntax and language-specific requirements
2. **Runtime Errors**: Validate input handling and edge cases
3. **Time Limit Exceeded**: Optimize algorithm complexity
4. **Memory Limit Exceeded**: Reduce memory usage and optimize data structures
5. **Wrong Answer**: Review problem requirements and test with sample inputs

### Debug Tips
- Use the "Run & Test" feature with sample inputs
- Check edge cases and boundary conditions
- Verify input/output format matches requirements
- Test with custom inputs to isolate issues

## Future Enhancements

### Planned Features
- **Code Templates**: Pre-filled solution templates
- **Hints System**: Progressive hints for stuck users
- **Code Comparison**: Compare solutions with optimal approaches
- **Performance Analytics**: Detailed performance metrics
- **Collaborative Editing**: Real-time code sharing
- **IDE Integration**: VS Code extension support

### Advanced Judging
- **Special Judges**: Custom evaluation for approximate solutions
- **Interactive Problems**: Two-way communication during execution
- **Partial Scoring**: Credit for partially correct solutions
- **Multiple Solutions**: Accept multiple correct approaches
- **Stress Testing**: Automated test case generation

This comprehensive code execution system provides a robust foundation for competitive programming and educational coding platforms, with room for future expansion and production deployment.
