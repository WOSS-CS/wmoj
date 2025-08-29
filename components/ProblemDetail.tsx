import { useState } from "react";
import { ArrowLeft, Play, RotateCcw, Clock, Award, Users, BookOpen } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";

interface Problem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  acceptance: number;
  tags: string[];
  solved: boolean;
  attempts: number;
}

interface ProblemDetailProps {
  problem: Problem;
  onBack: () => void;
}

const problemDescription = {
  "1": {
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
      }
    ],
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "-10⁹ ≤ nums[i] ≤ 10⁹",
      "-10⁹ ≤ target ≤ 10⁹",
      "Only one valid answer exists."
    ]
  }
};

export function ProblemDetail({ problem, onBack }: ProblemDetailProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [code, setCode] = useState(`def twoSum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # Your solution here
    pass`);

  const detail = problemDescription[problem.id as keyof typeof problemDescription] || {
    description: "Problem description not available.",
    examples: [],
    constraints: []
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Hard": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const languages = [
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "javascript", label: "JavaScript" },
    { value: "go", label: "Go" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{problem.id}. {problem.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getDifficultyColor(problem.difficulty)}>
              {problem.difficulty}
            </Badge>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                {problem.acceptance}% acceptance
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {Math.floor(Math.random() * 1000) + 500} submissions
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Problem Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{detail.description}</p>
              
              <div className="flex flex-wrap gap-2">
                {problem.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detail.examples.map((example, index) => (
                <div key={index} className="space-y-2">
                  <h4 className="font-medium">Example {index + 1}:</h4>
                  <div className="bg-muted/50 p-3 rounded-md space-y-1 text-sm font-mono">
                    <div><strong>Input:</strong> {example.input}</div>
                    <div><strong>Output:</strong> {example.output}</div>
                    {example.explanation && (
                      <div><strong>Explanation:</strong> {example.explanation}</div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Constraints</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {detail.constraints.map((constraint, index) => (
                  <li key={index}>• {constraint}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Code Editor</span>
                <div className="flex items-center gap-2">
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Write your solution here..."
              />
              
              <div className="flex items-center gap-2 mt-4">
                <Button className="flex-1">
                  <Play className="w-4 h-4 mr-2" />
                  Run Code
                </Button>
                <Button variant="outline" className="flex-1">
                  Submit Solution
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="text-green-600 font-medium">Ready to run</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Runtime:</span>
                  <span>-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memory:</span>
                  <span>-</span>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="text-sm text-muted-foreground">
                Click "Run Code" to test your solution with the provided examples.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
