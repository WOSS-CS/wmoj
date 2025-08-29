"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

const DIFFICULTIES = ["Easy", "Medium", "Hard"]
const POPULAR_TAGS = [
  "array",
  "string",
  "hash-table",
  "dynamic-programming",
  "math",
  "sorting",
  "greedy",
  "depth-first-search",
  "binary-search",
  "breadth-first-search",
  "tree",
  "graph",
  "backtracking",
  "stack",
  "heap",
]

export function ProblemFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [selectedDifficulty, setSelectedDifficulty] = useState(searchParams.get("difficulty") || "")
  const [selectedTags, setSelectedTags] = useState<string[]>(searchParams.get("tags")?.split(",").filter(Boolean) || [])

  const updateFilters = () => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (selectedDifficulty) params.set("difficulty", selectedDifficulty)
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","))

    router.push(`/problems?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch("")
    setSelectedDifficulty("")
    setSelectedTags([])
    router.push("/problems")
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && updateFilters()}
          />
        </div>

        <div className="space-y-2">
          <Label>Difficulty</Label>
          <div className="space-y-2">
            {DIFFICULTIES.map((difficulty) => (
              <div key={difficulty} className="flex items-center space-x-2">
                <Checkbox
                  id={difficulty}
                  checked={selectedDifficulty === difficulty}
                  onCheckedChange={(checked) => setSelectedDifficulty(checked ? difficulty : "")}
                />
                <Label htmlFor={difficulty} className="text-sm">
                  {difficulty}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {POPULAR_TAGS.map((tag) => (
              <div key={tag} className="flex items-center space-x-2">
                <Checkbox id={tag} checked={selectedTags.includes(tag)} onCheckedChange={() => handleTagToggle(tag)} />
                <Label htmlFor={tag} className="text-sm">
                  {tag}
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
