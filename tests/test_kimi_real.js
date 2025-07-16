#!/usr/bin/env node

// Test Kimi K2's ACTUAL performance with real API calls

import { KimiMCPAdapter } from '../llm_adapters/kimi_mcp.js';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║        Testing Kimi K2 with REAL API Calls                ║
╚═══════════════════════════════════════════════════════════╝
`);

async function testKimiRealPerformance() {
  const kimi = new KimiMCPAdapter('kimi-k2-0711-preview');
  
  console.log('🔬 Testing Kimi K2 actual capabilities...\n');
  
  // Test 1: Complex Reasoning
  console.log('Test 1: Complex Reasoning (River Crossing Puzzle)');
  console.log('═'.repeat(60));
  
  try {
    const reasoningResponse = await kimi.generateText(
      `A farmer needs to get a fox, a chicken, and a bag of grain across a river. He has a small boat that can only carry him and one item at a time. If left alone, the fox will eat the chicken, and the chicken will eat the grain. How can the farmer get everything across safely? Explain your reasoning step by step.`,
      { temperature: 0.7, max_tokens: 1000 }
    );
    
    console.log('Response:', reasoningResponse.text);
    console.log('\n📊 Analysis:');
    console.log('- Has step-by-step reasoning:', reasoningResponse.text.match(/step|first|then|next|finally/gi)?.length || 0);
    console.log('- Mentions chicken return:', reasoningResponse.text.includes('back') && reasoningResponse.text.includes('chicken'));
    console.log('- Uses reasoning words:', reasoningResponse.text.match(/because|since|therefore|thus/gi)?.length || 0);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '═'.repeat(60) + '\n');
  
  // Test 2: Mathematical Proof
  console.log('Test 2: Mathematical Proof (√2 Irrationality)');
  console.log('═'.repeat(60));
  
  try {
    const mathResponse = await kimi.generateText(
      `Prove that the square root of 2 is irrational. Provide a rigorous mathematical proof.`,
      { temperature: 0.3, max_tokens: 1500 }
    );
    
    console.log('Response:', mathResponse.text);
    console.log('\n📊 Analysis:');
    console.log('- Uses proof structure:', mathResponse.text.match(/assume|suppose|contradiction|therefore|thus|hence/gi)?.length || 0);
    console.log('- Mathematical rigor:', mathResponse.text.match(/√|sqrt|rational|irrational|integer/gi)?.length || 0);
    console.log('- Uses contradiction:', mathResponse.text.toLowerCase().includes('contradiction'));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '═'.repeat(60) + '\n');
  
  // Test 3: Code Generation
  console.log('Test 3: Code Generation (Sieve of Eratosthenes)');
  console.log('═'.repeat(60));
  
  try {
    const codeResponse = await kimi.generateText(
      `Write a Python function that finds all prime numbers up to n using the Sieve of Eratosthenes algorithm. Include proper error handling and comments.`,
      { temperature: 0.5, max_tokens: 2000 }
    );
    
    console.log('Response:', codeResponse.text);
    console.log('\n📊 Analysis:');
    console.log('- Has function definition:', codeResponse.text.includes('def '));
    console.log('- Correct algorithm name:', codeResponse.text.toLowerCase().includes('sieve') || codeResponse.text.toLowerCase().includes('eratosthenes'));
    console.log('- Error handling:', codeResponse.text.match(/try|except|raise|if.*<.*0/gi)?.length || 0);
    console.log('- Comments present:', codeResponse.text.match(/#.*\n|"""|'''/g)?.length || 0);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '═'.repeat(60) + '\n');
  
  // Test 4: STORM-specific task
  console.log('Test 4: STORM Article Outline Generation');
  console.log('═'.repeat(60));
  
  try {
    const outlineResponse = await kimi.generateOutline(
      'Artificial Intelligence in Healthcare',
      'AI is transforming healthcare through diagnostic tools, treatment planning, and patient care optimization.',
      { temperature: 0.6, max_tokens: 1500 }
    );
    
    console.log('Response:', outlineResponse.text);
    console.log('\n📊 Analysis:');
    console.log('- Has main sections:', outlineResponse.text.match(/^\d+\.|^#+\s|^[IVX]+\./gm)?.length || 0);
    console.log('- Has subsections:', outlineResponse.text.match(/^\s+[a-zA-Z]\.|^\s+-|^\s+\*/gm)?.length || 0);
    console.log('- Mentions key topics:', 
      outlineResponse.text.toLowerCase().includes('diagnostic') &&
      outlineResponse.text.toLowerCase().includes('treatment') &&
      outlineResponse.text.toLowerCase().includes('patient')
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n\n📊 SUMMARY');
  console.log('═'.repeat(60));
  console.log('These are REAL results from Kimi K2 API calls.');
  console.log('Compare with simulated results to see the difference!');
}

// Run the test
testKimiRealPerformance().catch(console.error);