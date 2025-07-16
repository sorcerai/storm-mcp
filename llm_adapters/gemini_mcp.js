// Gemini MCP Adapter for STORM
// Uses Google Gemini through the MCP CLI tool with authentication

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GeminiMCPAdapter {
  constructor(model = 'gemini-2.5-pro') {
    this.model = model;
    this.provider = 'gemini';
    
    // Model mapping - mainly using standard Gemini 2.5 Pro
    this.modelMap = {
      'gemini-2.5-pro': 'gemini-2.5-pro',
      'gemini-2.5-pro-thinking': 'gemini-2.5-pro', // Same model, thinking flag added if available
      'gemini-2.5-pro-deep': 'gemini-2.5-pro', // Same model, deep flag added if available
      'gemini-1.5-pro': 'gemini-1.5-pro-latest',
      'gemini-1.5-flash': 'gemini-1.5-flash-latest'
    };
    
    // Use Gemini CLI with existing authentication
    // The CLI will use authenticated session from ~/.gemini/
    this.useAuth = true;
  }

  async generateText(prompt, options = {}) {
    const {
      temperature = 0.7,
      max_tokens = 2000,
      system_prompt = null
    } = options;

    try {
      // Combine system prompt with user prompt if provided
      const fullPrompt = system_prompt 
        ? `${system_prompt}\n\n${prompt}`
        : prompt;

      // Use Gemini CLI with auth
      const cliPrompt = fullPrompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      
      // Get the actual model name from mapping
      const actualModel = this.modelMap[this.model] || this.model;
      
      // Add thinking mode flags only if available in the CLI
      let additionalFlags = '';
      if (this.model === 'gemini-2.5-pro-thinking' && options.enableThinking) {
        additionalFlags = '--thinking-mode';
      } else if (this.model === 'gemini-2.5-pro-deep' && options.enableDeepThink) {
        additionalFlags = '--deep-think';
      }
      
      // Use the MCP tool for Gemini instead of non-existent npm package
      // This should be called via the MCP system, not directly
      const command = `mcp__google-gemini-cli__gemini with model ${actualModel} and prompt "${cliPrompt}" with temperature ${temperature} and max_tokens ${max_tokens} ${additionalFlags}`.trim();
      
      const { stdout, stderr } = await execAsync(command, {
        env: {
          ...process.env,
          HOME: process.env.HOME || '/Users/ariapramesi' // Ensure HOME is set for auth
        }
      });
      
      if (stderr && !stderr.includes('warning')) {
        console.error('Gemini CLI stderr:', stderr);
      }

      let text = stdout.trim();
      
      // Try to parse JSON response
      try {
        const jsonResponse = JSON.parse(text);
        text = jsonResponse.response || jsonResponse.text || text;
      } catch (e) {
        // If not JSON, use raw output
      }

      return {
        text,
        model: this.model,
        usage: {
          prompt_tokens: Math.ceil(fullPrompt.length / 4),
          completion_tokens: Math.ceil(text.length / 4),
          total_tokens: Math.ceil((fullPrompt.length + text.length) / 4)
        }
      };
    } catch (error) {
      console.error('Gemini MCP Adapter error:', error);
      throw error;
    }
  }

  async generateWithMessages(messages, options = {}) {
    const {
      temperature = 0.7,
      max_tokens = 2000
    } = options;

    try {
      // Convert messages to a formatted prompt for CLI
      const prompt = messages.map(msg => {
        if (msg.role === 'system') return `System: ${msg.content}`;
        if (msg.role === 'user') return `User: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        return msg.content;
      }).join('\n\n');

      return this.generateText(prompt, options);
    } catch (error) {
      console.error('Gemini MCP Adapter error:', error);
      throw error;
    }
  }

  async streamGenerate(prompt, options = {}, onChunk) {
    try {
      // For CLI, we'll simulate streaming by using regular generation
      // The CLI doesn't support native streaming yet
      const response = await this.generateText(prompt, options);
      
      // Simulate streaming by chunking the response
      const chunks = response.text.match(/.{1,50}/g) || [];
      for (const chunk of chunks) {
        onChunk(chunk);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      return response;
    } catch (error) {
      console.error('Gemini streaming error:', error);
      throw error;
    }
  }

  // Method for STORM's conversation simulation
  async simulateConversation(persona, topic, context, options = {}) {
    const systemPrompt = `You are ${persona.name}, ${persona.description}. 
You are having a conversation about "${topic}".
Your expertise: ${persona.expertise}
Your perspective: ${persona.perspective}`;

    const prompt = `Given the following context about ${topic}:
${context}

As ${persona.name}, what questions would you ask to understand this topic better? 
What aspects would you want to explore based on your expertise?`;

    return this.generateText(prompt, { ...options, system_prompt: systemPrompt });
  }

  // Method for STORM's question generation
  async generateQuestions(topic, perspective, existingInfo, options = {}) {
    const prompt = `Topic: ${topic}
Perspective: ${perspective}
Existing Information: ${existingInfo}

Generate insightful questions about this topic from the given perspective that haven't been addressed in the existing information. 
Focus on questions that would lead to comprehensive understanding.`;

    return this.generateText(prompt, options);
  }

  // Method for STORM's outline generation
  async generateOutline(topic, information, options = {}) {
    const prompt = `Create a comprehensive outline for an article about "${topic}" based on the following researched information:

${information}

The outline should:
1. Have clear main sections
2. Include relevant subsections
3. Follow a logical flow
4. Cover all important aspects of the topic`;

    return this.generateText(prompt, options);
  }
  
  // Method for complex reasoning with thinking mode
  async complexReasoning(problem, options = {}) {
    // Use thinking mode model for complex reasoning
    const originalModel = this.model;
    this.model = 'gemini-2.5-pro-thinking';
    
    const prompt = `Analyze this complex problem step-by-step:

${problem}

Break down the problem, consider multiple approaches, and provide a well-reasoned solution.`;

    const result = await this.generateText(prompt, options);
    
    // Restore original model
    this.model = originalModel;
    
    return result;
  }
  
  // Method for deep analysis with Deep Think mode
  async deepAnalysis(topic, data, options = {}) {
    // Use Deep Think model for advanced analysis
    const originalModel = this.model;
    this.model = 'gemini-2.5-pro-deep';
    
    const prompt = `Perform a deep analysis of the following:

Topic: ${topic}
Data: ${data}

Provide comprehensive insights, identify patterns, and draw meaningful conclusions.`;

    const result = await this.generateText(prompt, options);
    
    // Restore original model
    this.model = originalModel;
    
    return result;
  }

  // Method for STORM's article generation
  async generateArticleSection(section, outline, sources, options = {}) {
    const prompt = `Write a detailed section for the following part of the article:

Section: ${section.title}
Outline: ${JSON.stringify(outline)}

Use these sources for citations:
${sources.map((s, i) => `[${i+1}] ${s.title}: ${s.content}`).join('\n')}

Include inline citations where appropriate using [1], [2], etc. format.`;

    return this.generateText(prompt, options);
  }

  // Method for STORM's article polishing
  async polishText(text, polishOptions, options = {}) {
    const polishInstructions = polishOptions.map(opt => {
      switch(opt) {
        case 'grammar': return 'Fix any grammatical errors';
        case 'clarity': return 'Improve clarity and readability';
        case 'flow': return 'Enhance the flow between sentences and paragraphs';
        case 'citations': return 'Ensure citations are properly formatted';
        case 'formatting': return 'Improve formatting and structure';
        case 'seo': return 'Optimize for search engines while maintaining quality';
        default: return opt;
      }
    }).join(', ');

    const prompt = `Polish the following text according to these requirements: ${polishInstructions}

Text to polish:
${text}`;

    return this.generateText(prompt, options);
  }
}