import { Injectable } from '@nestjs/common';
import * as ts from 'typescript';

export interface AnalysisResult {
  usesRecursion: boolean;
  usesLoops: boolean;
  usesFunctions: boolean;
  usesClasses: boolean;
  depth: number;
  functionCalls: string[];
}

@Injectable()
export class AstService {
  analyzeJavaScript(code: string): AnalysisResult {
    const result: AnalysisResult = {
      usesRecursion: false,
      usesLoops: false,
      usesFunctions: false,
      usesClasses: false,
      depth: 0,
      functionCalls: [],
    };

    const sourceFile = ts.createSourceFile(
      'temp.js',
      code,
      ts.ScriptTarget.Latest,
      true,
    );

    let currentDepth = 0;
    let maxDepth = 0;
    const functionNames = new Set<string>();

    function visit(node: ts.Node, depth: number) {
      currentDepth = depth;
      maxDepth = Math.max(maxDepth, depth);

      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        result.usesFunctions = true;
        if (ts.isFunctionDeclaration(node) && node.name) {
          functionNames.add(node.name.text);
        }
      }

      if (ts.isClassDeclaration(node)) {
        result.usesClasses = true;
      }

      if (ts.isForStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
        result.usesLoops = true;
      }

      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        if (ts.isIdentifier(expression)) {
          result.functionCalls.push(expression.text);
          if (functionNames.has(expression.text)) {
            result.usesRecursion = true;
          }
        }
      }

      ts.forEachChild(node, (child) => visit(child, depth + 1));
    }

    visit(sourceFile, 0);
    result.depth = maxDepth;

    return result;
  }

  // Compare two solutions and return similarity score (0 to 1)
  compareSolutions(studentCode: string, referenceCode: string, language: string): { similarity: number; studentFeatures: AnalysisResult; referenceFeatures: AnalysisResult } {
    let studentFeatures: AnalysisResult;
    let referenceFeatures: AnalysisResult;

    if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'js') {
      try {
        studentFeatures = this.analyzeJavaScript(studentCode);
        referenceFeatures = this.analyzeJavaScript(referenceCode);
      } catch (e) {
        studentFeatures = this.extractTokenFeatures(studentCode);
        referenceFeatures = this.extractTokenFeatures(referenceCode);
      }
    } else {
      studentFeatures = this.extractTokenFeatures(studentCode);
      referenceFeatures = this.extractTokenFeatures(referenceCode);
    }

    let matchPoints = 0;
    let totalPoints = 0;

    totalPoints += 2;
    if (studentFeatures.usesLoops === referenceFeatures.usesLoops) {
      matchPoints += 2;
    }

    totalPoints += 2;
    if (studentFeatures.usesRecursion === referenceFeatures.usesRecursion) {
      matchPoints += 2;
    }

    totalPoints += 1;
    if (studentFeatures.usesFunctions === referenceFeatures.usesFunctions) {
      matchPoints += 1;
    }

    totalPoints += 2;
    const depthDiff = Math.abs(studentFeatures.depth - referenceFeatures.depth);
    if (depthDiff <= 2) {
      matchPoints += 2;
    } else if (depthDiff <= 5) {
      matchPoints += 1;
    }

    totalPoints += 3;
    const studentSig = this.getNormalizedSignature(studentCode);
    const refSig = this.getNormalizedSignature(referenceCode);
    const textSimilarity = this.getLevenshteinSimilarity(studentSig, refSig);
    matchPoints += textSimilarity * 3;

    const similarity = matchPoints / totalPoints;

    return {
      similarity,
      studentFeatures,
      referenceFeatures,
    };
  }

  private extractTokenFeatures(code: string): AnalysisResult {
    const clean = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*|#.*/g, '');
    const usesLoops = /\b(for|while|do)\b/.test(clean);
    const usesFunctions = /\b(def|function|fn|func|public|private|void|int|double|float)\b/.test(clean);
    const usesClasses = /\b(class|interface|struct)\b/.test(clean);
    
    let usesRecursion = false;
    const funcMatch = clean.match(/\b(def|function|fn|func)\s+([a-zA-Z0-9_]+)/g);
    if (funcMatch) {
      for (const m of funcMatch) {
        const parts = m.split(/\s+/);
        const name = parts[1];
        if (name) {
          const bodyStart = clean.indexOf(name) + name.length;
          const body = clean.substring(bodyStart);
          if (body.includes(name + '(') || body.includes(name + ' (')) {
            usesRecursion = true;
            break;
          }
        }
      }
    }

    let currentDepth = 0;
    let maxDepth = 0;
    for (const char of clean) {
      if (char === '{' || char === ':') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return {
      usesRecursion,
      usesLoops,
      usesFunctions,
      usesClasses,
      depth: maxDepth,
      functionCalls: [],
    };
  }

  private getNormalizedSignature(code: string): string {
    return code
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*|#.*/g, '')
      .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
      .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''")
      .replace(/\d+/g, '0')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  private getLevenshteinSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (s1.length === 0) return 0.0;
    if (s2.length === 0) return 0.0;

    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    const distance = costs[s2.length];
    return 1.0 - distance / Math.max(s1.length, s2.length);
  }
}
