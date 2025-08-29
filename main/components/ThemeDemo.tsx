"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ThemeToggle } from "./DarkModeToggle";

export function ThemeDemo() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Theme Demo</h2>
        <ThemeToggle />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Problem Statistics</CardTitle>
            <CardDescription>Your coding progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Easy Problems</span>
              <Badge variant="secondary">45/623</Badge>
            </div>
            <Progress value={72} className="w-full" />
            
            <div className="flex justify-between items-center">
              <span>Medium Problems</span>
              <Badge variant="secondary">32/523</Badge>
            </div>
            <Progress value={61} className="w-full" />
            
            <div className="flex justify-between items-center">
              <span>Hard Problems</span>
              <Badge variant="secondary">10/101</Badge>
            </div>
            <Progress value={10} className="w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Two Sum</span>
              <Badge className="bg-green-500 text-white">Accepted</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Add Two Numbers</span>
              <Badge className="bg-green-500 text-white">Accepted</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Longest Substring</span>
              <Badge variant="destructive">Wrong Answer</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Median of Arrays</span>
              <Badge className="bg-yellow-500 text-white">Time Limit</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Theme Controls</CardTitle>
            <CardDescription>Test interactive elements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full">Primary Button</Button>
            <Button variant="secondary" className="w-full">Secondary Button</Button>
            <Button variant="outline" className="w-full">Outline Button</Button>
            <Button variant="ghost" className="w-full">Ghost Button</Button>
            <div className="flex gap-2 flex-wrap">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Color Palette</CardTitle>
          <CardDescription>Theme color demonstration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="w-full h-12 bg-background border rounded"></div>
              <span className="text-xs">Background</span>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-card border rounded"></div>
              <span className="text-xs">Card</span>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-primary rounded"></div>
              <span className="text-xs">Primary</span>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-secondary rounded"></div>
              <span className="text-xs">Secondary</span>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-muted rounded"></div>
              <span className="text-xs">Muted</span>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-accent rounded"></div>
              <span className="text-xs">Accent</span>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-destructive rounded"></div>
              <span className="text-xs">Destructive</span>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 border rounded bg-gradient-to-r from-chart-1 to-chart-5"></div>
              <span className="text-xs">Charts</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
