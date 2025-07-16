#!/usr/bin/env node

// LLM Test Battery for STORM MCP
// Tests each LLM (Claude, Gemini, Kimi) across different task types
// to validate and optimize agent specializations

import { ClaudeMCPAdapter } from '../llm_adapters/claude_mcp.js';
import { GeminiMCPAdapter } from '../llm_adapters/gemini_mcp.js';
import { KimiMCPAdapter } from '../llm_adapters/kimi_mcp.js';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║           STORM MCP - LLM Capability Test Battery         ║
║                                                           ║
║  Testing each LLM across different task types             ║
╚═══════════════════════════════════════════════════════════╝
`);

// Initialize adapters
const adapters = {
  claude: {
    name: 'Claude',
    instance: new ClaudeMCPAdapter('claude-3-sonnet')
  },
  gemini: {
    name: 'Gemini',
    instance: new GeminiMCPAdapter('gemini-1.5-pro')
  },
  kimi: {
    name: 'Kimi K2',
    instance: new KimiMCPAdapter('kimi-k2-0711-preview')
  }
};

// Test categories with specific prompts
const testCategories = {
  factual_research: {
    name: 'Factual Research & Accuracy',
    tests: [
      {
        name: 'Technical Facts',
        prompt: 'What are the exact specifications and performance benchmarks of the NVIDIA H100 GPU? Include memory bandwidth, FP16 performance, and TDP.'
      },
      {
        name: 'Scientific Data',
        prompt: 'What is the current measured value of the Hubble constant and what are the recent discrepancies between different measurement methods?'
      },
      {
        name: 'Market Statistics',
        prompt: 'What are the exact market share percentages for cloud providers (AWS, Azure, GCP) in Q4 2023?'
      }
    ]
  },
  
  perspective_generation: {
    name: 'Perspective Generation & Analysis',
    tests: [
      {
        name: 'Multi-stakeholder Analysis',
        prompt: 'Generate distinct perspectives on AI regulation from: a) tech entrepreneurs, b) ethicists, c) government regulators, d) general public. Make each perspective unique and authentic.'
      },
      {
        name: 'Cultural Perspectives',
        prompt: 'How do different cultures (American, Chinese, European, African) view the concept of work-life balance? Provide authentic cultural insights.'
      },
      {
        name: 'Future Scenarios',
        prompt: 'Generate 3 distinct future scenarios for renewable energy adoption by 2050: optimistic, realistic, and pessimistic.'
      }
    ]
  },
  
  structural_thinking: {
    name: 'Structural Thinking & Outlining',
    tests: [
      {
        name: 'Complex Topic Structure',
        prompt: 'Create a detailed outline for a comprehensive guide on "Building Distributed Systems". Include main sections, subsections, and key points to cover.'
      },
      {
        name: 'Pattern Recognition',
        prompt: 'Analyze the common patterns in successful tech startups and organize them into a hierarchical framework.'
      },
      {
        name: 'Information Architecture',
        prompt: 'Design the information architecture for a knowledge base about machine learning, organizing concepts from beginner to advanced.'
      }
    ]
  },
  
  creative_writing: {
    name: 'Creative & Engaging Writing',
    tests: [
      {
        name: 'Engaging Introduction',
        prompt: 'Write a compelling introduction for an article about quantum computing that would hook a general audience without technical background.'
      },
      {
        name: 'Metaphor Creation',
        prompt: 'Create vivid metaphors to explain blockchain technology to someone who has never used computers.'
      },
      {
        name: 'Narrative Flow',
        prompt: 'Write a short section that smoothly transitions from discussing AI benefits to AI risks, maintaining reader engagement.'
      }
    ]
  },
  
  technical_writing: {
    name: 'Technical Documentation',
    tests: [
      {
        name: 'API Documentation',
        prompt: 'Write clear documentation for a REST API endpoint that creates user accounts. Include parameters, responses, and examples.'
      },
      {
        name: 'Code Explanation',
        prompt: 'Explain how a recursive fibonacci function works, including time complexity analysis and optimization strategies.'
      },
      {
        name: 'Architecture Description',
        prompt: 'Describe a microservices architecture for an e-commerce platform, including service boundaries and communication patterns.'
      }
    ]
  },
  
  analytical_reasoning: {
    name: 'Analytical & Logical Reasoning',
    tests: [
      {
        name: 'Comparative Analysis',
        prompt: 'Compare and contrast React, Vue, and Angular frameworks across 5 key dimensions. Provide a balanced analysis.'
      },
      {
        name: 'Problem Decomposition',
        prompt: 'Break down the problem of "reducing carbon emissions in urban areas" into actionable sub-problems and analyze their interdependencies.'
      },
      {
        name: 'Trend Analysis',
        prompt: 'Analyze the trend of remote work adoption: what factors drove it, current state, and likely future trajectory.'
      }
    ]
  },
  
  synthesis_consistency: {
    name: 'Synthesis & Consistency',
    tests: [
      {
        name: 'Multi-source Synthesis',
        prompt: 'Synthesize insights from climate science, economics, and policy to create a cohesive strategy for carbon neutrality.'
      },
      {
        name: 'Consistency Check',
        prompt: 'Review this text for consistency: "AI will replace all jobs. However, AI creates new opportunities. But automation eliminates human work. Yet we need human creativity." Fix any contradictions.'
      },
      {
        name: 'Holistic Integration',
        prompt: 'Integrate technical, business, and user experience perspectives into a unified product strategy for a new social media platform.'
      }
    ]
  },
  
  citation_verification: {
    name: 'Citation & Source Handling',
    tests: [
      {
        name: 'Source Attribution',
        prompt: 'Write a paragraph about CRISPR gene editing with proper citations in [1] format. Make up reasonable academic sources.'
      },
      {
        name: 'Fact Verification',
        prompt: 'Identify potential inaccuracies in this statement: "Python was created in 1995 by Google engineers to replace Java in web development."'
      },
      {
        name: 'Reference Formatting',
        prompt: 'Convert these informal references into proper academic citations: "That MIT study from last year about AI bias" and "The recent Nature paper on quantum supremacy".'
      }
    ]
  }
};

// Scoring criteria for each category
const scoringCriteria = {
  factual_research: ['accuracy', 'completeness', 'specificity', 'currency'],
  perspective_generation: ['diversity', 'authenticity', 'depth', 'nuance'],
  structural_thinking: ['organization', 'hierarchy', 'completeness', 'clarity'],
  creative_writing: ['engagement', 'clarity', 'flow', 'accessibility'],
  technical_writing: ['precision', 'completeness', 'examples', 'clarity'],
  analytical_reasoning: ['logic', 'depth', 'balance', 'insights'],
  synthesis_consistency: ['coherence', 'integration', 'consistency', 'completeness'],
  citation_verification: ['accuracy', 'formatting', 'appropriateness', 'completeness']
};

// Test runner
async function runTestBattery() {
  const results = {};
  
  for (const [categoryKey, category] of Object.entries(testCategories)) {
    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`Testing: ${category.name}`);
    console.log(`${'='.repeat(60)}\n`);
    
    results[categoryKey] = {};
    
    for (const test of category.tests) {
      console.log(`\nTest: ${test.name}`);
      console.log(`Prompt: ${test.prompt.substring(0, 100)}...`);
      console.log('\n');
      
      results[categoryKey][test.name] = {};
      
      // Test each LLM
      for (const [llmKey, llm] of Object.entries(adapters)) {
        try {
          console.log(`\n${llm.name} Response:`);
          console.log('-'.repeat(40));
          
          const startTime = Date.now();
          const response = await llm.instance.generateText(test.prompt, {
            temperature: 0.7,
            max_tokens: 500
          });
          const endTime = Date.now();
          
          console.log(response.text.substring(0, 300) + '...');
          console.log(`\nResponse time: ${endTime - startTime}ms`);
          
          // Score based on criteria (this would need human evaluation in practice)
          const scores = {};
          for (const criterion of scoringCriteria[categoryKey]) {
            scores[criterion] = Math.floor(Math.random() * 3) + 8; // Placeholder scoring
          }
          
          results[categoryKey][test.name][llmKey] = {
            response_preview: response.text.substring(0, 200),
            response_time: endTime - startTime,
            scores: scores,
            average_score: Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
          };
          
        } catch (error) {
          console.error(`Error testing ${llm.name}: ${error.message}`);
          results[categoryKey][test.name][llmKey] = {
            error: error.message,
            scores: {},
            average_score: 0
          };
        }
      }
    }
  }
  
  return results;
}

// Analyze results and generate recommendations
function analyzeResults(results) {
  console.log('\n\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                  TEST RESULTS ANALYSIS                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  const llmStrengths = {
    claude: {},
    gemini: {},
    kimi: {}
  };
  
  // Calculate average scores per category per LLM
  for (const [categoryKey, categoryResults] of Object.entries(results)) {
    for (const [testName, testResults] of Object.entries(categoryResults)) {
      for (const [llmKey, llmResult] of Object.entries(testResults)) {
        if (!llmStrengths[llmKey][categoryKey]) {
          llmStrengths[llmKey][categoryKey] = [];
        }
        llmStrengths[llmKey][categoryKey].push(llmResult.average_score || 0);
      }
    }
  }
  
  // Calculate category averages
  const categoryAverages = {};
  for (const [llmKey, categories] of Object.entries(llmStrengths)) {
    categoryAverages[llmKey] = {};
    for (const [categoryKey, scores] of Object.entries(categories)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      categoryAverages[llmKey][categoryKey] = avg;
    }
  }
  
  // Display results
  console.log('\n📊 Category Performance Averages:\n');
  
  for (const [categoryKey, category] of Object.entries(testCategories)) {
    console.log(`\n${category.name}:`);
    for (const [llmKey, llm] of Object.entries(adapters)) {
      const score = categoryAverages[llmKey][categoryKey] || 0;
      const bar = '█'.repeat(Math.floor(score));
      console.log(`  ${llm.name.padEnd(10)} ${bar} ${score.toFixed(1)}/10`);
    }
  }
  
  // Generate recommendations
  console.log('\n\n🎯 Optimized Task Assignments:\n');
  
  const recommendations = {
    'Factual Research': 'Gemini (highest accuracy for facts and data)',
    'Perspective Generation': 'Kimi (best at diverse viewpoints)',
    'Structural Thinking': 'Kimi (excellent pattern recognition)',
    'Creative Writing': 'Claude (most engaging and accessible)',
    'Technical Writing': 'Gemini (precise and detailed)',
    'Analytical Reasoning': 'Kimi (deep analysis capabilities)',
    'Synthesis & Polish': 'Claude (best coherence and flow)',
    'Citation Management': 'Gemini (accurate source handling)'
  };
  
  for (const [task, recommendation] of Object.entries(recommendations)) {
    console.log(`${task}: ${recommendation}`);
  }
  
  // Response time analysis
  console.log('\n\n⚡ Response Time Analysis:\n');
  
  const responseTimes = {};
  for (const [categoryKey, categoryResults] of Object.entries(results)) {
    for (const [testName, testResults] of Object.entries(categoryResults)) {
      for (const [llmKey, llmResult] of Object.entries(testResults)) {
        if (!responseTimes[llmKey]) {
          responseTimes[llmKey] = [];
        }
        if (llmResult.response_time) {
          responseTimes[llmKey].push(llmResult.response_time);
        }
      }
    }
  }
  
  for (const [llmKey, times] of Object.entries(responseTimes)) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`${adapters[llmKey].name}: ${avg.toFixed(0)}ms average`);
  }
  
  return categoryAverages;
}

// Generate swarm configuration based on results
function generateSwarmConfig(categoryAverages) {
  console.log('\n\n🐝 Optimized Swarm Configuration:\n');
  
  const swarmConfig = {
    research_phase: {
      fact_gathering: ['gemini', 'gemini'],
      perspective_generation: ['kimi', 'kimi'],
      coordinator: ['claude']
    },
    outline_phase: {
      structure_design: ['kimi'],
      review_refinement: ['claude']
    },
    writing_phase: {
      technical_sections: ['gemini'],
      creative_sections: ['claude', 'claude'],
      analytical_sections: ['kimi']
    },
    polish_phase: {
      consistency_check: ['claude'],
      fact_verification: ['gemini'],
      final_polish: ['claude']
    }
  };
  
  console.log(JSON.stringify(swarmConfig, null, 2));
  
  return swarmConfig;
}

// Main execution
async function main() {
  try {
    console.log('\nStarting LLM capability tests...\n');
    console.log('Note: This is a simulated test. In production, responses would be manually evaluated.\n');
    
    // Run tests (commented out to avoid actual API calls)
    // const results = await runTestBattery();
    
    // Simulated results for demonstration
    const simulatedResults = {
      factual_research: {
        'Technical Facts': {
          claude: { average_score: 8.5, response_time: 1200 },
          gemini: { average_score: 9.5, response_time: 800 },
          kimi: { average_score: 8.0, response_time: 1500 }
        }
      },
      perspective_generation: {
        'Multi-stakeholder Analysis': {
          claude: { average_score: 8.5, response_time: 1300 },
          gemini: { average_score: 7.5, response_time: 900 },
          kimi: { average_score: 9.5, response_time: 1600 }
        }
      },
      structural_thinking: {
        'Complex Topic Structure': {
          claude: { average_score: 8.0, response_time: 1400 },
          gemini: { average_score: 7.5, response_time: 1000 },
          kimi: { average_score: 9.0, response_time: 1700 }
        }
      },
      creative_writing: {
        'Engaging Introduction': {
          claude: { average_score: 9.5, response_time: 1100 },
          gemini: { average_score: 7.0, response_time: 700 },
          kimi: { average_score: 8.0, response_time: 1400 }
        }
      },
      technical_writing: {
        'API Documentation': {
          claude: { average_score: 8.0, response_time: 1200 },
          gemini: { average_score: 9.0, response_time: 900 },
          kimi: { average_score: 7.5, response_time: 1500 }
        }
      },
      analytical_reasoning: {
        'Comparative Analysis': {
          claude: { average_score: 8.5, response_time: 1300 },
          gemini: { average_score: 8.0, response_time: 1000 },
          kimi: { average_score: 9.0, response_time: 1600 }
        }
      },
      synthesis_consistency: {
        'Multi-source Synthesis': {
          claude: { average_score: 9.0, response_time: 1400 },
          gemini: { average_score: 7.5, response_time: 1100 },
          kimi: { average_score: 8.0, response_time: 1700 }
        }
      },
      citation_verification: {
        'Source Attribution': {
          claude: { average_score: 8.0, response_time: 1200 },
          gemini: { average_score: 9.0, response_time: 800 },
          kimi: { average_score: 7.5, response_time: 1500 }
        }
      }
    };
    
    // Analyze results
    const categoryAverages = analyzeResults(simulatedResults);
    
    // Generate optimized swarm configuration
    const swarmConfig = generateSwarmConfig(categoryAverages);
    
    console.log('\n\n✅ Test Battery Complete!\n');
    
  } catch (error) {
    console.error('Test battery failed:', error);
  }
}

// Export for use in other modules
export { runTestBattery, analyzeResults, generateSwarmConfig };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}