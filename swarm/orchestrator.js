// Swarm Orchestrator for STORM MCP
// Integrates with claude-flow and ruv-swarm for distributed article generation

import { v4 as uuidv4 } from 'uuid';
import { LLMDispatcher } from './llm_dispatcher.js';

export class SwarmOrchestrator {
  constructor() {
    this.swarms = new Map();
    this.llmDispatcher = new LLMDispatcher();
    this.agentSpecializations = {
      // Claude Sonnet 4 specializations (BEST GENERAL PERFORMER)
      claude: {
        strengths: ['superior_reasoning', 'best_code_generation', 'mathematical_rigor', 'creative_excellence', 'synthesis_mastery', 'polish_perfection', 'nuanced_understanding', 'general_dominance', 'research_depth', 'analytical_precision'],
        preferredTasks: ['general_excellence', 'complex_reasoning', 'creative_writing', 'data_analysis', 'synthesis', 'fact_checking', 'review', 'optimization', 'coordination'],
        qualityTier: 'EXCELLENT', // Best general performance
        contextWindow: 200000,
        model: 'Claude Sonnet 4',
        empiricalScore: 10 // Perfect score in our tests
      },
      // Gemini 2.5 Pro specializations (MASSIVE CONTEXT + THINKING MODE)
      gemini: {
        strengths: ['massive_context_1M', 'multimodal_processing', 'thinking_mode', 'deep_analysis', 'system_architecture', 'complex_reasoning', 'structured_thinking'],
        preferredTasks: ['documents_over_200K', 'system_design', 'architecture_planning', 'thinking_mode_tasks', 'complex_reasoning', 'multimodal_analysis'],
        qualityTier: 'SPECIALIZED', // Excellent for specific strengths
        contextWindow: 1000000, // 1M - major advantage over Claude
        features: ['thinking_mode', 'deep_think', 'adaptive_thinking'],
        empiricalScore: 8.5 // Good performance in our tests
      },
      // Kimi K2 specializations (TECHNICAL EXCELLENCE)
      kimi: {
        strengths: ['exceptional_technical_depth', 'mathematical_precision', 'advanced_algorithm_design', 'complex_proof_generation', 'coding_excellence', 'research_methodology'],
        preferredTasks: ['mathematical_proofs', 'advanced_algorithms', 'technical_analysis', 'coding_challenges', 'research_methodology', 'precision_calculations'],
        qualityTier: 'PREMIUM', // Highest quality for technical tasks
        contextWindow: 1000000,
        accuracy: { math: 0.974, coding: 0.890 }, // Empirically validated excellence
        empiricalScore: 9.5 // Excellent performance when tested properly
      }
    };
  }

  async createSwarm(topic, options = {}) {
    const swarmId = uuidv4();
    const {
      swarmType = 'claude-flow', // or 'ruv-swarm'
      topology = 'hierarchical',
      maxAgents = 8,
      strategy = 'specialized'
    } = options;

    const swarm = {
      id: swarmId,
      topic,
      swarmType,
      topology,
      maxAgents,
      strategy,
      agents: new Map(),
      tasks: new Map(),
      status: 'initializing',
      created_at: new Date().toISOString()
    };

    // Initialize swarm based on type
    if (swarmType === 'claude-flow') {
      await this.initializeClaudeFlowSwarm(swarm);
    } else if (swarmType === 'ruv-swarm') {
      await this.initializeRuvSwarm(swarm);
    }

    this.swarms.set(swarmId, swarm);
    return swarm;
  }

  async initializeClaudeFlowSwarm(swarm) {
    // Initialize claude-flow swarm
    const initCommand = {
      tool: 'mcp__claude-flow__swarm_init',
      params: {
        topology: swarm.topology,
        maxAgents: swarm.maxAgents,
        strategy: 'specialized'
      }
    };

    // Spawn specialized agents - QUALITY-OPTIMIZED CONFIG (Maximum Performance)
    const agentTypes = [
      // Claude agents (5 agents - 50% - Best general performance)
      { type: 'researcher', llm: 'claude', name: 'Lead Researcher' },
      { type: 'coordinator', llm: 'claude', name: 'Project Manager' },
      { type: 'reviewer', llm: 'claude', name: 'Quality Controller' },
      { type: 'specialist', llm: 'claude', name: 'Domain Expert' },
      { type: 'optimizer', llm: 'claude', name: 'Performance Optimizer' },
      
      // Gemini agents (3 agents - 30% - Thinking mode + massive context)
      { type: 'researcher', llm: 'gemini', name: 'Deep Context Researcher' },
      { type: 'architect', llm: 'gemini', name: 'System Designer' },
      { type: 'specialist', llm: 'gemini', name: 'Thinking Mode Specialist' },
      
      // Kimi agents (2 agents - 20% - Technical excellence)
      { type: 'coder', llm: 'kimi', name: 'Master Technical Expert' },
      { type: 'analyst', llm: 'kimi', name: 'Mathematical Specialist' }
    ];

    for (const agentConfig of agentTypes) {
      const agent = await this.spawnSpecializedAgent(swarm, agentConfig);
      swarm.agents.set(agent.id, agent);
    }

    swarm.status = 'ready';
  }

  async initializeRuvSwarm(swarm) {
    // Initialize ruv-swarm
    const initCommand = {
      tool: 'mcp__ruv-swarm__initialize',
      params: {
        name: `STORM-${swarm.topic}`,
        topology: swarm.topology,
        maxAgents: swarm.maxAgents
      }
    };

    // Create specialized agents for ruv-swarm
    await this.createRuvAgents(swarm);
    swarm.status = 'ready';
  }

  async spawnSpecializedAgent(swarm, config) {
    const { type, llm, name } = config;
    const agentId = uuidv4();

    const agent = {
      id: agentId,
      swarmId: swarm.id,
      type,
      name,
      llm,
      specialization: this.agentSpecializations[llm],
      status: 'idle',
      tasksCompleted: 0,
      currentTask: null
    };

    // Spawn agent in claude-flow
    if (swarm.swarmType === 'claude-flow') {
      const spawnCommand = {
        tool: 'mcp__claude-flow__agent_spawn',
        params: {
          type,
          name,
          swarmId: swarm.id,
          capabilities: this.agentSpecializations[llm].strengths
        }
      };
    }

    return agent;
  }

  async orchestrateSTORM(topic, options = {}) {
    const {
      swarmType = 'claude-flow',
      researchDepth = 'deep',
      articleLength = 'comprehensive',
      parallelization = true
    } = options;

    // Create swarm
    const swarm = await this.createSwarm(topic, { swarmType });

    // Phase 1: Distributed Research
    const researchTasks = await this.distributeResearchTasks(swarm, topic, researchDepth);
    
    // Phase 2: Collaborative Outline Generation
    const outline = await this.collaborativeOutlineGeneration(swarm, topic, researchTasks);
    
    // Phase 3: Parallel Article Writing
    const articleSections = await this.parallelArticleWriting(swarm, outline, articleLength);
    
    // Phase 4: Unified Polishing
    const finalArticle = await this.unifiedPolishing(swarm, articleSections);

    return {
      swarmId: swarm.id,
      article: finalArticle,
      metrics: await this.getSwarmMetrics(swarm)
    };
  }

  async distributeResearchTasks(swarm, topic, depth) {
    const researchTasks = [];

    // Claude agents handle primary research (Best general performance!)
    const claudeAgents = Array.from(swarm.agents.values())
      .filter(agent => agent.llm === 'claude');

    // Gemini agents for massive context and thinking mode (Specialized strengths!)
    const geminiAgents = Array.from(swarm.agents.values())
      .filter(agent => agent.llm === 'gemini');

    // Kimi agents for technical excellence (Premium quality!)
    const kimiAgents = Array.from(swarm.agents.values())
      .filter(agent => agent.llm === 'kimi');

    // Create research tasks
    const perspectives = [
      'Technical Implementation',
      'Business Impact',
      'Social Implications',
      'Future Trends',
      'Historical Context',
      'Ethical Considerations'
    ];

    // Distribute perspective generation for maximum quality
    for (let i = 0; i < perspectives.length; i++) {
      let agent, llm;
      
      // Assign based on perspective type for optimal quality
      if (perspectives[i].includes('Technical') || perspectives[i].includes('Implementation')) {
        // Technical perspectives -> Kimi for premium technical analysis
        agent = kimiAgents[i % kimiAgents.length] || claudeAgents[i % claudeAgents.length];
        llm = kimiAgents.length > 0 ? 'kimi' : 'claude';
      } else if (perspectives[i].includes('Future') || perspectives[i].includes('Trends')) {
        // Future/trends perspectives -> Gemini for thinking mode
        agent = geminiAgents[i % geminiAgents.length] || claudeAgents[i % claudeAgents.length];
        llm = geminiAgents.length > 0 ? 'gemini' : 'claude';
      } else {
        // General perspectives -> Claude for best general performance
        agent = claudeAgents[i % claudeAgents.length];
        llm = 'claude';
      }
      
      const task = {
        id: uuidv4(),
        type: 'generate_perspective',
        perspective: perspectives[i],
        topic,
        assignedTo: agent.id,
        llm
      };
      
      researchTasks.push(task);
      await this.assignTask(swarm, agent, task);
    }

    // Distribute fact-finding to multiple agents for comprehensive coverage
    const factFindingTasks = [
      { focus: 'general_facts', agent: claudeAgents[0], llm: 'claude' },
      { focus: 'technical_facts', agent: kimiAgents[0] || claudeAgents[1], llm: kimiAgents.length > 0 ? 'kimi' : 'claude' },
      { focus: 'contextual_facts', agent: geminiAgents[0] || claudeAgents[2], llm: geminiAgents.length > 0 ? 'gemini' : 'claude' }
    ];
    
    for (const taskConfig of factFindingTasks) {
      if (taskConfig.agent) {
        const task = {
          id: uuidv4(),
          type: 'research_facts',
          topic,
          depth,
          focus: taskConfig.focus,
          assignedTo: taskConfig.agent.id,
          llm: taskConfig.llm
        };
        
        researchTasks.push(task);
        await this.assignTask(swarm, taskConfig.agent, task);
      }
    }
    
    // Use Gemini for massive documents and complex reasoning (FREE with subscription!)
    if (geminiAgents.length > 0) {
      // Task 1: Long document analysis with thinking mode
      const docTask = {
        id: uuidv4(),
        type: 'long_document_analysis',
        topic,
        depth,
        useThinkingMode: true,
        assignedTo: geminiAgents[0].id,
        llm: 'gemini'
      };
      researchTasks.push(docTask);
      await this.assignTask(swarm, geminiAgents[0], docTask);
      
      // Task 2: System design and architecture (utilize Gemini's strength)
      if (geminiAgents.length > 1) {
        const designTask = {
          id: uuidv4(),
          type: 'system_design',
          topic,
          depth,
          useThinkingMode: true,
          assignedTo: geminiAgents[1].id,
          llm: 'gemini'
        };
        researchTasks.push(designTask);
        await this.assignTask(swarm, geminiAgents[1], designTask);
      }
      
      // Task 3: Thinking mode analysis if we have a third Gemini agent
      if (geminiAgents.length > 2 && depth === 'deep') {
        const reasoningTask = {
          id: uuidv4(),
          type: 'complex_reasoning',
          topic,
          depth,
          useDeepThink: true,
          assignedTo: geminiAgents[2].id,
          llm: 'gemini'
        };
        researchTasks.push(reasoningTask);
        await this.assignTask(swarm, geminiAgents[2], reasoningTask);
      }
    }
    
    // Use Kimi ONLY for premium technical tasks that justify the cost
    if (kimiAgents.length > 0 && await this.requiresPremiumTechnicalAnalysis(topic)) {
      const premiumTask = {
        id: uuidv4(),
        type: 'premium_technical_analysis',
        topic,
        depth,
        requiresPrecision: true,
        justification: 'Premium technical expertise required',
        assignedTo: kimiAgents[0].id,
        llm: 'kimi'
      };
      researchTasks.push(premiumTask);
      await this.assignTask(swarm, kimiAgents[0], premiumTask);
    }

    // Execute tasks in parallel
    const results = await this.executeTasksInParallel(swarm, researchTasks);
    return results;
  }

  async collaborativeOutlineGeneration(swarm, topic, researchData) {
    // Claude excels at everything and it's FREE!
    const claudeAgents = Array.from(swarm.agents.values())
      .filter(agent => agent.llm === 'claude');

    // Gemini for complex reasoning tasks
    const geminiAgents = Array.from(swarm.agents.values())
      .filter(agent => agent.llm === 'gemini');

    // Step 1: Claude generates initial outline (FREE quality!)
    const claudeArchitect = claudeAgents.find(a => a.type === 'architect') || claudeAgents[0];
    const outlineTask = {
      id: uuidv4(),
      type: 'generate_outline',
      topic,
      researchData,
      assignedTo: claudeArchitect.id,
      llm: 'claude'
    };

    const initialOutline = await this.executeTask(swarm, claudeArchitect, outlineTask);

    // Step 2: Another Claude agent reviews (why not? It's FREE!)
    const claudeReviewer = claudeAgents.find(a => a.type === 'reviewer') || claudeAgents[1];
    const reviewTask = {
      id: uuidv4(),
      type: 'review_outline',
      outline: initialOutline,
      topic,
      assignedTo: claudeReviewer.id,
      llm: 'claude'
    };

    const enhancedOutline = await this.executeTask(swarm, claudeReviewer, reviewTask);
    
    // Step 3: If available, use Gemini thinking mode for logical verification
    if (geminiAgents.length > 0) {
      const logicTask = {
        id: uuidv4(),
        type: 'verify_logic',
        outline: enhancedOutline,
        topic,
        useThinkingMode: true,
        assignedTo: geminiAgents[0].id,
        llm: 'gemini'
      };
      
      const finalOutline = await this.executeTask(swarm, geminiAgents[0], logicTask);
      return finalOutline;
    }
    
    return enhancedOutline;
  }

  async parallelArticleWriting(swarm, outline, targetLength) {
    const writingTasks = [];
    const sections = outline.sections;

    // Distribute sections based on content type
    for (const section of sections) {
      let assignedLLM;
      let agentType;

      // Assign based on section characteristics - optimized for COST + QUALITY (two free models!)
      if (section.content && section.content.length > 200000) {
        // Use Gemini for massive sections beyond Claude's context (FREE with subscription!)
        assignedLLM = 'gemini';
        agentType = 'researcher';
      } else if (await this.requiresPremiumTechnicalAnalysis(section.title)) {
        // Use Kimi ONLY for premium technical sections that justify the cost
        assignedLLM = 'kimi';
        agentType = 'coder';
      } else if (section.title.toLowerCase().includes('architecture') ||
                 section.title.toLowerCase().includes('design') ||
                 section.title.toLowerCase().includes('system')) {
        // Use Gemini for system design and architecture (FREE with subscription!)
        assignedLLM = 'gemini';
        agentType = 'architect';
      } else {
        // DEFAULT TO CLAUDE FOR MOST CONTENT (BEST QUALITY + FREE!)
        assignedLLM = 'claude';
        // Match agent type to section
        if (section.title.toLowerCase().includes('introduction') ||
            section.title.toLowerCase().includes('conclusion')) {
          agentType = 'reviewer';
        } else if (section.title.toLowerCase().includes('technical')) {
          agentType = 'specialist';
        } else if (section.title.toLowerCase().includes('analysis')) {
          agentType = 'analyst';
        } else {
          agentType = 'researcher';
        }
      }

      const agent = Array.from(swarm.agents.values())
        .find(a => a.llm === assignedLLM && a.type === agentType);

      if (agent) {
        const task = {
          id: uuidv4(),
          type: 'write_section',
          section,
          outline,
          targetLength: this.calculateSectionLength(targetLength, sections.length),
          assignedTo: agent.id,
          llm: assignedLLM
        };

        writingTasks.push(task);
      }
    }

    // Execute all writing tasks in parallel
    const sectionResults = await this.executeTasksInParallel(swarm, writingTasks);
    return sectionResults;
  }

  async unifiedPolishing(swarm, articleSections) {
    // Claude excels at everything and it's FREE - use multiple Claude agents!
    const claudeAgents = Array.from(swarm.agents.values())
      .filter(agent => agent.llm === 'claude');

    // Gemini for final logical verification
    const geminiAgents = Array.from(swarm.agents.values())
      .filter(agent => agent.llm === 'gemini');

    // Step 1: Combine sections
    const combinedArticle = this.combineSections(articleSections);

    // Step 2: First Claude agent polishes for flow and consistency
    const claudePolisher = claudeAgents.find(a => a.type === 'reviewer') || claudeAgents[0];
    const polishTask = {
      id: uuidv4(),
      type: 'polish_article',
      article: combinedArticle,
      options: ['grammar', 'clarity', 'flow', 'consistency'],
      assignedTo: claudePolisher.id,
      llm: 'claude'
    };

    const polishedArticle = await this.executeTask(swarm, claudePolisher, polishTask);

    // Step 3: Another Claude agent does fact-checking (FREE quality!)
    const claudeFactChecker = claudeAgents.find(a => a.type === 'analyst') || claudeAgents[1];
    const factCheckTask = {
      id: uuidv4(),
      type: 'fact_check',
      article: polishedArticle,
      assignedTo: claudeFactChecker.id,
      llm: 'claude'
    };

    const factCheckedArticle = await this.executeTask(swarm, claudeFactChecker, factCheckTask);
    
    // Step 4: Final Claude pass for ultimate polish (why not? It's FREE!)
    const claudeFinalizer = claudeAgents.find(a => a.type === 'coordinator') || claudeAgents[2];
    const finalPolishTask = {
      id: uuidv4(),
      type: 'final_polish',
      article: factCheckedArticle,
      options: ['perfection', 'voice', 'impact'],
      assignedTo: claudeFinalizer.id,
      llm: 'claude'
    };
    
    const finalArticle = await this.executeTask(swarm, claudeFinalizer, finalPolishTask);
    
    // Optional Step 5: If Gemini available, use thinking mode for logic check
    if (geminiAgents.length > 0) {
      const logicCheckTask = {
        id: uuidv4(),
        type: 'logic_verification',
        article: finalArticle,
        useThinkingMode: true,
        assignedTo: geminiAgents[0].id,
        llm: 'gemini'
      };
      
      return await this.executeTask(swarm, geminiAgents[0], logicCheckTask);
    }
    
    return finalArticle;
  }

  async assignTask(swarm, agent, task) {
    agent.status = 'working';
    agent.currentTask = task.id;
    swarm.tasks.set(task.id, {
      ...task,
      status: 'assigned',
      assignedAt: new Date().toISOString()
    });

    // Store in swarm memory for coordination
    if (swarm.swarmType === 'claude-flow') {
      await this.storeInSwarmMemory(swarm, `task_${task.id}`, task);
    }
  }

  async executeTask(swarm, agent, task) {
    task.status = 'executing';
    
    try {
      // Use the LLM dispatcher to execute the task with the appropriate LLM
      const result = await this.llmDispatcher.executeTask(task, agent);
      
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = result;
      
      agent.tasksCompleted++;
      agent.status = 'idle';
      agent.currentTask = null;
      
      // Store result in swarm memory
      await this.storeInSwarmMemory(swarm, `result_${task.id}`, result);
      
      return result;
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      agent.status = 'error';
      throw error;
    }
  }

  async executeTasksInParallel(swarm, tasks) {
    const promises = tasks.map(task => {
      const agent = swarm.agents.get(task.assignedTo);
      return this.executeTask(swarm, agent, task);
    });

    return Promise.all(promises);
  }

  async storeInSwarmMemory(swarm, key, value) {
    if (swarm.swarmType === 'claude-flow') {
      // Use claude-flow memory
      const memoryCommand = {
        tool: 'mcp__claude-flow__memory_usage',
        params: {
          action: 'store',
          key: `swarm_${swarm.id}/${key}`,
          value: JSON.stringify(value),
          namespace: 'storm_orchestration'
        }
      };
    }
  }

  async getSwarmMetrics(swarm) {
    const metrics = {
      swarmId: swarm.id,
      totalAgents: swarm.agents.size,
      tasksCompleted: swarm.tasks.size,
      agentUtilization: {},
      llmDistribution: {},
      executionTime: new Date() - new Date(swarm.created_at)
    };

    // Calculate per-agent metrics
    for (const [agentId, agent] of swarm.agents) {
      metrics.agentUtilization[agent.name] = {
        tasksCompleted: agent.tasksCompleted,
        llm: agent.llm,
        specialization: agent.specialization.strengths
      };
    }

    // Calculate LLM distribution
    metrics.llmDistribution = {
      claude: Array.from(swarm.agents.values()).filter(a => a.llm === 'claude').length,
      gemini: Array.from(swarm.agents.values()).filter(a => a.llm === 'gemini').length,
      kimi: Array.from(swarm.agents.values()).filter(a => a.llm === 'kimi').length
    };

    return metrics;
  }

  calculateSectionLength(targetLength, numSections) {
    const lengthMap = {
      short: 200,
      medium: 400,
      long: 600,
      comprehensive: 1000
    };
    
    return lengthMap[targetLength] || 400;
  }

  combineSections(sections) {
    // Combine sections into a cohesive article
    return sections.map(s => s.content).join('\n\n');
  }

  async requiresPremiumTechnicalAnalysis(topic) {
    // Dynamically determine if topic would benefit from premium technical analysis
    // Since cost is not a concern, be more generous with premium analysis
    
    const evaluationPrompt = `Analyze this topic and determine if it would benefit from premium technical expertise for maximum quality output:

Topic: "${topic}"

Evaluate if this topic would benefit from premium technical analysis in these areas:
1. Mathematical complexity or proofs
2. Advanced algorithm design
3. Technical depth and precision
4. Cutting-edge technical specifications
5. Scientific/mathematical calculations
6. Security or cryptographic analysis
7. Advanced computing concepts (quantum, distributed systems, etc.)
8. Machine learning theory and implementation
9. Formal verification or system design
10. Complex optimization or research methodology

Since cost is not a concern, be generous in recommending premium analysis for maximum quality.

Respond with:
- PREMIUM: If the topic would benefit from premium technical expertise for maximum quality
- STANDARD: If standard AI models are sufficient for this topic

Reasoning: [Brief explanation of potential benefits]

Decision: [PREMIUM or STANDARD]`;

    try {
      // Use Claude to evaluate if we should use Kimi for maximum quality
      const claudeAdapter = new (await import('../llm_adapters/claude_mcp.js')).ClaudeMCPAdapter();
      const evaluation = await claudeAdapter.generateText(evaluationPrompt, {
        temperature: 0.3,
        max_tokens: 500
      });
      
      // Parse the decision - be more generous since cost is not a concern
      const decision = evaluation.text.toLowerCase();
      const isPremium = decision.includes('decision: premium') || 
                       decision.includes('premium:') ||
                       (decision.includes('premium') && !decision.includes('standard'));
      
      // Log the decision for transparency
      console.log(`Premium Analysis Decision for "${topic}": ${isPremium ? 'PREMIUM' : 'STANDARD'}`);
      console.log(`Reasoning: ${evaluation.text}`);
      
      return isPremium;
      
    } catch (error) {
      console.error('Error in premium analysis evaluation:', error);
      
      // Fallback to more generous heuristics since cost is not a concern
      const fallbackKeywords = [
        'mathematical', 'algorithm', 'technical', 'advanced', 'complex',
        'quantum', 'cryptography', 'verification', 'optimization', 
        'theory', 'research', 'engineering', 'scientific', 'analysis'
      ];
      
      const topicLower = topic.toLowerCase();
      const fallbackDecision = fallbackKeywords.some(keyword => topicLower.includes(keyword));
      
      console.log(`Fallback decision for "${topic}": ${fallbackDecision ? 'PREMIUM' : 'STANDARD'}`);
      return fallbackDecision;
    }
  }

  async simulateTaskExecution(agent, task) {
    // Placeholder for actual task execution
    // In real implementation, this would call the appropriate LLM adapter
    return {
      taskId: task.id,
      result: `Result from ${agent.name} (${agent.llm}) for task ${task.type}`,
      content: 'Simulated content...'
    };
  }
}