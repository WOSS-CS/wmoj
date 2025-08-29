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
        name: "python",
        display_name: "Python 3.9",
        file_extension: "py",
        default_code: `def solve():
    # Write your solution here
    # Read from stdin and write to stdout
    pass

if __name__ == "__main__":
    solve()`,
      },
      {
        name: "javascript",
        display_name: "Node.js 18",
        file_extension: "js",
        default_code: `function solve() {
    // Write your solution here
    // Read from stdin and write to stdout
}

solve();`,
      },
      {
        name: "java",
        display_name: "Java 17",
        file_extension: "java",
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
        name: "cpp",
        display_name: "C++ 17",
        file_extension: "cpp",
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
        name: "c",
        display_name: "C 11",
        file_extension: "c",
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
