"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_LANGUAGES = void 0;
exports.getLanguageConfig = getLanguageConfig;
exports.getSupportedLanguages = getSupportedLanguages;
exports.SUPPORTED_LANGUAGES = {
    python: {
        id: 'python',
        name: 'Python 3',
        extension: 'py',
        runCommand: ['python3'],
        defaultTimeLimit: 5000,
        defaultMemoryLimit: 128,
        template: `def solve():
    # Write your solution here
    pass

if __name__ == "__main__":
    solve()`
    },
    javascript: {
        id: 'javascript',
        name: 'Node.js',
        extension: 'js',
        runCommand: ['node'],
        defaultTimeLimit: 5000,
        defaultMemoryLimit: 128,
        template: `function solve() {
    // Write your solution here
}

solve();`
    },
    java: {
        id: 'java',
        name: 'Java',
        extension: 'java',
        compileCommand: ['javac'],
        runCommand: ['java'],
        defaultTimeLimit: 10000,
        defaultMemoryLimit: 256,
        template: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws IOException {
        Scanner sc = new Scanner(System.in);
        // Write your solution here
        sc.close();
    }
}`
    },
    cpp: {
        id: 'cpp',
        name: 'C++',
        extension: 'cpp',
        compileCommand: ['g++', '-std=c++17', '-O2', '-o'],
        runCommand: ['./'],
        defaultTimeLimit: 5000,
        defaultMemoryLimit: 64,
        template: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Write your solution here
    
    return 0;
}`
    },
    c: {
        id: 'c',
        name: 'C',
        extension: 'c',
        compileCommand: ['gcc', '-std=c11', '-O2', '-o'],
        runCommand: ['./'],
        defaultTimeLimit: 5000,
        defaultMemoryLimit: 64,
        template: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Write your solution here
    return 0;
}`
    },
    go: {
        id: 'go',
        name: 'Go',
        extension: 'go',
        runCommand: ['go', 'run'],
        defaultTimeLimit: 5000,
        defaultMemoryLimit: 128,
        template: `package main

import "fmt"

func main() {
    // Write your solution here
}`
    },
    rust: {
        id: 'rust',
        name: 'Rust',
        extension: 'rs',
        compileCommand: ['rustc', '-O', '-o'],
        runCommand: ['./'],
        defaultTimeLimit: 10000,
        defaultMemoryLimit: 128,
        template: `use std::io;

fn main() {
    // Write your solution here
}`
    }
};
function getLanguageConfig(language) {
    return exports.SUPPORTED_LANGUAGES[language.toLowerCase()] || null;
}
function getSupportedLanguages() {
    return Object.keys(exports.SUPPORTED_LANGUAGES);
}
//# sourceMappingURL=languages.js.map