"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Send, Clock, CheckCircle, XCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

interface CodeEditorProps {
  problemId: string
  problem?: {
    title: string
    time_limit?: number
    memory_limit?: number
  }
}

const LANGUAGES = [
  { value: "python", label: "Python 3.9", extension: "py" },
  { value: "javascript", label: "Node.js 18", extension: "js" },
  { value: "java", label: "Java 17", extension: "java" },
  { value: "cpp", label: "C++ 17", extension: "cpp" },
  { value: "c", label: "C 11", extension: "c" },
  { value: "go", label: "Go 1.19", extension: "go" },
  { value: "rust", label: "Rust 1.65", extension: "rs" },
  { value: "kotlin", label: "Kotlin 1.7", extension: "kt" },
  { value: "swift", label: "Swift 5.7", extension: "swift" },
  { value: "csharp", label: "C# 10", extension: "cs" },
]

const DEFAULT_CODE = {
  python: `def solve():
    """
    Write your solution here
    Read from stdin and write to stdout
    """
    # Example: read input
    # n = int(input())
    # arr = list(map(int, input().split()))
    
    # Your code here
    pass

if __name__ == "__main__":
    solve()`,
  javascript: `function solve() {
    // Write your solution here
    // Read from stdin and write to stdout
    
    // Example: read input
    // const readline = require('readline');
    // const rl = readline.createInterface({
    //     input: process.stdin,
    //     output: process.stdout
    // });
    
    // Your code here
}

solve();`,
  java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws IOException {
        // Write your solution here
        // Read from stdin and write to stdout
        
        Scanner sc = new Scanner(System.in);
        // Example: read input
        // int n = sc.nextInt();
        // int[] arr = new int[n];
        // for (int i = 0; i < n; i++) {
        //     arr[i] = sc.nextInt();
        // }
        
        // Your code here
        
        sc.close();
    }
}`,
  cpp: `#include <iostream>
#include <vector>
#include <algorithm>
#include <string>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Write your solution here
    // Read from stdin and write to stdout
    
    // Example: read input
    // int n;
    // cin >> n;
    // vector<int> arr(n);
    // for (int i = 0; i < n; i++) {
    //     cin >> arr[i];
    // }
    
    // Your code here
    
    return 0;
}`,
  c: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // Write your solution here
    // Read from stdin and write to stdout
    
    // Example: read input
    // int n;
    // scanf("%d", &n);
    // int arr[n];
    // for (int i = 0; i < n; i++) {
    //     scanf("%d", &arr[i]);
    // }
    
    // Your code here
    
    return 0;
}`,
  go: `package main

import (
    "fmt"
    "bufio"
    "os"
    "strconv"
    "strings"
)

func main() {
    // Write your solution here
    // Read from stdin and write to stdout
    
    scanner := bufio.NewScanner(os.Stdin)
    
    // Example: read input
    // scanner.Scan()
    // n, _ := strconv.Atoi(scanner.Text())
    // scanner.Scan()
    // arr := strings.Fields(scanner.Text())
    
    // Your code here
}`,
  rust: `use std::io;

fn main() {
    // Write your solution here
    // Read from stdin and write to stdout
    
    // Example: read input
    // let mut input = String::new();
    // io::stdin().read_line(&mut input).unwrap();
    // let n: i32 = input.trim().parse().unwrap();
    
    // Your code here
}`,
  kotlin: `import java.util.*

fun main() {
    // Write your solution here
    // Read from stdin and write to stdout
    
    val scanner = Scanner(System.\`in\`)
    
    // Example: read input
    // val n = scanner.nextInt()
    // val arr = IntArray(n) { scanner.nextInt() }
    
    // Your code here
}`,
  swift: `import Foundation

func solve() {
    // Write your solution here
    // Read from stdin and write to stdout
    
    // Example: read input
    // let n = Int(readLine()!)!
    // let arr = readLine()!.split(separator: " ").map { Int($0)! }
    
    // Your code here
}

solve()`,
  csharp: `using System;
using System.Linq;

class Program {
    static void Main() {
        // Write your solution here
        // Read from stdin and write to stdout
        
        // Example: read input
        // int n = int.Parse(Console.ReadLine());
        // int[] arr = Console.ReadLine().Split().Select(int.Parse).ToArray();
        
        // Your code here
    }
}`,
}

export function CodeEditor({ problemId, problem }: CodeEditorProps) {
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
    testCaseResults?: Array<{
      input: string
      expected: string
      actual: string
      passed: boolean
    }>
  } | null>(null)
  const [activeTab, setActiveTab] = useState("code")

  // Load saved code from localStorage
  useEffect(() => {
    const savedCode = localStorage.getItem(`code_${problemId}_${language}`)
    if (savedCode) {
      setCode(savedCode)
    } else {
      setCode(DEFAULT_CODE[language as keyof typeof DEFAULT_CODE])
    }
  }, [problemId, language])

  // Save code to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`code_${problemId}_${language}`, code)
    }, 1000)
    return () => clearTimeout(timeoutId)
  }, [code, problemId, language])

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    const savedCode = localStorage.getItem(`code_${problemId}_${newLanguage}`)
    if (savedCode) {
      setCode(savedCode)
    } else {
      setCode(DEFAULT_CODE[newLanguage as keyof typeof DEFAULT_CODE])
    }
  }

  const handleReset = () => {
    setCode(DEFAULT_CODE[language as keyof typeof DEFAULT_CODE])
    localStorage.removeItem(`code_${problemId}_${language}`)
  }

  // Removed copy, download, and upload utilities to simplify UI

  // Removed Run & Test functionality

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

          if (resultData.submission.status !== "pending" && resultData.submission.status !== "running") {
            const result = {
              status: resultData.submission.status,
              runtime: resultData.submission.runtime,
              memory: resultData.submission.memory_used,
              testCasesPassed: resultData.submission.test_cases_passed,
              totalTestCases: resultData.submission.total_test_cases,
              error: resultData.submission.error_message,
              testCaseResults: resultData.submission.test_case_results,
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
            setTimeout(pollResult, 2000)
          }
        } catch (error) {
          console.error("Polling error:", error)
          setIsSubmitting(false)
        }
      }

      setTimeout(pollResult, 2000)
    } catch (error) {
      console.error("Submission error:", error)
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "wrong_answer":
      case "runtime_error":
      case "compilation_error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "time_limit_exceeded":
      case "memory_limit_exceeded":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "pending":
      case "running":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
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
      case "pending":
      case "running":
        return <Clock className="h-4 w-4 animate-spin" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="code">Code Editor</TabsTrigger>
          <TabsTrigger value="submit">Submit</TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Code Editor</CardTitle>
                <div className="flex items-center gap-2">
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
                  <Button variant="outline" size="sm" onClick={handleReset}>Reset</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono text-sm min-h-[500px] resize-none"
                placeholder="Write your solution here..."
                style={{ tabSize: 4 }}
              />
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Lines: {code.split('\n').length}</span>
                  <span>Characters: {code.length}</span>
                  {problem && (
                    <>
                      <span>Time Limit: {problem.time_limit || 1000}ms</span>
                      <span>Memory Limit: {problem.memory_limit || 256}MB</span>
                    </>
                  )}
                </div>
                <span>Auto-saved</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Run & Test tab removed */}

        <TabsContent value="submit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submit Solution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted rounded-md p-4">
                  <h4 className="font-medium mb-2">Submission Details</h4>
                  <div className="text-sm space-y-1">
                    <div>Language: <Badge variant="outline">{LANGUAGES.find(l => l.value === language)?.label}</Badge></div>
                    <div>Problem: {problem?.title}</div>
                    <div>Code Length: {code.length} characters</div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !user} 
                  className="w-full"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Submitting..." : "Submit Solution"}
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
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(submissionResult.status)}>
                      {submissionResult.status.replace("_", " ").toUpperCase()}
                    </Badge>
                    {submissionResult.status === "accepted" && (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        ✓ Solved
                      </Badge>
                    )}
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
                          className={`h-2 rounded-full transition-all ${
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
                      <div className="text-sm font-medium text-red-800 mb-1">Error</div>
                      <p className="text-sm text-red-700 font-mono">{submissionResult.error}</p>
                    </div>
                  )}

                  {submissionResult.testCaseResults && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Test Case Details:</div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {submissionResult.testCaseResults.slice(0, 5).map((testCase, index) => (
                          <div 
                            key={index} 
                            className={`border rounded-md p-3 text-sm ${
                              testCase.passed 
                                ? "border-green-200 bg-green-50" 
                                : "border-red-200 bg-red-50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Test Case {index + 1}</span>
                              <Badge 
                                variant="outline" 
                                className={testCase.passed ? "text-green-700" : "text-red-700"}
                              >
                                {testCase.passed ? "Passed" : "Failed"}
                              </Badge>
                            </div>
                            {!testCase.passed && (
                              <div className="space-y-1 font-mono text-xs">
                                <div>Input: {testCase.input}</div>
                                <div>Expected: {testCase.expected}</div>
                                <div>Got: {testCase.actual}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
