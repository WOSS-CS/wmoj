"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Play, Save, ArrowLeft } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"

interface TestCase {
  input: string
  expectedOutput: string
  isSample: boolean
  points: number
  timeLimit?: number
  memoryLimit?: number
}

interface ReferenceSolution {
  language: string
  code: string
  description?: string
  isPrimary: boolean
}

interface Editorial {
  title: string
  content: string
  complexity?: string
  hints: string[]
  relatedTopics: string[]
  publish: boolean
}

interface Category {
  id: string
  name: string
  description?: string
}

export function ProblemCreator() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Easy")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [inputFormat, setInputFormat] = useState("")
  const [outputFormat, setOutputFormat] = useState("")
  const [constraints, setConstraints] = useState("")
  const [sampleInput, setSampleInput] = useState("")
  const [sampleOutput, setSampleOutput] = useState("")
  // explanation removed per schema
  const [timeLimit, setTimeLimit] = useState(2000)
  const [memoryLimit, setMemoryLimit] = useState(256)
  
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: "", expectedOutput: "", isSample: true, points: 1 }
  ])
  
  // New state for enhanced features
  const [referenceSolutions, setReferenceSolutions] = useState<ReferenceSolution[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [editorial, setEditorial] = useState<Editorial>({
    title: "",
    content: "",
    complexity: "",
    hints: [],
    relatedTopics: [],
    publish: false
  })
  const [newHint, setNewHint] = useState("")
  const [newTopic, setNewTopic] = useState("")
  
  const [testCode, setTestCode] = useState("")
  const [testLanguage, setTestLanguage] = useState("python")
  const [testOutput, setTestOutput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Load categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()
        if (response.ok) {
          setAvailableCategories(data.categories || [])
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])

  // Generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value)
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    setSlug(generatedSlug)
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const addTestCase = () => {
    setTestCases([...testCases, { 
      input: "", 
      expectedOutput: "", 
      isSample: false, 
      points: 1 
    }])
  }

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index))
    }
  }

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const updated = testCases.map((tc, i) => 
      i === index ? { ...tc, [field]: value } : tc
    )
    setTestCases(updated)
  }

  // Reference solution functions
  const addReferenceSolution = () => {
    setReferenceSolutions([...referenceSolutions, {
      language: "python",
      code: "",
      description: "",
      isPrimary: referenceSolutions.length === 0 // First solution is primary
    }])
  }

  const removeReferenceSolution = (index: number) => {
    const updated = referenceSolutions.filter((_, i) => i !== index)
    // If we removed the primary solution, make the first one primary
    if (updated.length > 0 && !updated.some(sol => sol.isPrimary)) {
      updated[0].isPrimary = true
    }
    setReferenceSolutions(updated)
  }

  const updateReferenceSolution = (index: number, field: keyof ReferenceSolution, value: any) => {
    const updated = referenceSolutions.map((sol, i) => {
      if (i === index) {
        // If setting this as primary, unset others
        if (field === 'isPrimary' && value === true) {
          return { ...sol, [field]: value }
        }
        return { ...sol, [field]: value }
      } else if (field === 'isPrimary' && value === true) {
        // Unset primary for others
        return { ...sol, isPrimary: false }
      }
      return sol
    })
    setReferenceSolutions(updated)
  }

  // Editorial functions
  const addHint = () => {
    if (newHint.trim() && !editorial.hints.includes(newHint.trim())) {
      setEditorial({
        ...editorial,
        hints: [...editorial.hints, newHint.trim()]
      })
      setNewHint("")
    }
  }

  const removeHint = (hintToRemove: string) => {
    setEditorial({
      ...editorial,
      hints: editorial.hints.filter(hint => hint !== hintToRemove)
    })
  }

  const addTopic = () => {
    if (newTopic.trim() && !editorial.relatedTopics.includes(newTopic.trim())) {
      setEditorial({
        ...editorial,
        relatedTopics: [...editorial.relatedTopics, newTopic.trim()]
      })
      setNewTopic("")
    }
  }

  const removeTopic = (topicToRemove: string) => {
    setEditorial({
      ...editorial,
      relatedTopics: editorial.relatedTopics.filter(topic => topic !== topicToRemove)
    })
  }

  // Category functions
  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId))
    } else {
      setSelectedCategories([...selectedCategories, categoryId])
    }
  }

  const testSolution = async () => {
    if (!testCode.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: testLanguage,
          code: testCode,
          input: sampleInput,
        }),
      })

      const result = await response.json()
      setTestOutput(result.success ? result.output : result.error)
    } catch (error) {
      setTestOutput("Error running code")
    } finally {
      setIsLoading(false)
    }
  }

  const saveProblem = async () => {
    if (!user) {
      alert("Please log in to create problems")
      return
    }

    if (!title || !description || !slug) {
      alert("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    try {
      const problemData = {
        title,
        slug,
        description,
        difficulty,
        tags,
        // input/output format and constraints removed
        sampleInput,
        sampleOutput,
        // explanation removed
        timeLimit,
        memoryLimit,
        testCases,
        referenceSolutions,
        categories: selectedCategories,
        editorial: editorial.title && editorial.content ? editorial : null
      }

      const response = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(problemData),
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Problem created successfully! ${result.stats ? `
Test cases: ${result.stats.testCases}
Reference solutions: ${result.stats.referenceSolutions}
Categories: ${result.stats.categories}
Editorial: ${result.stats.hasEditorial ? 'Yes' : 'No'}` : ''}`)
        router.push(`/problems/${result.problem.slug}`)
      } else {
        const error = await response.json()
        alert(`Error creating problem: ${error.error}`)
      }
    } catch (error) {
      alert("Error creating problem")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push("/problems")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Problems
        </Button>
        <h1 className="text-3xl font-bold">Create New Problem</h1>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="testcases">Test Cases</TabsTrigger>
          <TabsTrigger value="solutions">Solutions</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="editorial">Editorial</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Problem Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g., Two Sum"
                  />
                </div>
                
                <div>
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g., two-sum"
                  />
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty *</Label>
                  <Select value={difficulty} onValueChange={(value: any) => setDifficulty(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeLimit">Time Limit (ms)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="memoryLimit">Memory Limit (MB)</Label>
                    <Input
                      id="memoryLimit"
                      type="number"
                      value={memoryLimit}
                      onChange={(e) => setMemoryLimit(parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag"
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button type="button" onClick={addTag} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Problem Statement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the problem in detail..."
                    className="min-h-[120px]"
                  />
                </div>

                {/* Input/Output format and constraints removed per schema */}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sample Input/Output</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              <div>
                <Label htmlFor="sampleInput">Sample Input</Label>
                <Textarea
                  id="sampleInput"
                  value={sampleInput}
                  onChange={(e) => setSampleInput(e.target.value)}
                  className="font-mono"
                  placeholder="Sample input..."
                />
              </div>
              <div>
                <Label htmlFor="sampleOutput">Sample Output</Label>
                <Textarea
                  id="sampleOutput"
                  value={sampleOutput}
                  onChange={(e) => setSampleOutput(e.target.value)}
                  className="font-mono"
                  placeholder="Expected output..."
                />
              </div>
              {/* Sample explanation removed per schema */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testcases" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Test Cases</CardTitle>
                <Button onClick={addTestCase} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Test Case
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {testCases.map((testCase, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Test Case {index + 1}</h4>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={testCase.isSample}
                          onChange={(e) => updateTestCase(index, 'isSample', e.target.checked)}
                        />
                        Sample
                      </label>
                      {testCases.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeTestCase(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <Label>Input</Label>
                      <Textarea
                        value={testCase.input}
                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                        className="font-mono text-sm"
                        placeholder="Test input..."
                      />
                    </div>
                    <div>
                      <Label>Expected Output</Label>
                      <Textarea
                        value={testCase.expectedOutput}
                        onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                        className="font-mono text-sm"
                        placeholder="Expected output..."
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-4 lg:grid-cols-3 mt-3">
                    <div>
                      <Label>Points</Label>
                      <Input
                        type="number"
                        value={testCase.points}
                        onChange={(e) => updateTestCase(index, 'points', parseInt(e.target.value) || 1)}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label>Time Limit (ms)</Label>
                      <Input
                        type="number"
                        value={testCase.timeLimit || timeLimit}
                        onChange={(e) => updateTestCase(index, 'timeLimit', parseInt(e.target.value))}
                        placeholder={timeLimit.toString()}
                      />
                    </div>
                    <div>
                      <Label>Memory Limit (MB)</Label>
                      <Input
                        type="number"
                        value={testCase.memoryLimit || memoryLimit}
                        onChange={(e) => updateTestCase(index, 'memoryLimit', parseInt(e.target.value))}
                        placeholder={memoryLimit.toString()}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solutions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Reference Solutions</CardTitle>
                <Button onClick={addReferenceSolution} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Solution
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {referenceSolutions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No reference solutions added yet.</p>
                  <p className="text-sm mt-1">Add solutions to help users understand your problem.</p>
                </div>
              ) : (
                referenceSolutions.map((solution, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Solution {index + 1}</h4>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={solution.isPrimary}
                            onCheckedChange={(checked: boolean) => updateReferenceSolution(index, 'isPrimary', checked)}
                          />
                          Primary
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeReferenceSolution(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <Label>Language</Label>
                          <Select 
                            value={solution.language} 
                            onValueChange={(value: string) => updateReferenceSolution(index, 'language', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="python">Python</SelectItem>
                              <SelectItem value="javascript">JavaScript</SelectItem>
                              <SelectItem value="java">Java</SelectItem>
                              <SelectItem value="cpp">C++</SelectItem>
                              <SelectItem value="c">C</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Description (optional)</Label>
                          <Input
                            value={solution.description || ""}
                            onChange={(e) => updateReferenceSolution(index, 'description', e.target.value)}
                            placeholder="Brief description of this approach..."
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Code</Label>
                        <Textarea
                          value={solution.code}
                          onChange={(e) => updateReferenceSolution(index, 'code', e.target.value)}
                          className="font-mono text-sm min-h-[200px]"
                          placeholder="Enter the reference solution code..."
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Problem Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {availableCategories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Loading categories...</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {availableCategories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={category.id}
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      <Label htmlFor={category.id} className="flex-1 cursor-pointer">
                        <div>
                          <div className="font-medium">{category.name}</div>
                          {category.description && (
                            <div className="text-sm text-muted-foreground">{category.description}</div>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              {selectedCategories.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-sm font-medium">Selected Categories:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCategories.map(categoryId => {
                      const category = availableCategories.find(c => c.id === categoryId)
                      return category ? (
                        <Badge key={categoryId} variant="secondary">
                          {category.name}
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editorial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Problem Editorial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={editorial.title}
                    onChange={(e) => setEditorial({...editorial, title: e.target.value})}
                    placeholder="Editorial title..."
                  />
                </div>
                <div>
                  <Label>Time/Space Complexity</Label>
                  <Input
                    value={editorial.complexity || ""}
                    onChange={(e) => setEditorial({...editorial, complexity: e.target.value})}
                    placeholder="O(n), O(1) space..."
                  />
                </div>
              </div>

              <div>
                <Label>Editorial Content (Markdown supported)</Label>
                <Textarea
                  value={editorial.content}
                  onChange={(e) => setEditorial({...editorial, content: e.target.value})}
                  className="min-h-[200px]"
                  placeholder="Write a detailed explanation of the solution approach..."
                />
              </div>

              <div>
                <Label>Hints</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newHint}
                    onChange={(e) => setNewHint(e.target.value)}
                    placeholder="Add a hint..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHint())}
                  />
                  <Button type="button" onClick={addHint} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {editorial.hints.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editorial.hints.map((hint, index) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        {hint}
                        <button
                          type="button"
                          onClick={() => removeHint(hint)}
                          className="ml-1 hover:bg-muted rounded-full w-4 h-4 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label>Related Topics</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="Add a related topic..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                  />
                  <Button type="button" onClick={addTopic} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {editorial.relatedTopics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editorial.relatedTopics.map((topic, index) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        {topic}
                        <button
                          type="button"
                          onClick={() => removeTopic(topic)}
                          className="ml-1 hover:bg-muted rounded-full w-4 h-4 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="publish"
                  checked={editorial.publish}
                  onCheckedChange={(checked: boolean) => setEditorial({...editorial, publish: !!checked})}
                />
                <Label htmlFor="publish">Publish editorial immediately</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Your Solution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Language</Label>
                <Select value={testLanguage} onValueChange={setTestLanguage}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                    <SelectItem value="c">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Test Code</Label>
                <Textarea
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value)}
                  className="font-mono text-sm min-h-[200px]"
                  placeholder="Write a solution to test your problem..."
                />
              </div>
              
              <Button onClick={testSolution} disabled={isLoading}>
                <Play className="h-4 w-4 mr-2" />
                {isLoading ? "Running..." : "Test Solution"}
              </Button>
              
              {testOutput && (
                <div>
                  <Label>Output</Label>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm whitespace-pre-wrap">
                    {testOutput}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {title || "Untitled Problem"}
                    <Badge className={
                      difficulty === "Easy" ? "bg-green-100 text-green-800" :
                      difficulty === "Medium" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }>
                      {difficulty}
                    </Badge>
                  </CardTitle>
                  <div className="flex gap-2 mt-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <Button onClick={saveProblem} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Problem"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {description && (
                <div>
                  <h3 className="font-semibold mb-2">Problem Description</h3>
                  <p className="whitespace-pre-wrap">{description}</p>
                </div>
              )}
              
              {(sampleInput || sampleOutput) && (
                <div>
                  <h3 className="font-semibold mb-2">Sample</h3>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {sampleInput && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Input:</h4>
                        <pre className="bg-muted p-3 rounded text-sm">{sampleInput}</pre>
                      </div>
                    )}
                    {sampleOutput && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Output:</h4>
                        <pre className="bg-muted p-3 rounded text-sm">{sampleOutput}</pre>
                      </div>
                    )}
                  </div>
                  {/* Explanation preview removed */}
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p>Time Limit: {timeLimit}ms | Memory Limit: {memoryLimit}MB</p>
                <p>Test Cases: {testCases.length}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
