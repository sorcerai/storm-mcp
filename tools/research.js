// Research Tool for STORM MCP
// Handles knowledge curation and information gathering

import axios from 'axios';
import pLimit from 'p-limit';

export class ResearchTool {
  constructor(adapters, searchEngine = 'google') {
    this.adapters = adapters;
    this.searchEngine = searchEngine;
    this.limit = pLimit(3); // Limit concurrent operations
  }

  async research(topic, maxPerspectives = 5, maxQuestionsPerPerspective = 10, searchDepth = 'standard') {
    const startTime = Date.now();
    
    // Step 1: Generate diverse perspectives/personas
    const perspectives = await this.generatePerspectives(topic, maxPerspectives);
    
    // Step 2: For each perspective, generate questions and search for answers
    const researchData = {
      topic,
      perspectives: [],
      sources: [],
      total_questions: 0,
      search_depth: searchDepth,
      duration_ms: 0
    };

    // Process perspectives in parallel with limit
    const perspectiveResults = await Promise.all(
      perspectives.map(perspective => 
        this.limit(() => this.researchPerspective(topic, perspective, maxQuestionsPerPerspective, searchDepth))
      )
    );

    // Aggregate results
    for (const result of perspectiveResults) {
      researchData.perspectives.push(result.perspective);
      researchData.sources.push(...result.sources);
      researchData.total_questions += result.questions.length;
    }

    // Deduplicate sources
    researchData.sources = this.deduplicateSources(researchData.sources);
    
    researchData.duration_ms = Date.now() - startTime;
    
    return researchData;
  }

  async generatePerspectives(topic, maxPerspectives) {
    const prompt = `Generate ${maxPerspectives} diverse expert perspectives for researching the topic: "${topic}"

Each perspective should represent a different type of expert or stakeholder who would have unique insights about this topic.

Format your response as a JSON array of objects with the following structure:
[
  {
    "name": "Expert Title",
    "description": "Brief description of their role",
    "expertise": "Their area of expertise",
    "perspective": "What unique viewpoint they bring"
  }
]

Make sure the perspectives are diverse and cover different aspects of the topic.`;

    const response = await this.adapters.conversation.generateText(prompt, {
      temperature: 0.8,
      max_tokens: 1500
    });

    try {
      // Extract JSON from response
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: parse structured text
      return this.parseStructuredPerspectives(response.text, maxPerspectives);
    } catch (error) {
      console.error('Error parsing perspectives:', error);
      // Return default perspectives
      return this.getDefaultPerspectives(topic, maxPerspectives);
    }
  }

  async researchPerspective(topic, perspective, maxQuestions, searchDepth) {
    // Generate questions from this perspective
    const questions = await this.generateQuestions(topic, perspective, maxQuestions);
    
    // Search for answers to each question
    const sources = [];
    const searchPromises = questions.map(question =>
      this.limit(() => this.searchAndExtract(question, topic, searchDepth))
    );
    
    const searchResults = await Promise.all(searchPromises);
    
    for (const result of searchResults) {
      if (result && result.sources) {
        sources.push(...result.sources);
      }
    }

    return {
      perspective,
      questions,
      sources
    };
  }

  async generateQuestions(topic, perspective, maxQuestions) {
    const prompt = `As ${perspective.name} (${perspective.description}), generate ${maxQuestions} insightful questions about "${topic}".

Your expertise: ${perspective.expertise}
Your perspective: ${perspective.perspective}

Generate questions that:
1. Leverage your unique expertise and viewpoint
2. Would lead to comprehensive understanding of the topic
3. Cover different aspects and depths
4. Are specific and answerable through research

Format: One question per line`;

    const response = await this.adapters.question.generateText(prompt, {
      temperature: 0.7,
      max_tokens: 1000
    });

    // Parse questions
    const questions = response.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10 && line.includes('?'))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .slice(0, maxQuestions);

    return questions;
  }

  async searchAndExtract(query, topic, searchDepth) {
    try {
      // Simulate search (in real implementation, this would call actual search APIs)
      const searchResults = await this.performSearch(query, topic, searchDepth);
      
      const sources = [];
      
      for (const result of searchResults) {
        const extractedContent = await this.extractContent(result.url, result.snippet);
        
        if (extractedContent) {
          sources.push({
            title: result.title,
            url: result.url,
            content: extractedContent,
            relevance_score: result.relevance || 0.8,
            query: query
          });
        }
      }

      return { sources };
    } catch (error) {
      console.error('Search error for query:', query, error);
      return { sources: [] };
    }
  }

  async performSearch(query, topic, searchDepth) {
    // Simulate search results (in production, integrate with actual search APIs)
    // This is where you'd integrate with Google, Bing, DuckDuckGo, You.com, etc.
    
    const depthConfig = {
      shallow: 3,
      standard: 5,
      deep: 10
    };
    
    const numResults = depthConfig[searchDepth] || 5;
    
    // Simulated results
    const results = [];
    for (let i = 0; i < numResults; i++) {
      results.push({
        title: `${topic} - Result ${i + 1} for: ${query}`,
        url: `https://example.com/article-${i + 1}`,
        snippet: `This is a snippet about ${topic} related to the question: ${query}. It contains relevant information...`,
        relevance: 0.9 - (i * 0.1)
      });
    }
    
    return results;
  }

  async extractContent(url, snippet) {
    // In production, this would use web scraping tools
    // For now, return enhanced snippet
    return `${snippet}\n\nExtracted content from ${url} would contain more detailed information about the topic, including facts, figures, quotes, and analysis.`;
  }

  deduplicateSources(sources) {
    const seen = new Set();
    return sources.filter(source => {
      const key = source.url || source.title;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  parseStructuredPerspectives(text, maxPerspectives) {
    // Fallback parser for non-JSON responses
    const perspectives = [];
    const lines = text.split('\n');
    
    let current = null;
    for (const line of lines) {
      if (line.includes('Expert') || line.includes('Perspective')) {
        if (current) {
          perspectives.push(current);
        }
        current = {
          name: line.trim(),
          description: '',
          expertise: '',
          perspective: ''
        };
      } else if (current && line.trim()) {
        if (line.includes('Description:')) {
          current.description = line.replace('Description:', '').trim();
        } else if (line.includes('Expertise:')) {
          current.expertise = line.replace('Expertise:', '').trim();
        } else if (line.includes('Perspective:')) {
          current.perspective = line.replace('Perspective:', '').trim();
        }
      }
    }
    
    if (current) {
      perspectives.push(current);
    }
    
    return perspectives.slice(0, maxPerspectives);
  }

  getDefaultPerspectives(topic, maxPerspectives) {
    const defaults = [
      {
        name: "Subject Matter Expert",
        description: "Deep technical knowledge of the topic",
        expertise: "Technical details and implementation",
        perspective: "How things work and technical challenges"
      },
      {
        name: "Industry Analyst",
        description: "Market and industry trends expert",
        expertise: "Market analysis and business impact",
        perspective: "Business implications and market dynamics"
      },
      {
        name: "End User Representative",
        description: "Represents the user perspective",
        expertise: "User experience and practical applications",
        perspective: "Real-world usage and user needs"
      },
      {
        name: "Academic Researcher",
        description: "Theoretical and research perspective",
        expertise: "Academic research and theory",
        perspective: "Scientific understanding and research gaps"
      },
      {
        name: "Policy Maker",
        description: "Regulatory and policy perspective",
        expertise: "Policy, ethics, and regulation",
        perspective: "Societal impact and governance"
      }
    ];
    
    return defaults.slice(0, maxPerspectives);
  }
}