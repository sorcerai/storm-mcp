#!/usr/bin/env node

// Test ACTUAL performance with REAL API calls - NO SIMULATIONS!

import { KimiMCPAdapter } from '../llm_adapters/kimi_mcp.js';
import { GeminiMCPAdapter } from '../llm_adapters/gemini_mcp.js';
import { ClaudeMCPAdapter } from '../llm_adapters/claude_mcp.js';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║     REAL Performance Test - Actual API Calls Only         ║
║                                                           ║
║  NO SIMULATED RESPONSES - REAL RESULTS ONLY              ║
╚═══════════════════════════════════════════════════════════╝
`);

// Test cases
const testCases = {
  reasoning: {
    name: 'Complex Reasoning',
    prompt: `A farmer needs to get a fox, a chicken, and a bag of grain across a river. He has a small boat that can only carry him and one item at a time. If left alone, the fox will eat the chicken, and the chicken will eat the grain. How can the farmer get everything across safely? Explain your reasoning step by step.`,
    evaluate: (response) => {
      const hasSteps = response.match(/step|first|then|next|finally/gi);
      const hasCorrectSolution = response.includes('chicken') && response.includes('back');
      const hasReasoning = response.match(/because|since|therefore|thus/gi);
      return {
        hasSteps: hasSteps ? hasSteps.length : 0,
        correctSolution: hasCorrectSolution,
        reasoningDepth: hasReasoning ? hasReasoning.length : 0
      };
    }
  },
  
  math: {
    name: 'Mathematical Proof',
    prompt: `Prove that the square root of 2 is irrational. Provide a rigorous mathematical proof.`,
    evaluate: (response) => {
      const hasProofStructure = response.match(/assume|suppose|contradiction|therefore|thus|hence/gi);
      const hasMathSymbols = response.match(/√|sqrt|rational|irrational|integer/gi);
      const hasContradiction = response.toLowerCase().includes('contradiction');
      const hasConclusion = response.match(/therefore|thus|hence.*irrational/i);
      return {
        proofStructure: hasProofStructure ? hasProofStructure.length : 0,
        mathematicalRigor: hasMathSymbols ? hasMathSymbols.length : 0,
        usesContradiction: hasContradiction,
        hasValidConclusion: !!hasConclusion
      };
    }
  },
  
  coding: {
    name: 'Code Generation',
    prompt: `Write a Python function that finds all prime numbers up to n using the Sieve of Eratosthenes algorithm. Include proper error handling and comments.`,
    evaluate: (response) => {
      const hasFunction = response.includes('def ');
      const hasAlgorithm = response.toLowerCase().includes('sieve') || response.toLowerCase().includes('eratosthenes');
      const hasErrorHandling = response.match(/try|except|raise|if.*<.*0/gi);
      const hasComments = response.match(/#.*\n|"""|'''/g);
      const codeLines = response.match(/\n/g);
      return {
        hasFunction,
        hasCorrectAlgorithm: hasAlgorithm,
        errorHandling: hasErrorHandling ? hasErrorHandling.length : 0,
        comments: hasComments ? hasComments.length : 0,
        codeLength: codeLines ? codeLines.length : 0
      };
    }
  }
};

// Results storage
const results = {
  kimi: {},
  gemini: {},
  claude: {}
};

async function testModel(modelName, adapter) {
  console.log(`\n🤖 Testing ${modelName.toUpperCase()} with REAL API calls...`);
  console.log('═'.repeat(60));
  
  for (const [testKey, test] of Object.entries(testCases)) {
    console.log(`\n📋 ${test.name}:`);
    
    try {
      const startTime = Date.now();
      
      // REAL API CALL - NO FALLBACK!
      const response = await adapter.generateText(test.prompt, {
        temperature: 0.7,
        max_tokens: 1000
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`✅ Response received in ${responseTime}ms`);
      console.log(`📝 Response preview: ${response.text.substring(0, 150)}...`);
      
      // Evaluate the response
      const evaluation = test.evaluate(response.text);
      console.log(`📊 Evaluation:`, evaluation);
      
      // Calculate score
      const score = Object.values(evaluation).reduce((sum, val) => {
        if (typeof val === 'boolean') return sum + (val ? 1 : 0);
        if (typeof val === 'number') return sum + val;
        return sum;
      }, 0);
      
      console.log(`🎯 Score: ${score}`);
      
      results[modelName][testKey] = {
        evaluation,
        score,
        responseTime,
        responseLength: response.text.length
      };
      
    } catch (error) {
      console.error(`❌ API ERROR: ${error.message}`);
      results[modelName][testKey] = {
        error: error.message,
        score: 0
      };
    }
  }
}

async function runRealTests() {
  // Test Kimi K2
  const kimiAdapter = new KimiMCPAdapter('kimi-k2-0711-preview');
  await testModel('kimi', kimiAdapter);
  
  // Test Gemini 2.5 Pro
  console.log('\n\n🔄 Preparing to test Gemini 2.5 Pro...');
  console.log('⚠️  Note: Gemini uses CLI authentication via --auth flag');
  const geminiAdapter = new GeminiMCPAdapter('gemini-2.5-pro');
  await testModel('gemini', geminiAdapter);
  
  // Test Claude (for comparison)
  console.log('\n\n🔄 Testing Claude Sonnet 4 for comparison...');
  const claudeAdapter = new ClaudeMCPAdapter('claude-sonnet-4');
  await testModel('claude', claudeAdapter);
  
  // Display final results
  displayResults();
}

function displayResults() {
  console.log(`\n\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║              REAL API PERFORMANCE RESULTS                 ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  
  // Calculate total scores
  const totalScores = {};
  for (const [model, tests] of Object.entries(results)) {
    totalScores[model] = Object.values(tests).reduce((sum, test) => sum + (test.score || 0), 0);
  }
  
  // Display summary table
  console.log('📊 SCORE SUMMARY:');
  console.log('═'.repeat(60));
  console.log('Model'.padEnd(15) + 'Reasoning'.padEnd(12) + 'Math'.padEnd(12) + 'Coding'.padEnd(12) + 'TOTAL');
  console.log('─'.repeat(60));
  
  for (const model of ['kimi', 'gemini', 'claude']) {
    const row = model.toUpperCase().padEnd(15);
    let rowData = row;
    
    for (const test of ['reasoning', 'math', 'coding']) {
      const score = results[model][test]?.score || 0;
      rowData += score.toString().padEnd(12);
    }
    
    rowData += totalScores[model] || 0;
    console.log(rowData);
  }
  
  console.log('═'.repeat(60));
  
  // Display response times
  console.log('\n⏱️  AVERAGE RESPONSE TIMES:');
  console.log('─'.repeat(40));
  for (const [model, tests] of Object.entries(results)) {
    const times = Object.values(tests)
      .filter(t => t.responseTime)
      .map(t => t.responseTime);
    
    if (times.length > 0) {
      const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      console.log(`${model.toUpperCase()}: ${avgTime}ms average`);
    }
  }
  
  // Winner announcement
  console.log('\n🏆 WINNER (Based on Real API Performance):');
  const winner = Object.entries(totalScores)
    .sort(([,a], [,b]) => b - a)[0];
  console.log(`   ${winner[0].toUpperCase()} with ${winner[1]} total points!`);
  
  console.log('\n💡 These are REAL results from actual API calls!');
  console.log('   No simulations or fallbacks were used.\n');
}

// Run the tests
console.log('🚀 Starting real API performance tests...');
console.log('⚠️  This will make actual API calls and may take some time.\n');

runRealTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});