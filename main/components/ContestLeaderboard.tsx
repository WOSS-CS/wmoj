import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { Trophy, Medal, Award, Clock, TrendingUp } from "lucide-react";
import { Contest } from "./Contest";

interface ContestLeaderboardProps {
  contest: Contest;
}

interface LeaderboardEntry {
  rank: number;
  participant: {
    id: string;
    name: string;
    school: string;
    avatar?: string;
  };
  totalScore: number;
  solvedProblems: number;
  problemScores: { [problemId: string]: number };
  lastSubmission: string;
  penalty: number;
}

export function ContestLeaderboard({ contest }: ContestLeaderboardProps) {
  // Mock detailed leaderboard data
  const leaderboard: LeaderboardEntry[] = [
    {
      rank: 1,
      participant: {
        id: "1",
        name: "Alex Chen",
        school: "Tech High School"
      },
      totalScore: 850,
      solvedProblems: 4,
      problemScores: {
        "WDO24-A": 100,
        "WDO24-B": 200,
        "WDO24-C": 300,
        "WDO24-D": 250,
        "WDO24-E": 0
      },
      lastSubmission: "2:34:21",
      penalty: 45
    },
    {
      rank: 2,
      participant: {
        id: "2", 
        name: "Sarah Kim",
        school: "Innovation Academy"
      },
      totalScore: 700,
      solvedProblems: 3,
      problemScores: {
        "WDO24-A": 100,
        "WDO24-B": 200,
        "WDO24-C": 0,
        "WDO24-D": 250,
        "WDO24-E": 150
      },
      lastSubmission: "1:58:45",
      penalty: 20
    },
    {
      rank: 3,
      participant: {
        id: "3",
        name: "Marcus Johnson",
        school: "Riverside Prep"
      },
      totalScore: 650,
      solvedProblems: 3,
      problemScores: {
        "WDO24-A": 100,
        "WDO24-B": 180,
        "WDO24-C": 270,
        "WDO24-D": 100,
        "WDO24-E": 0
      },
      lastSubmission: "3:12:10",
      penalty: 65
    },
    {
      rank: 4,
      participant: {
        id: "4",
        name: "Emma Rodriguez",
        school: "Central High"
      },
      totalScore: 600,
      solvedProblems: 3,
      problemScores: {
        "WDO24-A": 100,
        "WDO24-B": 200,
        "WDO24-C": 0,
        "WDO24-D": 200,
        "WDO24-E": 100
      },
      lastSubmission: "2:45:33",
      penalty: 30
    },
    {
      rank: 5,
      participant: {
        id: "5",
        name: "David Park",
        school: "Science Academy"
      },
      totalScore: 550,
      solvedProblems: 2,
      problemScores: {
        "WDO24-A": 100,
        "WDO24-B": 200,
        "WDO24-C": 250,
        "WDO24-D": 0,
        "WDO24-E": 0
      },
      lastSubmission: "1:23:18",
      penalty: 15
    }
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return null;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return "bg-yellow-500 text-white";
      case 2: return "bg-gray-400 text-white";
      case 3: return "bg-amber-600 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-yellow-600";
    if (percentage >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const totalMaxScore = contest.problems.reduce((sum, problem) => sum + problem.points, 0);

  return (
    <div className="space-y-6">
      {/* Leaderboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{contest.participants}</p>
                <p className="text-sm text-muted-foreground">Participants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{leaderboard[0]?.totalScore || 0}</p>
                <p className="text-sm text-muted-foreground">Top Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">2:25:34</p>
                <p className="text-sm text-muted-foreground">Time Left</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{Math.round((leaderboard.filter(entry => entry.solvedProblems > 0).length / contest.participants) * 100)}%</p>
                <p className="text-sm text-muted-foreground">Solved Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Live Rankings</CardTitle>
          <CardDescription>
            Current standings updated in real-time. Rankings are based on total score and submission time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
              <div className="col-span-1">Rank</div>
              <div className="col-span-3">Participant</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-1">Solved</div>
              <div className="col-span-3">Problem Scores</div>
              <div className="col-span-2">Last Submit</div>
            </div>

            {/* Leaderboard Entries */}
            {leaderboard.map((entry) => (
              <div key={entry.participant.id} className="grid grid-cols-12 gap-4 py-3 border-b last:border-b-0 hover:bg-muted/30 rounded-lg transition-colors">
                {/* Rank */}
                <div className="col-span-1 flex items-center gap-2">
                  {getRankIcon(entry.rank)}
                  <Badge className={getRankBadgeColor(entry.rank)}>
                    #{entry.rank}
                  </Badge>
                </div>

                {/* Participant */}
                <div className="col-span-3 flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={entry.participant.avatar} />
                    <AvatarFallback className="text-xs">{getInitials(entry.participant.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{entry.participant.name}</p>
                    <p className="text-sm text-muted-foreground">{entry.participant.school}</p>
                  </div>
                </div>

                {/* Score */}
                <div className="col-span-2 flex items-center">
                  <div>
                    <p className={`text-lg font-bold ${getScoreColor(entry.totalScore, totalMaxScore)}`}>
                      {entry.totalScore}
                    </p>
                    <Progress 
                      value={(entry.totalScore / totalMaxScore) * 100} 
                      className="w-24 h-2"
                    />
                  </div>
                </div>

                {/* Solved */}
                <div className="col-span-1 flex items-center">
                  <Badge variant="outline">
                    {entry.solvedProblems}/{contest.problems.length}
                  </Badge>
                </div>

                {/* Problem Scores */}
                <div className="col-span-3 flex items-center gap-1">
                  {contest.problems.map((problem, index) => {
                    const score = entry.problemScores[problem.id] || 0;
                    const isFullScore = score === problem.points;
                    const hasScore = score > 0;
                    
                    return (
                      <div
                        key={problem.id}
                        className={`w-8 h-8 rounded text-xs flex items-center justify-center font-medium ${
                          isFullScore 
                            ? 'bg-green-500 text-white' 
                            : hasScore 
                            ? 'bg-yellow-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                        title={`Problem ${String.fromCharCode(65 + index)}: ${score}/${problem.points} points`}
                      >
                        {String.fromCharCode(65 + index)}
                      </div>
                    );
                  })}
                </div>

                {/* Last Submission */}
                <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                  {entry.lastSubmission}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
