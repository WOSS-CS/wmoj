import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Trophy, Users, Clock, Calendar, ArrowLeft } from "lucide-react";
import { ContestRegistration } from "./ContestRegistration";
import { ContestProblems } from "./ContestProblems";
import { ContestSubmission } from "./ContestSubmission";
import { ContestLeaderboard } from "./ContestLeaderboard";

interface ContestProblem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  points: number;
  solved: number;
  total: number;
}

interface Participant {
  id: string;
  name: string;
  school: string;
  rank: number;
  totalScore: number;
  solvedProblems: number;
  lastSubmission: string;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: string;
  status: "upcoming" | "active" | "ended";
  participants: number;
  maxParticipants: number;
  problems: ContestProblem[];
  registeredParticipants: Participant[];
}

interface ContestProps {
  onBack: () => void;
}

export function Contest({ onBack }: ContestProps) {
  const [selectedProblem, setSelectedProblem] = useState<ContestProblem | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  // Mock contest data
  const contest: Contest = {
    id: "woss-dual-olympiad-2024",
    title: "Woss Dual Olympiad 2024",
    description: "A prestigious programming competition featuring challenging algorithmic problems for high school students. Test your skills in data structures, dynamic programming, and mathematical problem solving.",
    startTime: "2024-12-15T10:00:00Z",
    endTime: "2024-12-15T15:00:00Z",
    duration: "5 hours",
    status: "active",
    participants: 247,
    maxParticipants: 500,
    problems: [
      {
        id: "WDO24-A",
        title: "Array Harmony",
        difficulty: "Easy",
        points: 100,
        solved: 156,
        total: 247
      },
      {
        id: "WDO24-B", 
        title: "Graph Traversal Challenge",
        difficulty: "Medium",
        points: 200,
        solved: 89,
        total: 247
      },
      {
        id: "WDO24-C",
        title: "Dynamic Programming Mastery",
        difficulty: "Hard",
        points: 300,
        solved: 23,
        total: 247
      },
      {
        id: "WDO24-D",
        title: "Mathematical Sequences",
        difficulty: "Medium", 
        points: 250,
        solved: 67,
        total: 247
      },
      {
        id: "WDO24-E",
        title: "Tree Optimization",
        difficulty: "Hard",
        points: 400,
        solved: 12,
        total: 247
      }
    ],
    registeredParticipants: [
      {
        id: "1",
        name: "Alex Chen",
        school: "Tech High School",
        rank: 1,
        totalScore: 850,
        solvedProblems: 4,
        lastSubmission: "2:34:21"
      },
      {
        id: "2", 
        name: "Sarah Kim",
        school: "Innovation Academy",
        rank: 2,
        totalScore: 700,
        solvedProblems: 3,
        lastSubmission: "1:58:45"
      },
      {
        id: "3",
        name: "Marcus Johnson", 
        school: "Riverside Prep",
        rank: 3,
        totalScore: 650,
        solvedProblems: 3,
        lastSubmission: "3:12:10"
      }
    ]
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-blue-500";
      case "active": return "bg-green-500 animate-pulse";
      case "ended": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "upcoming": return "Upcoming";
      case "active": return "Live";
      case "ended": return "Ended";
      default: return "Unknown";
    }
  };

  if (selectedProblem) {
    return (
      <ContestSubmission 
        contest={contest}
        problem={selectedProblem}
        onBack={() => setSelectedProblem(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Contests
        </Button>
      </div>

      {/* Contest Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-3xl">{contest.title}</CardTitle>
                <Badge className={`${getStatusColor(contest.status)} text-white`}>
                  {getStatusText(contest.status)}
                </Badge>
              </div>
              <CardDescription className="text-base max-w-2xl">
                {contest.description}
              </CardDescription>
            </div>
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Dec 15, 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{contest.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{contest.participants}/{contest.maxParticipants} participants</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{contest.problems.length} problems</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Contest Content */}
      <Tabs defaultValue={isRegistered ? "problems" : "register"} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="register">Registration</TabsTrigger>
          <TabsTrigger value="problems">Problems</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="submissions">My Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <ContestRegistration 
            contest={contest} 
            isRegistered={isRegistered}
            onRegister={() => setIsRegistered(true)}
          />
        </TabsContent>

        <TabsContent value="problems">
          <ContestProblems 
            contest={contest}
            onProblemSelect={setSelectedProblem}
            isRegistered={isRegistered}
          />
        </TabsContent>

        <TabsContent value="leaderboard">
          <ContestLeaderboard contest={contest} />
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>My Submissions</CardTitle>
              <CardDescription>
                Track your submission history for this contest
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRegistered ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No submissions yet. Start solving problems!</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">You need to register for this contest to view submissions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
