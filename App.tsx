import { useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ProblemList } from "./components/ProblemList";
import { ProblemDetail } from "./components/ProblemDetail";
import { Dashboard } from "./components/Dashboard";
import { Contest } from "./components/Contest";

interface Problem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  acceptance: number;
  tags: string[];
  solved: boolean;
  attempts: number;
}

export default function App() {
  const [activeSection, setActiveSection] = useState("problems");
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [showContest, setShowContest] = useState(false);

  const handleProblemSelect = (problem: Problem) => {
    setSelectedProblem(problem);
  };

  const handleBackToProblemList = () => {
    setSelectedProblem(null);
  };

  const renderMainContent = () => {
    if (showContest) {
      return <Contest onBack={() => setShowContest(false)} />;
    }

    if (selectedProblem) {
      return (
        <ProblemDetail 
          problem={selectedProblem} 
          onBack={handleBackToProblemList}
        />
      );
    }

    switch (activeSection) {
      case "problems":
        return <ProblemList onProblemSelect={handleProblemSelect} />;
      case "contests":
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-3xl font-bold mb-4">Programming Contests</h2>
              <p className="text-muted-foreground mb-8">Compete with other programmers in algorithmic challenges</p>
            </div>
            
            <div className="grid gap-6">
              <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowContest(true)}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Woss Dual Olympiad 2024</h3>
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">Live</span>
                </div>
                <p className="text-muted-foreground mb-4">A prestigious programming competition featuring challenging algorithmic problems for high school students.</p>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span>📅 Dec 15, 2024</span>
                  <span>⏱️ 5 hours</span>
                  <span>👥 247/500 participants</span>
                  <span>🏆 5 problems</span>
                </div>
              </div>
              
              <div className="bg-card border rounded-lg p-6 opacity-60">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Winter Programming Challenge</h3>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Upcoming</span>
                </div>
                <p className="text-muted-foreground mb-4">Get ready for the winter challenge with advanced data structures and algorithms.</p>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span>📅 Jan 20, 2025</span>
                  <span>⏱️ 4 hours</span>
                  <span>👥 0/300 participants</span>
                  <span>🏆 6 problems</span>
                </div>
              </div>
            </div>
          </div>
        );
      case "submissions":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">My Submissions</h2>
            <p className="text-muted-foreground">Submissions history coming soon!</p>
          </div>
        );
      case "statistics":
        return <Dashboard />;
      case "profile":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Profile</h2>
            <p className="text-muted-foreground">Profile management coming soon!</p>
          </div>
        );
      case "calendar":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Calendar</h2>
            <p className="text-muted-foreground">Contest calendar coming soon!</p>
          </div>
        );
      case "learn":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Learn</h2>
            <p className="text-muted-foreground">Learning resources coming soon!</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
        />
        <main className="flex-1 p-6 max-w-[calc(100vw-16rem)] overflow-auto">
          <div className="max-w-7xl mx-auto">
            {renderMainContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
