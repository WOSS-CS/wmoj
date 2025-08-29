"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

const STATUSES = [
  { value: "accepted", label: "Accepted" },
  { value: "wrong_answer", label: "Wrong Answer" },
  { value: "runtime_error", label: "Runtime Error" },
  { value: "time_limit_exceeded", label: "Time Limit Exceeded" },
  { value: "memory_limit_exceeded", label: "Memory Limit Exceeded" },
  { value: "compilation_error", label: "Compilation Error" },
  { value: "pending", label: "Pending" },
]

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
]

export function SubmissionFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "")
  const [selectedLanguage, setSelectedLanguage] = useState(searchParams.get("language") || "")

  const updateFilters = () => {
    const params = new URLSearchParams()
    if (selectedStatus) params.set("status", selectedStatus)
    if (selectedLanguage) params.set("language", selectedLanguage)

    router.push(`/submissions?${params.toString()}`)
  }

  const clearFilters = () => {
    setSelectedStatus("")
    setSelectedLanguage("")
    router.push("/submissions")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="space-y-2">
            {STATUSES.map((status) => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={status.value}
                  checked={selectedStatus === status.value}
                  onCheckedChange={(checked) => setSelectedStatus(checked ? status.value : "")}
                />
                <Label htmlFor={status.value} className="text-sm">
                  {status.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Language</Label>
          <div className="space-y-2">
            {LANGUAGES.map((language) => (
              <div key={language.value} className="flex items-center space-x-2">
                <Checkbox
                  id={language.value}
                  checked={selectedLanguage === language.value}
                  onCheckedChange={(checked) => setSelectedLanguage(checked ? language.value : "")}
                />
                <Label htmlFor={language.value} className="text-sm">
                  {language.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={updateFilters} className="flex-1">
            Apply
          </Button>
          <Button onClick={clearFilters} variant="outline" className="flex-1 bg-transparent">
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
