// LLM Dispatcher for Swarm Orchestration
// Routes tasks to appropriate LLM adapters based on specialization

import { ClaudeMCPAdapter } from '../llm_adapters/claude_mcp.js';
import { GeminiMCPAdapter } from '../llm_adapters/gemini_mcp.js';
import { KimiMCPAdapter } from '../llm_adapters/kimi_mcp.js';

export class LLMDispatcher {
  constructor() {
    // Initialize all adapters - Claude is FREE, so use it everywhere!
    this.adapters = {
      claude: {
        conversation: new ClaudeMCPAdapter('claude-sonnet-4'),
        question: new ClaudeMCPAdapter('claude-sonnet-4'),
        outline: new ClaudeMCPAdapter('claude-sonnet-4'),
        article: new ClaudeMCPAdapter('claude-sonnet-4'),
        polish: new ClaudeMCPAdapter('claude-sonnet-4')
      },
      gemini: {
        conversation: new GeminiMCPAdapter('gemini-2.5-pro'),
        question: new GeminiMCPAdapter('gemini-2.5-pro'),
        outline: new GeminiMCPAdapter('gemini-2.5-pro-thinking'),
        article: new GeminiMCPAdapter('gemini-2.5-pro'),
        polish: new GeminiMCPAdapter('gemini-2.5-pro-deep')
      },
      kimi: this.initializeKimiAdapters()
    };

    // Task routing rules - OPTIMIZED FOR COST (TWO FREE MODELS!)
    this.taskRouting = {
      // Research tasks
      'generate_perspective': {
        preferred: 'claude',
        fallback: 'gemini',
        reason: 'Claude is FREE and has excellent analytical capabilities'
      },
      'research_facts': {
        preferred: 'claude',
        fallback: 'gemini',
        reason: 'Claude is FREE and highly accurate'
      },
      'fact_check': {
        preferred: 'claude',
        fallback: 'gemini',
        reason: 'Claude is FREE with excellent verification abilities'
      },
      'long_document_analysis': {
        preferred: 'gemini',
        fallback: 'claude',
        reason: 'Gemini 2.5 Pro has 1M context (FREE with subscription!)'
      },
      'system_design': {
        preferred: 'gemini',
        fallback: 'claude',
        reason: 'Gemini excels at system design (FREE with subscription!)'
      },
      'complex_reasoning': {
        preferred: 'gemini',
        fallback: 'claude',
        reason: 'Gemini 2.5 Pro has specialized thinking mode (FREE!)'
      },
      'premium_technical_analysis': {
        preferred: 'kimi',
        fallback: 'claude',
        reason: 'Kimi K2 has premium technical expertise (selective use)'
      },
      
      // Outline tasks
      'generate_outline': {
        preferred: 'claude',
        fallback: 'gemini',
        reason: 'Claude is FREE and excellent at structure'
      },
      'review_outline': {
        preferred: 'claude',
        fallback: 'gemini',
        reason: 'Claude is FREE with nuanced understanding'
      },
      'verify_logic': {
        preferred: 'gemini',
        fallback: 'claude',
        reason: 'Gemini thinking mode for logical verification'
      },
      
      // Writing tasks
      'write_section': {
        dynamic: true, // Route based on section content
        technical: 'claude',     // Claude is FREE!
        creative: 'claude',      // Claude is FREE!
        analytical: 'claude',    // Claude is FREE!
        architecture: 'gemini',  // Gemini is FREE with subscription!
        mathematical: 'kimi',    // Only use Kimi for premium math proofs
        default: 'claude'        // DEFAULT TO FREE CLAUDE!
      },
      'write_introduction': {
        preferred: 'claude',
        fallback: 'gemini',
        reason: 'Claude is FREE and excels at introductions'
      },
      'write_conclusion': {
        preferred: 'claude',
        fallback: 'gemini',
        reason: 'Claude is FREE and creates great conclusions'
      },
      
      // Polish tasks
      'polish_article': {
        preferred: 'claude',
        fallback: 'gemini',
        reason: 'Claude is FREE and best for polish'
      },
      'final_polish': {
        preferred: 'claude',
        fallback: 'gemini',
        reason: 'Claude is FREE - use multiple passes!'
      },
      'logic_verification': {
        preferred: 'gemini',
        fallback: 'claude',
        reason: 'Gemini thinking mode for final logic check'
      },
      'technical_review': {
        preferred: 'claude',
        fallback: 'kimi',
        reason: 'Claude is FREE with excellent technical understanding'
      }
    };
  }

  initializeKimiAdapters() {
    // Initialize Kimi adapters with proper error handling
    try {
      return {
        conversation: new KimiMCPAdapter('kimi-k2-0711-preview'),
        question: new KimiMCPAdapter('kimi-k2-0711-preview'),
        outline: new KimiMCPAdapter('kimi-k2-0711-preview'),
        article: new KimiMCPAdapter('kimi-k2-0711-preview'),
        polish: new KimiMCPAdapter('kimi-k2-0711-preview')
      };
    } catch (error) {
      console.warn('Kimi API key not configured, using fallback adapters:', error.message);
      // Return null adapters - system will fallback to Claude/Gemini
      return {
        conversation: null,
        question: null,
        outline: null,
        article: null,
        polish: null
      };
    }
  }

  async executeTask(task, agent) {
    const taskType = task.type;
    const routing = this.taskRouting[taskType];
    
    // Determine which LLM to use
    let selectedLLM = agent.llm; // Default to agent's assigned LLM
    
    if (routing) {
      if (routing.dynamic && task.section) {
        // Dynamic routing based on section content
        selectedLLM = await this.routeByContent(task.section, routing);
      } else if (routing.preferred) {
        // Use preferred LLM if available
        selectedLLM = routing.preferred;
      }
    }

    // Get the appropriate adapter
    const adapter = this.getAdapterForTask(selectedLLM, taskType);
    
    // Execute based on task type
    switch (taskType) {
      case 'generate_perspective':
        return this.generatePerspective(adapter, task);
      
      case 'research_facts':
        return this.researchFacts(adapter, task);
      
      case 'generate_outline':
        return this.generateOutline(adapter, task);
      
      case 'review_outline':
        return this.reviewOutline(adapter, task);
      
      case 'write_section':
        return this.writeSection(adapter, task);
      
      case 'polish_article':
        return this.polishArticle(adapter, task);
      
      case 'final_polish':
        return this.polishArticle(adapter, task);
      
      case 'fact_check':
        return this.factCheck(adapter, task);
      
      case 'complex_reasoning':
        return this.complexReasoning(adapter, task);
      
      case 'system_design':
        return this.systemDesign(adapter, task);
      
      case 'premium_technical_analysis':
        return this.premiumTechnicalAnalysis(adapter, task);
      
      case 'mathematical_analysis':
        return this.mathematicalAnalysis(adapter, task);
      
      case 'verify_logic':
        return this.verifyLogic(adapter, task);
      
      case 'logic_verification':
        return this.verifyLogic(adapter, task);
      
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  async routeByContent(section, routing) {
    const title = section.title.toLowerCase();
    const description = (section.description || '').toLowerCase();
    const combined = title + ' ' + description;
    
    // Route based on content - utilizing both free models optimally
    if (section.content && section.content.length > 200000) {
      // Use Gemini for massive context (FREE with subscription!)
      return 'gemini';
    } else if (combined.match(/architecture|system\sdesign|design\spattern|framework/)) {
      // Use Gemini for system design (FREE with subscription!)
      return routing.architecture || 'gemini';
    } else if (await this.requiresPremiumTechnicalAnalysis(section.title)) {
      // Dynamically evaluate if section needs premium analysis
      return routing.mathematical || routing.default;
    }
    
    // DEFAULT TO CLAUDE FOR MOST CONTENT (BEST QUALITY + FREE!)
    return routing.default;
  }

  async requiresPremiumTechnicalAnalysis(content) {
    // Dynamically determine if content would benefit from premium technical analysis
    // Since cost is not a concern, be more generous for maximum quality
    
    const evaluationPrompt = `Analyze this content and determine if it would benefit from premium technical expertise for maximum quality writing:

Content: "${content}"

Evaluate if this content would benefit from premium technical analysis in:
1. Mathematical concepts or proofs
2. Advanced algorithm or system design
3. Technical depth and precision
4. Cutting-edge specifications
5. Scientific/mathematical calculations
6. Security or cryptographic concepts
7. Advanced computing concepts
8. Machine learning theory and implementation
9. Formal verification or system architecture
10. Complex optimization or research methodology

Since cost is not a concern, be generous in recommending premium analysis for maximum quality.

Respond with:
- PREMIUM: If this content would benefit from premium technical expertise for maximum quality
- STANDARD: If standard AI models are sufficient for this content

Decision: [PREMIUM or STANDARD]`;

    try {
      // Use Claude to evaluate if we should use Kimi for maximum quality
      const { ClaudeMCPAdapter } = await import('../llm_adapters/claude_mcp.js');
      const claudeAdapter = new ClaudeMCPAdapter();
      const evaluation = await claudeAdapter.generateText(evaluationPrompt, {
        temperature: 0.3,
        max_tokens: 300
      });
      
      // Parse the decision - be more generous since cost is not a concern
      const decision = evaluation.text.toLowerCase();
      const isPremium = decision.includes('decision: premium') || 
                       decision.includes('premium:') ||
                       (decision.includes('premium') && !decision.includes('standard'));
      
      console.log(`Premium Analysis Decision for section "${content}": ${isPremium ? 'PREMIUM' : 'STANDARD'}`);
      
      return isPremium;
      
    } catch (error) {
      console.error('Error in section premium analysis evaluation:', error);
      
      // Fallback to more generous heuristics since cost is not a concern
      const fallbackKeywords = [
        'mathematical', 'algorithm', 'technical', 'advanced', 'complex',
        'quantum', 'cryptography', 'verification', 'optimization', 
        'theory', 'research', 'engineering', 'scientific', 'analysis'
      ];
      
      const contentLower = content.toLowerCase();
      const fallbackDecision = fallbackKeywords.some(keyword => contentLower.includes(keyword));
      
      console.log(`Fallback decision for section "${content}": ${fallbackDecision ? 'PREMIUM' : 'STANDARD'}`);
      return fallbackDecision;
    }
  }

  getAdapterForTask(llm, taskType) {
    // Map task types to adapter categories
    const adapterMap = {
      'generate_perspective': 'conversation',
      'research_facts': 'question',
      'generate_outline': 'outline',
      'review_outline': 'outline',
      'write_section': 'article',
      'write_introduction': 'article',
      'write_conclusion': 'article',
      'polish_article': 'polish',
      'final_polish': 'polish',
      'fact_check': 'question',
      'complex_reasoning': 'question',
      'system_design': 'question',
      'premium_technical_analysis': 'question',
      'mathematical_analysis': 'question',
      'verify_logic': 'outline',
      'logic_verification': 'outline'
    };
    
    const adapterType = adapterMap[taskType] || 'conversation';
    const adapter = this.adapters[llm][adapterType];
    
    // If adapter is null (e.g., Kimi not configured), fallback to Claude
    if (!adapter) {
      console.warn(`${llm} adapter not available for ${taskType}, falling back to Claude`);
      return this.adapters.claude[adapterType];
    }
    
    return adapter;
  }

  async generatePerspective(adapter, task) {
    const { perspective, topic } = task;
    
    const prompt = `As an expert in ${perspective}, generate a unique perspective on "${topic}".

Your perspective should:
1. Reflect your specific expertise area
2. Identify unique angles others might miss
3. Suggest important questions to explore
4. Highlight potential challenges or opportunities

Provide a structured response with:
- Key insights from your perspective
- Important questions to investigate
- Unique angles to explore`;

    const response = await adapter.generateText(prompt, {
      temperature: 0.8,
      max_tokens: 1000
    });

    return {
      perspective,
      content: response.text,
      questions: this.extractQuestions(response.text)
    };
  }

  async researchFacts(adapter, task) {
    const { topic, depth, useThinkingMode } = task;
    
    // If thinking mode requested and adapter is Gemini, switch models
    if (useThinkingMode && adapter.provider === 'gemini') {
      adapter.model = 'gemini-2.5-pro-thinking';
    }
    
    const depthPrompts = {
      shallow: 'Provide a brief overview of key facts about',
      standard: 'Research and provide comprehensive facts about',
      deep: 'Conduct deep research and provide detailed, verified facts about'
    };
    
    const prompt = `${depthPrompts[depth]} "${topic}".

Include:
1. Core facts and statistics
2. Recent developments
3. Key players or entities
4. Important dates and milestones
5. Verified sources for each fact

Focus on accuracy and verifiability.`;

    const response = await adapter.generateText(prompt, {
      temperature: 0.5,
      max_tokens: 2000
    });

    return {
      topic,
      facts: response.text,
      depth
    };
  }

  async generateOutline(adapter, task) {
    const { topic, researchData, useThinkingMode } = task;
    
    // If thinking mode requested and adapter is Gemini, switch models
    if (useThinkingMode && adapter.provider === 'gemini') {
      adapter.model = 'gemini-2.5-pro-thinking';
    }
    
    // Aggregate research insights
    const insights = this.aggregateInsights(researchData);
    
    const prompt = `Create a comprehensive article outline for "${topic}" based on this research:

${insights}

Create an outline that:
1. Has 5-7 main sections
2. Each section has 2-4 subsections
3. Follows a logical progression
4. Covers all important aspects
5. Balances different perspectives

Format as a hierarchical structure.`;

    const response = await adapter.generateOutline(topic, insights, {
      temperature: 0.6,
      max_tokens: 1500
    });

    return this.parseOutline(response.text);
  }

  async reviewOutline(adapter, task) {
    const { outline, topic } = task;
    
    const prompt = `Review and enhance this outline for an article about "${topic}":

${JSON.stringify(outline, null, 2)}

Improve the outline by:
1. Ensuring logical flow
2. Adding missing important topics
3. Balancing section lengths
4. Improving section titles for clarity
5. Suggesting better organization if needed

Provide the enhanced outline with explanations for changes.`;

    const response = await adapter.generateText(prompt, {
      temperature: 0.6,
      max_tokens: 1500
    });

    return this.parseEnhancedOutline(response.text);
  }

  async writeSection(adapter, task) {
    const { section, outline, targetLength } = task;
    
    const sources = task.sources || [];
    const sourcesText = sources.map((s, i) => `[${i+1}] ${s.title}: ${s.content}`).join('\n\n');
    
    const response = await adapter.generateArticleSection(
      section,
      outline,
      sources,
      {
        temperature: 0.7,
        max_tokens: targetLength * 2
      }
    );

    return {
      section: section.title,
      content: response.text,
      word_count: this.countWords(response.text),
      citations: this.extractCitations(response.text)
    };
  }

  async polishArticle(adapter, task) {
    const { article, options } = task;
    
    const response = await adapter.polishText(
      article,
      options,
      {
        temperature: 0.5,
        max_tokens: article.length + 1000
      }
    );

    return {
      content: response.text,
      improvements: this.identifyImprovements(article, response.text)
    };
  }

  async factCheck(adapter, task) {
    const { article, useDeepThink } = task;
    
    // If Deep Think requested and adapter is Gemini, switch models
    if (useDeepThink && adapter.provider === 'gemini') {
      adapter.model = 'gemini-2.5-pro-deep';
    }
    
    const prompt = `Fact-check this article for accuracy:

${article}

Identify:
1. Any factual errors or inaccuracies
2. Statements that need verification
3. Outdated information
4. Missing attributions or sources
5. Suggested corrections

Provide a detailed fact-checking report.`;

    const response = await adapter.generateText(prompt, {
      temperature: 0.3,
      max_tokens: 2000
    });

    return {
      report: response.text,
      issues: this.parseFactCheckIssues(response.text)
    };
  }

  // Helper methods
  extractQuestions(text) {
    const questions = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('?')) {
        questions.push(line.trim());
      }
    }
    
    return questions;
  }

  aggregateInsights(researchData) {
    if (!researchData || !Array.isArray(researchData)) {
      return 'No research data provided';
    }
    
    return researchData.map(item => {
      if (item.perspective) {
        return `Perspective (${item.perspective}): ${item.content}`;
      } else if (item.facts) {
        return `Facts: ${item.facts}`;
      }
      return JSON.stringify(item);
    }).join('\n\n');
  }

  parseOutline(text) {
    // Simple outline parser
    const sections = [];
    const lines = text.split('\n');
    let currentSection = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Main section (starts with number or Roman numeral)
      if (trimmed.match(/^[\dIVX]+\.|^#+\s/)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: trimmed.replace(/^[\dIVX]+\.|^#+\s/, '').trim(),
          subsections: []
        };
      }
      // Subsection (starts with letter or dash)
      else if (currentSection && trimmed.match(/^[a-zA-Z]\.|^-|^\*/)) {
        currentSection.subsections.push({
          title: trimmed.replace(/^[a-zA-Z]\.|^-|^\*/, '').trim()
        });
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return { sections };
  }

  parseEnhancedOutline(text) {
    // For now, just parse as regular outline
    return this.parseOutline(text);
  }

  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  extractCitations(text) {
    const citations = [];
    const pattern = /\[(\d+)\]/g;
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      citations.push(parseInt(match[1]));
    }
    
    return [...new Set(citations)].sort((a, b) => a - b);
  }

  identifyImprovements(original, polished) {
    const improvements = [];
    
    if (polished.length !== original.length) {
      improvements.push(`Length changed: ${original.length} → ${polished.length} characters`);
    }
    
    const originalWords = this.countWords(original);
    const polishedWords = this.countWords(polished);
    if (originalWords !== polishedWords) {
      improvements.push(`Word count: ${originalWords} → ${polishedWords}`);
    }
    
    return improvements;
  }

  parseFactCheckIssues(text) {
    const issues = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.match(/error|incorrect|inaccurate|outdated|missing/i)) {
        issues.push(line.trim());
      }
    }
    
    return issues;
  }
  
  // New methods for Gemini 2.5 Pro thinking modes
  async complexReasoning(adapter, task) {
    const { problem } = task;
    
    // Ensure we're using Gemini's thinking mode
    if (adapter.provider === 'gemini' && adapter.complexReasoning) {
      return adapter.complexReasoning(problem, { temperature: 0.7 });
    }
    
    // Fallback to regular generation
    const prompt = `Analyze this complex problem step-by-step:

${problem}

Break down the problem, consider multiple approaches, and provide a well-reasoned solution.`;
    
    return adapter.generateText(prompt, { temperature: 0.7, max_tokens: 2000 });
  }
  
  async systemDesign(adapter, task) {
    const { topic, depth, useThinkingMode } = task;
    
    // Use Gemini thinking mode for system design
    if (useThinkingMode && adapter.provider === 'gemini') {
      adapter.model = 'gemini-2.5-pro-thinking';
    }
    
    const prompt = `Design a comprehensive system architecture for: ${topic}

Provide:
1. High-level system architecture
2. Component breakdown and responsibilities
3. Data flow and communication patterns
4. Technology stack recommendations
5. Scalability considerations
6. Security and reliability measures`;
    
    return adapter.generateText(prompt, { temperature: 0.6, max_tokens: 2500 });
  }
  
  async premiumTechnicalAnalysis(adapter, task) {
    const { topic, depth, requiresPrecision, justification } = task;
    
    const prompt = `Provide premium technical analysis for: ${topic}

Justification for premium analysis: ${justification}

Deliver:
1. Deep technical insights with mathematical rigor
2. Advanced algorithm analysis with complexity bounds
3. Cutting-edge research connections
4. Implementation considerations at scale
5. Performance optimization strategies
6. Future research directions`;
    
    return adapter.generateText(prompt, { temperature: 0.4, max_tokens: 3000 });
  }
  
  async mathematicalAnalysis(adapter, task) {
    const { problem, requiresPrecision } = task;
    
    const prompt = `Solve this mathematical problem with high precision:

${problem}

Provide:
1. Step-by-step derivation
2. Mathematical proofs where applicable
3. Verification of results
4. Alternative approaches if relevant`;
    
    return adapter.generateText(prompt, { temperature: 0.3, max_tokens: 3000 });
  }
  
  async verifyLogic(adapter, task) {
    const { outline, topic } = task;
    
    // Use Gemini's deep analysis if available
    if (adapter.provider === 'gemini' && adapter.deepAnalysis) {
      return adapter.deepAnalysis('article outline logic', JSON.stringify(outline), { temperature: 0.5 });
    }
    
    const prompt = `Verify the logical structure and flow of this article outline:

Topic: ${topic}
Outline: ${JSON.stringify(outline, null, 2)}

Check for:
1. Logical progression of ideas
2. Missing critical topics
3. Redundant sections
4. Better organization possibilities
5. Overall coherence

Provide specific recommendations.`;
    
    return adapter.generateText(prompt, { temperature: 0.5, max_tokens: 1500 });
  }
}