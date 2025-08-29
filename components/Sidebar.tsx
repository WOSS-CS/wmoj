import { useState } from "react";
import { Code, Trophy, FileText, BarChart3, User, Calendar, BookOpen } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const menuItems = [
    { id: "problems", label: "Problems", icon: Code, count: 1247 },
    { id: "contests", label: "Contests", icon: Trophy, count: 23 },
    { id: "submissions", label: "Submissions", icon: FileText, count: 156 },
    { id: "statistics", label: "Statistics", icon: BarChart3 },
    { id: "profile", label: "Profile", icon: User },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "learn", label: "Learn", icon: BookOpen },
  ];

  return (
    <aside className="w-64 border-r bg-card/30 h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => onSectionChange(item.id)}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count && (
                  <Badge variant="secondary" className="text-xs">
                    {item.count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </nav>

        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Quick Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Solved</span>
              <span className="font-medium">87/1247</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Acceptance</span>
              <span className="font-medium">76.3%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ranking</span>
              <span className="font-medium">#142</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
