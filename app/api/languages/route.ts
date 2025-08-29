import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: languages, error } = await supabase
      .from("supported_languages")
      .select("*")
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error("Query error:", error)
      return NextResponse.json({ error: "Failed to fetch languages" }, { status: 500 })
    }

    // Fallback to static languages if database is not set up yet
    const fallbackLanguages = [
      {
        id: 1,
        name: "python",
        display_name: "Python 3.9",
        judge0_id: 71,
        file_extension: ".py",
        is_active: true,
        default_code: `def solve():
    # Write your solution here
    # Read from stdin and write to stdout
    pass

if __name__ == "__main__":
    solve()`,
      },
      {
        id: 2,
        name: "javascript",
        display_name: "Node.js 18",
        judge0_id: 63,
        file_extension: ".js",
        is_active: true,
        default_code: `function solve() {
    // Write your solution here
    // Read from stdin and write to stdout
}

solve();`,
      },
      {
        id: 3,
        name: "java",
        display_name: "Java 17",
        judge0_id: 62,
        file_extension: ".java",
        is_active: true,
        default_code: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws IOException {
        Scanner sc = new Scanner(System.in);
        // Write your solution here
        sc.close();
    }
}`,
      },
      {
        id: 4,
        name: "cpp",
        display_name: "C++ 17",
        judge0_id: 54,
        file_extension: ".cpp",
        is_active: true,
        default_code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Write your solution here
    
    return 0;
}`,
      },
      {
        id: 5,
        name: "c",
        display_name: "C 11",
        judge0_id: 50,
        file_extension: ".c",
        is_active: true,
        default_code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Write your solution here
    return 0;
}`,
      },
    ]

    return NextResponse.json({ 
      languages: languages && languages.length > 0 ? languages : fallbackLanguages 
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, 
      display_name, 
      judge0_id, 
      file_extension, 
      is_active,
      compile_command,
      execute_command,
      default_code
    } = body

    if (!name || !display_name || judge0_id === undefined) {
      return NextResponse.json({ 
        error: 'Name, display_name, and judge0_id are required' 
      }, { status: 400 })
    }

    // Check if language already exists
    const { data: existingLanguage } = await supabase
      .from('supported_languages')
      .select('id')
      .or(`name.eq.${name},judge0_id.eq.${judge0_id}`)
      .single()

    if (existingLanguage) {
      return NextResponse.json({ 
        error: 'A language with this name or Judge0 ID already exists' 
      }, { status: 409 })
    }

    const { data: language, error: languageError } = await supabase
      .from('supported_languages')
      .insert({
        name,
        display_name,
        judge0_id,
        file_extension: file_extension || `.${name.toLowerCase()}`,
        is_active: is_active !== undefined ? is_active : true,
        compile_command: compile_command || null,
        execute_command: execute_command || null,
        default_code: default_code || null
      })
      .select()
      .single()

    if (languageError) {
      console.error('Error creating language:', languageError)
      return NextResponse.json({ 
        error: 'Failed to create language',
        details: languageError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Language created successfully',
      language
    })

  } catch (error) {
    console.error('Error in POST /api/languages:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
