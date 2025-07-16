#!/usr/bin/env node

// Test the empirically-optimized STORM MCP configuration

import { SwarmOrchestrator } from '../swarm/orchestrator.js';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║     Testing Empirically-Optimized STORM Configuration     ║
╚═══════════════════════════════════════════════════════════╝
`);

async function testConfiguration() {
  const orchestrator = new SwarmOrchestrator();
  
  console.log('🔧 Testing swarm creation with empirical configuration...\n');
  
  // Create a test swarm
  const swarm = await orchestrator.createSwarm('Artificial Intelligence in Healthcare', {
    swarmType: 'claude-flow',
    topology: 'hierarchical',
    maxAgents: 10,
    strategy: 'specialized'
  });
  
  console.log('✅ Swarm created successfully!');
  console.log(`📊 Swarm ID: ${swarm.id}`);
  console.log(`🎯 Topic: ${swarm.topic}`);
  console.log(`👥 Total Agents: ${swarm.agents.size}`);
  
  // Analyze agent distribution
  const agentsByLLM = {
    claude: 0,
    gemini: 0,
    kimi: 0
  };
  
  console.log('\n📋 Agent Distribution (Empirically Optimized):');
  console.log('═'.repeat(60));
  
  for (const [id, agent] of swarm.agents) {
    agentsByLLM[agent.llm]++;
    console.log(`${agent.llm.toUpperCase().padEnd(8)} | ${agent.name.padEnd(25)} | ${agent.type}`);
  }
  
  console.log('═'.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`Claude agents: ${agentsByLLM.claude} (${(agentsByLLM.claude/swarm.agents.size*100).toFixed(0)}%) - FREE & BEST!`);
  console.log(`Gemini agents: ${agentsByLLM.gemini} (${(agentsByLLM.gemini/swarm.agents.size*100).toFixed(0)}%) - Long context only`);
  console.log(`Kimi agents:   ${agentsByLLM.kimi} (${(agentsByLLM.kimi/swarm.agents.size*100).toFixed(0)}%) - Backup only`);
  
  // Display specializations
  console.log('\n🎯 Model Specializations (Empirically Validated):');
  console.log('═'.repeat(60));
  
  for (const [model, spec] of Object.entries(orchestrator.agentSpecializations)) {
    console.log(`\n${model.toUpperCase()}:`);
    console.log(`  Empirical Score: ${spec.empiricalScore || 'N/A'}/100`);
    console.log(`  Cost Tier: ${spec.costTier}`);
    console.log(`  Context Window: ${spec.contextWindow.toLocaleString()} tokens`);
    console.log(`  Best For: ${spec.preferredTasks.slice(0, 3).join(', ')}`);
  }
  
  // Test task routing
  console.log('\n\n🔄 Testing Task Routing Logic:');
  console.log('═'.repeat(60));
  
  const testTasks = [
    { type: 'generate_perspective', desc: 'Generate perspective' },
    { type: 'research_facts', desc: 'Research facts' },
    { type: 'write_section', desc: 'Write article section' },
    { type: 'polish_article', desc: 'Polish final article' },
    { type: 'mathematical_analysis', desc: 'Mathematical proof' },
    { type: 'long_document_analysis', desc: 'Analyze 500K token doc' }
  ];
  
  for (const task of testTasks) {
    const routing = orchestrator.llmDispatcher.taskRouting[task.type];
    const preferred = routing?.preferred || 'claude';
    console.log(`${task.desc.padEnd(25)} → ${preferred.toUpperCase()} (${routing?.reason || 'default to Claude'})`);
  }
  
  console.log('\n✅ Configuration test complete!');
  console.log('\n💡 Key Insight: Claude dominates because it\'s both FREE and empirically best!');
}

// Run the test
testConfiguration().catch(console.error);