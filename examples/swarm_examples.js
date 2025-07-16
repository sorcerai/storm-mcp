#!/usr/bin/env node

// Example scripts for swarm-based article generation with STORM MCP
// These examples demonstrate how multiple LLMs collaborate on articles

console.log(`
╔═══════════════════════════════════════════════════════════╗
║           STORM MCP - Swarm Examples                      ║
║                                                           ║
║  Multiple LLMs working together on article generation     ║
╚═══════════════════════════════════════════════════════════╝
`);

// Example 1: Basic Swarm Article Generation
console.log(`
Example 1: Basic Swarm Article Generation
=========================================

Use this to generate an article with multiple LLMs working together:

storm_run_swarm_pipeline({
  topic: "The Future of Quantum Computing",
  swarm_type: "claude-flow"
})

This will:
- 🔍 Gemini agents handle factual research
- 🧠 Kimi agents generate perspectives and outline  
- ✍️ Claude agents write and polish the article
- ⚡ All work happens in parallel!

`);

// Example 2: Comprehensive Research Article
console.log(`
Example 2: Comprehensive Research Article  
=========================================

For in-depth academic-style articles:

storm_run_swarm_pipeline({
  topic: "Climate Change Mitigation Technologies",
  swarm_type: "claude-flow",
  research_depth: "deep",
  article_length: "comprehensive"
})

Features:
- Deep research with 10+ sources per perspective
- 7,000+ word comprehensive article
- Multiple fact-checking passes by Gemini
- Advanced polishing by Claude

`);

// Example 3: Technical Documentation
console.log(`
Example 3: Technical Documentation
==================================

For technical topics requiring accuracy:

storm_run_swarm_pipeline({
  topic: "Implementing Zero-Knowledge Proofs in Blockchain",
  swarm_type: "ruv-swarm",
  research_depth: "deep",
  article_length: "long"
})

Swarm allocation:
- Gemini: Technical sections, code examples, implementation details
- Kimi: Theoretical analysis, mathematical proofs, comparisons
- Claude: Introduction, practical applications, conclusions

`);

// Example 4: Business Analysis Report
console.log(`
Example 4: Business Analysis Report
===================================

For business and market analysis:

storm_run_swarm_pipeline({
  topic: "AI Transformation in Traditional Retail Industry",
  swarm_type: "claude-flow",
  research_depth: "standard",
  article_length: "medium"
})

Task distribution:
- Gemini: Market data, statistics, case studies
- Kimi: Pattern analysis, trend identification, insights
- Claude: Executive summary, strategic recommendations

`);

// Example 5: Cultural & Social Topic
console.log(`
Example 5: Cultural & Social Topic
==================================

For nuanced topics requiring multiple perspectives:

storm_run_swarm_pipeline({
  topic: "The Impact of Social Media on Mental Health Across Cultures",
  swarm_type: "claude-flow",
  research_depth: "deep",
  article_length: "comprehensive"
})

Collaborative approach:
- Kimi: Cross-cultural perspectives, global patterns
- Gemini: Scientific studies, medical research
- Claude: Synthesis, ethical considerations, recommendations

`);

// Example 6: Step-by-Step Swarm Control
console.log(`
Example 6: Step-by-Step Swarm Control
=====================================

For fine-grained control over the swarm:

// Step 1: Create the swarm
const swarmResult = await storm_create_swarm({
  topic: "Artificial General Intelligence: Progress and Challenges",
  swarm_type: "claude-flow",
  topology: "hierarchical",
  max_agents: 8
})

// Step 2: Monitor swarm status
const status = await storm_get_swarm_status({
  swarm_id: swarmResult.swarm_id
})

// Step 3: Run the pipeline
const article = await storm_run_swarm_pipeline({
  topic: "Artificial General Intelligence: Progress and Challenges",
  swarm_type: "claude-flow",
  research_depth: "deep",
  article_length: "comprehensive"
})

`);

// Example 7: Comparing Swarm vs Single LLM
console.log(`
Example 7: Comparing Swarm vs Single LLM
========================================

To compare performance:

// Traditional single LLM approach
const singleLLM = await storm_run_full_pipeline({
  topic: "Renewable Energy Solutions for Urban Areas",
  llm_provider: "claude",
  research_depth: "standard",
  article_length: "medium"
})

// Swarm approach (same topic)
const swarmResult = await storm_run_swarm_pipeline({
  topic: "Renewable Energy Solutions for Urban Areas",
  swarm_type: "claude-flow",
  research_depth: "standard",
  article_length: "medium"
})

Compare:
- Speed: Swarm is 2.8-4.4x faster due to parallelization
- Quality: Swarm leverages each LLM's strengths
- Depth: More diverse perspectives with swarm

`);

// Example 8: Real-World Use Case - News Article
console.log(`
Example 8: Real-World Use Case - News Article
=============================================

For current events requiring multiple viewpoints:

storm_run_swarm_pipeline({
  topic: "2024 Advances in Space Exploration Technology",
  swarm_type: "claude-flow",
  research_depth: "deep",
  article_length: "long",
  parallelization: true
})

Swarm benefits:
- Gemini: Latest SpaceX, NASA, ESA mission data
- Kimi: Analysis of global space programs, trends
- Claude: Narrative structure, future implications

`);

// Tips and Best Practices
console.log(`
Tips and Best Practices
=======================

1. Choose the Right Swarm Type:
   - claude-flow: Best for general articles, creative content
   - ruv-swarm: Better for technical, specialized topics

2. Optimal Agent Distribution:
   - Research-heavy: More Gemini agents
   - Analysis-heavy: More Kimi agents  
   - Writing-heavy: More Claude agents

3. Performance Optimization:
   - Enable parallelization for faster results
   - Use "deep" research for important topics
   - Use "comprehensive" length for detailed coverage

4. Monitor Progress:
   - Use storm_get_swarm_status to track agents
   - Check agent utilization metrics
   - Review task completion rates

5. Quality Control:
   - Gemini automatically fact-checks all content
   - Claude ensures consistency and flow
   - Kimi validates logical structure

`);

// Advanced Configuration
console.log(`
Advanced Configuration
======================

Custom topology example:

storm_create_swarm({
  topic: "Your Topic",
  swarm_type: "claude-flow",
  topology: "mesh",        // All agents communicate freely
  max_agents: 12           // More agents for complex topics
})

Topology options:
- hierarchical: Coordinator manages others (default)
- mesh: Free communication between all agents
- ring: Sequential processing with handoffs
- star: Central hub coordinates all agents

`);

console.log(`
═══════════════════════════════════════════════════════════
Ready to generate articles with swarm intelligence!
Use these examples in Claude Code with the STORM MCP server.
═══════════════════════════════════════════════════════════
`);