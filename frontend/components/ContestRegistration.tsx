import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { CheckCircle, Users, Clock, Trophy, AlertCircle } from "lucide-react";
import { Contest } from "./Contest";

interface ContestRegistrationProps {
  contest: Contest;
  isRegistered: boolean;
  onRegister: () => void;
}

export function ContestRegistration({ contest, isRegistered, onRegister }: ContestRegistrationProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    school: "",
    grade: "",
    experience: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate registration process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    onRegister();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isRegistered) {
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <CardTitle className="text-green-800 dark:text-green-200">Registration Confirmed!</CardTitle>
                <CardDescription className="text-green-600 dark:text-green-400">
                  You are successfully registered for the Woss Dual Olympiad 2024
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">Participant ID: #247</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">Registered: Just now</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">Ready to compete!</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contest Guidelines</CardTitle>
            <CardDescription>Important information for participants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium">Competition Rules</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Contest duration: 5 hours</li>
                  <li>• 5 problems with varying difficulty</li>
                  <li>• Submit solutions in C++, Python, or Java</li>
                  <li>• Partial scoring available for some problems</li>
                  <li>• No external resources allowed</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">Scoring System</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Easy problems: 100-150 points</li>
                  <li>• Medium problems: 200-250 points</li>
                  <li>• Hard problems: 300-400 points</li>
                  <li>• Time penalty: -1 point per minute</li>
                  <li>• Wrong submission penalty: -20 points</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Registration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Contest Registration</CardTitle>
          <CardDescription>
            Join the Woss Dual Olympiad 2024 and compete with top programmers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  {contest.participants} / {contest.maxParticipants} registered
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {contest.maxParticipants - contest.participants} spots remaining
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Registration Open
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle>Registration Form</CardTitle>
          <CardDescription>
            Please fill out the information below to register for the contest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="your.email@school.edu"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school">School / Institution *</Label>
                <Input
                  id="school"
                  value={formData.school}
                  onChange={(e) => handleInputChange("school", e.target.value)}
                  placeholder="Your school name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade Level *</Label>
                <Input
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => handleInputChange("grade", e.target.value)}
                  placeholder="e.g., Grade 11, 12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Programming Experience (Optional)</Label>
              <Textarea
                id="experience"
                value={formData.experience}
                onChange={(e) => handleInputChange("experience", e.target.value)}
                placeholder="Brief description of your programming background and contest experience..."
                rows={3}
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Before registering, please note:</p>
                <ul className="space-y-1">
                  <li>• Make sure you can participate for the full 5-hour duration</li>
                  <li>• You'll need a stable internet connection</li>
                  <li>• Ensure you have a supported programming environment ready</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!formData.fullName || !formData.email || !formData.school || !formData.grade || isSubmitting}
                className="min-w-32"
              >
                {isSubmitting ? "Registering..." : "Register for Contest"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
