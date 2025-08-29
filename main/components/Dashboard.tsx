import { TrendingUp, Calendar, Award, Target, Clock, Code } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SpinningDuck } from "./SpinningDuck";

const recentSubmissions = [
  { id: "1", problem: "Two Sum", status: "Accepted", time: "2 hours ago", runtime: "52ms" },
  { id: "2", problem: "Add Two Numbers", status: "Accepted", time: "1 day ago", runtime: "68ms" },
  { id: "3", problem: "Longest Substring", status: "Wrong Answer", time: "2 days ago", runtime: "-" },
  { id: "4", problem: "Median of Arrays", status: "Time Limit", time: "3 days ago", runtime: "-" },
];

const difficultyStats = [
  { level: "Easy", solved: 45, total: 623, percentage: 7.2 },
  { level: "Medium", solved: 32, total: 523, percentage: 6.1 },
  { level: "Hard", solved: 10, total: 101, percentage: 9.9 },
];

export function Dashboard() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Accepted": return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "Wrong Answer": return "text-red-600 bg-red-50 dark:bg-red-900/20";
      case "Time Limit": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "Easy": return "text-green-600";
      case "Medium": return "text-yellow-600";
      case "Hard": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
        <SpinningDuck 
          size="lg" 
          speed="slow" 
          className="absolute top-4 right-4 opacity-60 hover:opacity-100 z-10 animate-float" 
        />
        <CardContent className="relative p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Welcome back, John!</h1>
              <p className="text-muted-foreground mb-4">
                Ready to solve some challenging problems today?
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span>Rank #142</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span>87 Problems Solved</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>76.3% Acceptance Rate</span>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-64 h-32 lg:h-40 rounded-lg overflow-hidden">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1733412505442-36cfa59a4240?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9ncmFtbWluZyUyMGNvZGUlMjBkYXJrfGVufDF8fHx8MTc1NjQyMjc4NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Programming workspace"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">87</p>
                  <p className="text-xs text-muted-foreground">Solved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">#142</p>
                  <p className="text-xs text-muted-foreground">Ranking</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">76.3%</p>
                  <p className="text-xs text-muted-foreground">Acceptance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">23</p>
                  <p className="text-xs text-muted-foreground">Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Last solved: 2 hours ago
            </div>
            <div className="text-sm text-muted-foreground">
              Current streak: 23 days
            </div>
            <div className="text-sm text-muted-foreground">
              Next contest: Tomorrow 7:00 PM
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Progress by Difficulty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {difficultyStats.map((stat) => (
              <div key={stat.level} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`font-medium ${getDifficultyColor(stat.level)}`}>
                    {stat.level}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stat.solved}/{stat.total}
                  </span>
                </div>
                <Progress value={stat.percentage} className="h-2" />
                <div className="text-xs text-muted-foreground text-right">
                  {stat.percentage}% solved
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{submission.problem}</p>
                    <p className="text-xs text-muted-foreground">{submission.time}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={`text-xs ${getStatusColor(submission.status)}`}>
                      {submission.status}
                    </Badge>
                    {submission.runtime !== "-" && (
                      <p className="text-xs text-muted-foreground mt-1">{submission.runtime}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
