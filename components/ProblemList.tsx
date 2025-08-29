import { useState, useMemo } from "react";
import { Search, Filter, Check, X } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

interface Problem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  acceptance: number;
  tags: string[];
  solved: boolean;
  attempts: number;
}

const mockProblems: Problem[] = [
  { id: "1", title: "Two Sum", difficulty: "Easy", acceptance: 49.1, tags: ["Array", "Hash Table"], solved: true, attempts: 3 },
  { id: "2", title: "Add Two Numbers", difficulty: "Medium", acceptance: 36.8, tags: ["Linked List", "Math"], solved: true, attempts: 2 },
  { id: "3", title: "Longest Substring Without Repeating", difficulty: "Medium", acceptance: 33.8, tags: ["Hash Table", "String", "Sliding Window"], solved: false, attempts: 5 },
  { id: "4", title: "Median of Two Sorted Arrays", difficulty: "Hard", acceptance: 35.3, tags: ["Array", "Binary Search", "Divide and Conquer"], solved: false, attempts: 0 },
  { id: "5", title: "Longest Palindromic Substring", difficulty: "Medium", acceptance: 32.1, tags: ["String", "Dynamic Programming"], solved: true, attempts: 4 },
  { id: "6", title: "ZigZag Conversion", difficulty: "Medium", acceptance: 42.7, tags: ["String"], solved: false, attempts: 1 },
  { id: "7", title: "Reverse Integer", difficulty: "Medium", acceptance: 26.2, tags: ["Math"], solved: true, attempts: 2 },
  { id: "8", title: "String to Integer (atoi)", difficulty: "Medium", acceptance: 16.7, tags: ["String"], solved: false, attempts: 0 },
  { id: "9", title: "Palindrome Number", difficulty: "Easy", acceptance: 53.2, tags: ["Math"], solved: true, attempts: 1 },
  { id: "10", title: "Regular Expression Matching", difficulty: "Hard", acceptance: 27.9, tags: ["String", "Dynamic Programming", "Recursion"], solved: false, attempts: 0 },
];

interface ProblemListProps {
  onProblemSelect: (problem: Problem) => void;
}

export function ProblemList({ onProblemSelect }: ProblemListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredProblems = useMemo(() => {
    return mockProblems.filter(problem => {
      const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           problem.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDifficulty = difficultyFilter === "all" || problem.difficulty === difficultyFilter;
      const matchesStatus = statusFilter === "all" || 
                           (statusFilter === "solved" && problem.solved) ||
                           (statusFilter === "unsolved" && !problem.solved);
      
      return matchesSearch && matchesDifficulty && matchesStatus;
    });
  }, [searchTerm, difficultyFilter, statusFilter]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Hard": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search problems..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Problems</SelectItem>
                <SelectItem value="solved">Solved</SelectItem>
                <SelectItem value="unsolved">Unsolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Problems ({filteredProblems.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Acceptance</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProblems.map((problem) => (
                <TableRow 
                  key={problem.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onProblemSelect(problem)}
                >
                  <TableCell>
                    {problem.solved ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : problem.attempts > 0 ? (
                      <X className="w-4 h-4 text-red-600" />
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium">
                    {problem.id}. {problem.title}
                  </TableCell>
                  <TableCell>
                    <Badge className={getDifficultyColor(problem.difficulty)}>
                      {problem.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>{problem.acceptance}%</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {problem.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {problem.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{problem.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
