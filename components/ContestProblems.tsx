import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Lock, CheckCircle, Clock, Users } from "lucide-react";
import { Contest } from "./Contest";

interface ContestProblem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  points: number;
  solved: number;
  total: number;
}

interface ContestProblemsProps {
  contest: Contest;
  onProblemSelect: (problem: ContestProblem) => void;
  isRegistered: boolean;
}

export function ContestProblems({ contest, onProblemSelect, isRegistered }: ContestProblemsProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-500 hover:bg-green-600";
      case "Medium": return "bg-yellow-500 hover:bg-yellow-600";
      case "Hard": return "bg-red-500 hover:bg-red-600";
      default: return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const getDifficultyTextColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "text-green-700 dark:text-green-300";
      case "Medium": return "text-yellow-700 dark:text-yellow-300";
      case "Hard": return "text-red-700 dark:text-red-300";
      default: return "text-gray-700 dark:text-gray-300";
    }
  };

  const getSolveRate = (solved: number, total: number) => {
    return Math.round((solved / total) * 100);
  };

  // Mock solved status for demonstration
  const solvedProblems = new Set(["WDO24-A", "WDO24-B"]);

  if (!isRegistered) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contest Problems</CardTitle>
          <CardDescription>
            Register for the contest to view and solve problems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Registration Required</h3>
            <p className="text-muted-foreground mb-6">
              You need to register for this contest to access the problems
            </p>
            <Badge variant="outline" className="mb-4">
              {contest.problems.length} Problems Available
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Problems Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Contest Problems</CardTitle>
          <CardDescription>
            Solve all {contest.problems.length} problems to maximize your score. Problems are sorted by difficulty.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {contest.problems.filter(p => p.difficulty === "Easy").length}
              </div>
              <div className="text-sm text-muted-foreground">Easy Problems</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {contest.problems.filter(p => p.difficulty === "Medium").length}
              </div>
              <div className="text-sm text-muted-foreground">Medium Problems</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {contest.problems.filter(p => p.difficulty === "Hard").length}
              </div>
              <div className="text-sm text-muted-foreground">Hard Problems</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Problems List */}
      <div className="grid gap-4">
        {contest.problems.map((problem, index) => {
          const isSolved = solvedProblems.has(problem.id);
          const solveRate = getSolveRate(problem.solved, problem.total);
          
          return (
            <Card key={problem.id} className={`transition-all hover:shadow-md ${isSolved ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        {String.fromCharCode(65 + index)}
                      </div>
                      {isSolved && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium">{problem.title}</h3>
                        <Badge className={`${getDifficultyColor(problem.difficulty)} text-white`}>
                          {problem.difficulty}
                        </Badge>
                        <Badge variant="outline">
                          {problem.points} pts
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{problem.solved} / {problem.total} solved</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <Progress value={solveRate} className="h-2" />
                          </div>
                          <span>{solveRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {isSolved && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Solved
                      </Badge>
                    )}
                    <Button 
                      onClick={() => onProblemSelect(problem)}
                      variant={isSolved ? "outline" : "default"}
                    >
                      {isSolved ? "View Solution" : "Solve"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contest Timer */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200">Contest Timer</h4>
                <p className="text-sm text-blue-600 dark:text-blue-400">Time remaining in contest</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">2:25:34</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Hours remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
