"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Play, Send, Clock, CheckCircle, XCircle, ExternalLink } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

interface CodeEditorProps {
  problemId: string
}

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
]

const DEFAULT_CODE = {
  python: `def solution():
    # Write your code here
    pass

# Test your solution
print(solution())`,
  javascript: `function solution() {
    // Write your code here
}

// Test your solution
console.log(solution());`,
  java: `public class Solution {
    public static void main(String[] args) {
        // Write your code here
    }
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your code here
    return 0;
}`,
  c: `#include <stdio.h>

int main() {
    // Write your code here
    return 0;
}`,
}

export function CodeEditor({ problemId }: CodeEditorProps) {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const contestSlug = searchParams.get("contest")

  const [language, setLanguage] = useState("python")
  const [code, setCode] = useState(DEFAULT_CODE.python)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [submissionResult, setSubmissionResult] = useState<{
    status: string
    runtime?: number
    memory?: number
    testCasesPassed?: number
    totalTestCases?: number
    error?: string
  } | null>(null)

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    setCode(DEFAULT_CODE[newLanguage as keyof typeof DEFAULT_CODE])
  }

  const handleSubmit = async () => {
    if (!user) return

    setIsSubmitting(true)
    setSubmissionResult(null)

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problemId,
          contestId: contestSlug ? contestSlug : null,
          language,
          code,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit")
      }

      setSubmissionId(data.submission.id)

      // Poll for result
      const pollResult = async () => {
        try {
          const resultResponse = await fetch(`/api/submissions/${data.submission.id}`)
          const resultData = await resultResponse.json()

          if (resultData.submission.status !== "pending") {
            const result = {
              status: resultData.submission.status,
              runtime: resultData.submission.runtime,
              memory: resultData.submission.memory_used,
              testCasesPassed: resultData.submission.test_cases_passed,
              totalTestCases: resultData.submission.total_test_cases,
              error: resultData.submission.error_message,
            }

            setSubmissionResult(result)
            setIsSubmitting(false)

            if (result.status === "accepted") {
              await fetch("/api/user-stats", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  problemId,
                  status: "solved",
                }),
              })
            }
          } else {
            setTimeout(pollResult, 1000)
          }
        } catch (error) {
          console.error("Polling error:", error)
          setIsSubmitting(false)
        }
      }

      setTimeout(pollResult, 1000)
    } catch (error) {
      console.error("Submission error:", error)
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800"
      case "wrong_answer":
      case "runtime_error":
      case "compilation_error":
        return "bg-red-100 text-red-800"
      case "time_limit_exceeded":
      case "memory_limit_exceeded":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-4 w-4" />
      case "wrong_answer":
      case "runtime_error":
      case "compilation_error":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Code Editor</CardTitle>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono text-sm min-h-[400px] resize-none"
            placeholder="Write your solution here..."
          />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Run
              </Button>
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting || !user}>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {submissionResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(submissionResult.status)}
                Submission Result
              </CardTitle>
              {submissionId && (
                <Button asChild size="sm" variant="outline" className="bg-transparent">
                  <Link href={`/submissions/${submissionId}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(submissionResult.status)}>
                  {submissionResult.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>

              {submissionResult.status === "accepted" && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="font-medium text-green-800">Runtime</div>
                    <div className="text-lg font-bold text-green-900">{submissionResult.runtime}ms</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="font-medium text-green-800">Memory</div>
                    <div className="text-lg font-bold text-green-900">
                      {Math.round((submissionResult.memory || 0) / 1024)}KB
                    </div>
                  </div>
                </div>
              )}

              {submissionResult.testCasesPassed !== undefined && (
                <div className="bg-muted rounded-md p-3">
                  <div className="text-sm font-medium mb-1">Test Cases</div>
                  <div className="text-lg font-bold">
                    {submissionResult.testCasesPassed} / {submissionResult.totalTestCases} passed
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        submissionResult.testCasesPassed === submissionResult.totalTestCases
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                      style={{
                        width: `${
                          ((submissionResult.testCasesPassed || 0) / (submissionResult.totalTestCases || 1)) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {submissionResult.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{submissionResult.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
