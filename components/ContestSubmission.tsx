import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { ArrowLeft, Clock, Trophy, Upload, CheckCircle, XCircle } from "lucide-react";
import { Contest } from "./Contest";

interface ContestProblem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  points: number;
  solved: number;
  total: number;
}

interface ContestSubmissionProps {
  contest: Contest;
  problem: ContestProblem;
  onBack: () => void;
}

interface Submission {
  id: string;
  timestamp: string;
  language: string;
  status: "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | "Runtime Error";
  score: number;
  executionTime: string;
}

export function ContestSubmission({ contest, problem, onBack }: ContestSubmissionProps) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([
    {
      id: "1",
      timestamp: "14:32:15",
      language: "C++",
      status: "Wrong Answer",
      score: 40,
      executionTime: "0.12s"
    },
    {
      id: "2", 
      timestamp: "14:25:03",
      language: "C++",
      status: "Time Limit Exceeded",
      score: 20,
      executionTime: "> 2.00s"
    }
  ]);

  const problemStatement = {
    "WDO24-A": {
      title: "Array Harmony",
      statement: `Given an array of integers, find the minimum number of operations needed to make all elements equal. In one operation, you can increase or decrease any element by 1.

**Input Format:**
- First line contains an integer n (1 ≤ n ≤ 10^5), the size of the array
- Second line contains n integers a_i (-10^9 ≤ a_i ≤ 10^9)

**Output Format:**
- Print a single integer, the minimum number of operations needed

**Sample Input:**
\`\`\`
5
1 2 3 4 5
\`\`\`

**Sample Output:**
\`\`\`
6
\`\`\`

**Explanation:**
To make all elements equal to 3, we need:
- Element 1: 2 operations (1 → 3)
- Element 2: 1 operation (2 → 3)
- Element 3: 0 operations (already 3)
- Element 4: 1 operation (4 → 3)  
- Element 5: 2 operations (5 → 3)
Total: 2 + 1 + 0 + 1 + 2 = 6 operations`,
      constraints: [
        "1 ≤ n ≤ 10^5",
        "-10^9 ≤ a_i ≤ 10^9",
        "Time limit: 2 seconds",
        "Memory limit: 256 MB"
      ]
    },
    "WDO24-B": {
      title: "Graph Traversal Challenge", 
      statement: `You are given an undirected graph with n vertices and m edges. Find the shortest path between two given vertices using BFS.

**Input Format:**
- First line contains integers n, m, start, end
- Next m lines contain two integers u, v representing an edge

**Output Format:**
- Print the length of shortest path, or -1 if no path exists

**Sample Input:**
\`\`\`
5 6 1 5
1 2
2 3
3 4
4 5
1 3
2 4
\`\`\`

**Sample Output:**
\`\`\`
3
\`\`\``,
      constraints: [
        "1 ≤ n ≤ 10^4",
        "1 ≤ m ≤ 10^5", 
        "Time limit: 3 seconds",
        "Memory limit: 256 MB"
      ]
    }
  };

  const currentProblem = problemStatement[problem.id as keyof typeof problemStatement] || {
    title: problem.title,
    statement: "Problem statement will be available during the contest.",
    constraints: ["Time limit: 2 seconds", "Memory limit: 256 MB"]
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulate submission processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newSubmission: Submission = {
      id: String(submissions.length + 1),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      language: language === "cpp" ? "C++" : language === "python" ? "Python" : "Java",
      status: Math.random() > 0.3 ? "Accepted" : "Wrong Answer",
      score: Math.random() > 0.3 ? 100 : Math.floor(Math.random() * 80),
      executionTime: `${(Math.random() * 2).toFixed(2)}s`
    };
    
    setSubmissions(prev => [newSubmission, ...prev]);
    setIsSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Accepted": return "text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800";
      case "Wrong Answer": return "text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800";
      case "Time Limit Exceeded": return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800";
      case "Runtime Error": return "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800";
      default: return "text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Accepted": return <CheckCircle className="w-4 h-4" />;
      case "Wrong Answer": 
      case "Time Limit Exceeded":
      case "Runtime Error": 
        return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Problems
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Badge className="bg-blue-600 text-white">
            <Clock className="w-3 h-3 mr-1" />
            2:25:34 remaining
          </Badge>
          <Badge variant="outline">
            <Trophy className="w-3 h-3 mr-1" />
            {problem.points} points
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problem Statement */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle>{currentProblem.title}</CardTitle>
                <Badge className={
                  problem.difficulty === "Easy" ? "bg-green-500" :
                  problem.difficulty === "Medium" ? "bg-yellow-500" : "bg-red-500"
                }>
                  {problem.difficulty}
                </Badge>
              </div>
              <CardDescription>Problem {problem.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {currentProblem.statement}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Constraints</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {currentProblem.constraints.map((constraint, index) => (
                  <li key={index} className="text-muted-foreground">• {constraint}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Code Editor and Submissions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Solution</CardTitle>
              <CardDescription>Write your solution and submit it for judging</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Programming Language</label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpp">C++17</SelectItem>
                    <SelectItem value="python">Python 3.11</SelectItem>
                    <SelectItem value="java">Java 17</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Source Code</label>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={
                    language === "cpp" ? 
                    "#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}" :
                    language === "python" ?
                    "# Your Python solution here\n\n" :
                    "public class Solution {\n    public static void main(String[] args) {\n        // Your Java solution here\n    }\n}"
                  }
                  className="font-mono text-sm min-h-[300px]"
                />
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={!code.trim() || isSubmitting}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isSubmitting ? "Submitting..." : "Submit Solution"}
              </Button>
            </CardContent>
          </Card>

          {/* Submissions History */}
          <Card>
            <CardHeader>
              <CardTitle>Submission History</CardTitle>
              <CardDescription>Your previous submissions for this problem</CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No submissions yet
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs border ${getStatusColor(submission.status)}`}>
                          {getStatusIcon(submission.status)}
                          {submission.status}
                        </div>
                        <span className="text-sm text-muted-foreground">{submission.language}</span>
                        <span className="text-sm text-muted-foreground">{submission.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span>{submission.score}/100</span>
                        <span className="text-muted-foreground">{submission.executionTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
