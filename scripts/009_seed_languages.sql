-- Seed supported programming languages with Judge0 IDs
INSERT INTO public.supported_languages (name, display_name, judge0_id, file_extension, is_active, default_code) VALUES
('python', 'Python 3.9', 71, '.py', true, 'def solve():
    # Write your solution here
    # Read from stdin and write to stdout
    pass

if __name__ == "__main__":
    solve()'),

('javascript', 'Node.js 18', 63, '.js', true, 'function solve() {
    // Write your solution here
    // Read from stdin and write to stdout
}

solve();'),

('java', 'Java 17', 62, '.java', true, 'import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws IOException {
        Scanner sc = new Scanner(System.in);
        // Write your solution here
        sc.close();
    }
}'),

('cpp', 'C++ 17', 54, '.cpp', true, '#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Write your solution here
    
    return 0;
}'),

('c', 'C 11', 50, '.c', true, '#include <stdio.h>
#include <stdlib.h>

int main() {
    // Write your solution here
    return 0;
}'),

('rust', 'Rust 1.70', 73, '.rs', true, 'fn main() {
    // Write your solution here
}'),

('go', 'Go 1.20', 60, '.go', true, 'package main

import "fmt"

func main() {
    // Write your solution here
}'),

('php', 'PHP 8.1', 68, '.php', true, '<?php
// Write your solution here
?>'),

('ruby', 'Ruby 3.0', 72, '.rb', true, '# Write your solution here'),

('swift', 'Swift 5.7', 83, '.swift', true, 'import Swift

// Write your solution here'),

('kotlin', 'Kotlin 1.8', 78, '.kt', true, 'fun main() {
    // Write your solution here
}'),

('scala', 'Scala 3.2', 81, '.scala', true, 'object Solution {
    def main(args: Array[String]): Unit = {
        // Write your solution here
    }
}')

ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    judge0_id = EXCLUDED.judge0_id,
    file_extension = EXCLUDED.file_extension,
    is_active = EXCLUDED.is_active,
    default_code = EXCLUDED.default_code;
