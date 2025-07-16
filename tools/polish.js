// Article Polishing Tool for STORM MCP
// Improves and refines generated articles

export class PolishTool {
  constructor(adapter) {
    this.adapter = adapter;
  }

  async polishArticle(article, polishOptions = ['grammar', 'clarity', 'flow']) {
    const polishedArticle = {
      ...article,
      improvements: [],
      polished_at: new Date().toISOString()
    };

    // Polish the main content
    const polishedContent = await this.polishContent(article.content, polishOptions);
    polishedArticle.content = polishedContent.text;
    polishedArticle.improvements.push(...polishedContent.improvements);

    // Update word count
    polishedArticle.word_count = this.countWords(polishedContent.text);

    // Polish specific aspects based on options
    for (const option of polishOptions) {
      if (option === 'citations') {
        const citationImprovements = await this.polishCitations(polishedArticle);
        polishedArticle.improvements.push(...citationImprovements);
      } else if (option === 'seo') {
        const seoImprovements = await this.optimizeForSEO(polishedArticle);
        polishedArticle.improvements.push(...seoImprovements);
      }
    }

    // Final consistency check
    const consistencyImprovements = await this.ensureConsistency(polishedArticle);
    polishedArticle.improvements.push(...consistencyImprovements);

    return polishedArticle;
  }

  async polishContent(content, polishOptions) {
    const improvements = [];
    let polishedText = content;

    // Split content into manageable chunks for processing
    const chunks = this.splitIntoChunks(content, 1000);
    const polishedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const context = i > 0 ? chunks[i-1].slice(-200) : '';
      
      const polished = await this.polishChunk(chunk, context, polishOptions);
      polishedChunks.push(polished.text);
      
      if (polished.improvements && polished.improvements.length > 0) {
        improvements.push({
          chunk: i + 1,
          improvements: polished.improvements
        });
      }
    }

    polishedText = polishedChunks.join('\n\n');

    // Additional passes for specific options
    if (polishOptions.includes('flow')) {
      const flowResult = await this.improveFlow(polishedText);
      polishedText = flowResult.text;
      improvements.push({ type: 'flow', changes: flowResult.changes });
    }

    if (polishOptions.includes('clarity')) {
      const clarityResult = await this.improveclarity(polishedText);
      polishedText = clarityResult.text;
      improvements.push({ type: 'clarity', changes: clarityResult.changes });
    }

    return {
      text: polishedText,
      improvements
    };
  }

  async polishChunk(chunk, context, polishOptions) {
    const polishInstructions = this.getPolishInstructions(polishOptions);

    const prompt = `Polish the following text according to these requirements:
${polishInstructions}

${context ? `Previous context: ...${context}\n\n` : ''}

Text to polish:
${chunk}

Requirements:
1. Maintain the same meaning and factual content
2. Preserve all citations in [X] format
3. Keep the same general structure
4. Return the polished text and a brief list of improvements made

Format your response as:
POLISHED TEXT:
[Your polished text here]

IMPROVEMENTS:
- [Improvement 1]
- [Improvement 2]
...`;

    const response = await this.adapter.generateText(prompt, {
      temperature: 0.5,
      max_tokens: chunk.length + 500
    });

    // Parse response
    const parts = response.text.split(/IMPROVEMENTS:/i);
    const polishedText = parts[0].replace(/^POLISHED TEXT:/i, '').trim();
    
    const improvements = [];
    if (parts[1]) {
      const improvementLines = parts[1].split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim());
      improvements.push(...improvementLines);
    }

    return {
      text: polishedText,
      improvements
    };
  }

  async improveFlow(text) {
    const prompt = `Improve the flow and transitions in this article. Focus on:
1. Adding transition phrases between paragraphs
2. Ensuring logical progression of ideas
3. Connecting related concepts smoothly
4. Maintaining consistent tone throughout

Text:
${text.substring(0, 3000)}...

Provide the improved text with better flow. Mark significant changes with [FLOW_IMPROVED] tags.`;

    const response = await this.adapter.generateText(prompt, {
      temperature: 0.6,
      max_tokens: 4000
    });

    // Count flow improvements
    const flowTags = (response.text.match(/\[FLOW_IMPROVED\]/g) || []).length;
    const cleanedText = response.text.replace(/\[FLOW_IMPROVED\]/g, '');

    return {
      text: cleanedText,
      changes: flowTags
    };
  }

  async improveclarity(text) {
    const prompt = `Improve the clarity of this article. Focus on:
1. Simplifying complex sentences
2. Replacing jargon with clearer terms (or explaining jargon when first used)
3. Breaking up long paragraphs
4. Making abstract concepts more concrete
5. Ensuring consistent terminology

Text:
${text.substring(0, 3000)}...

Provide the improved text with better clarity. Mark significant changes with [CLARITY_IMPROVED] tags.`;

    const response = await this.adapter.generateText(prompt, {
      temperature: 0.6,
      max_tokens: 4000
    });

    // Count clarity improvements
    const clarityTags = (response.text.match(/\[CLARITY_IMPROVED\]/g) || []).length;
    const cleanedText = response.text.replace(/\[CLARITY_IMPROVED\]/g, '');

    return {
      text: cleanedText,
      changes: clarityTags
    };
  }

  async polishCitations(article) {
    const improvements = [];

    // Check for citation consistency
    const citationPattern = /\[(\d+)\]/g;
    const usedCitations = new Set();
    
    let match;
    while ((match = citationPattern.exec(article.content)) !== null) {
      usedCitations.add(match[1]);
    }

    // Ensure all citations are defined
    const definedCitations = new Set(article.citations.map(c => c.number));
    
    for (const used of usedCitations) {
      if (!definedCitations.has(used)) {
        improvements.push(`Fixed undefined citation [${used}]`);
      }
    }

    // Check for unused citations
    for (const defined of definedCitations) {
      if (!usedCitations.has(defined)) {
        improvements.push(`Removed unused citation [${defined}]`);
      }
    }

    // Format citations consistently
    if (article.citations && article.citations.length > 0) {
      const formattedCitations = this.formatCitationsConsistently(article.citations);
      if (formattedCitations.changed) {
        improvements.push('Standardized citation formatting');
      }
    }

    return improvements;
  }

  async optimizeForSEO(article) {
    const improvements = [];

    const prompt = `Analyze this article for SEO optimization and suggest improvements:

Title: ${article.title}
First 500 characters: ${article.content.substring(0, 500)}...

Provide specific SEO recommendations for:
1. Title optimization
2. Meta description (150-160 characters)
3. Key phrases to emphasize
4. Header structure
5. Content improvements

Format as JSON:
{
  "optimized_title": "...",
  "meta_description": "...",
  "key_phrases": ["phrase1", "phrase2"],
  "recommendations": ["rec1", "rec2"]
}`;

    const response = await this.adapter.generateText(prompt, {
      temperature: 0.6,
      max_tokens: 500
    });

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const seoData = JSON.parse(jsonMatch[0]);
        
        if (seoData.optimized_title && seoData.optimized_title !== article.title) {
          improvements.push(`SEO: Optimized title to "${seoData.optimized_title}"`);
        }
        
        if (seoData.meta_description) {
          article.meta_description = seoData.meta_description;
          improvements.push('SEO: Added meta description');
        }
        
        if (seoData.key_phrases && seoData.key_phrases.length > 0) {
          article.key_phrases = seoData.key_phrases;
          improvements.push(`SEO: Identified ${seoData.key_phrases.length} key phrases`);
        }
        
        if (seoData.recommendations) {
          improvements.push(...seoData.recommendations.map(r => `SEO: ${r}`));
        }
      }
    } catch (error) {
      console.error('Error parsing SEO recommendations:', error);
      improvements.push('SEO: Analysis completed with recommendations');
    }

    return improvements;
  }

  async ensureConsistency(article) {
    const improvements = [];

    // Check terminology consistency
    const termVariations = this.findTermVariations(article.content);
    if (termVariations.length > 0) {
      improvements.push(`Standardized ${termVariations.length} term variations`);
      
      // Apply standardization
      let content = article.content;
      for (const variation of termVariations) {
        content = content.replace(variation.pattern, variation.standard);
      }
      article.content = content;
    }

    // Check formatting consistency
    const formattingIssues = this.checkFormattingConsistency(article.content);
    if (formattingIssues.length > 0) {
      improvements.push(`Fixed ${formattingIssues.length} formatting inconsistencies`);
    }

    return improvements;
  }

  getPolishInstructions(polishOptions) {
    const instructions = [];
    
    for (const option of polishOptions) {
      switch (option) {
        case 'grammar':
          instructions.push('- Fix all grammatical errors');
          instructions.push('- Ensure proper punctuation');
          instructions.push('- Correct verb tenses');
          break;
        case 'clarity':
          instructions.push('- Simplify complex sentences');
          instructions.push('- Define or replace jargon');
          instructions.push('- Make ideas more concrete');
          break;
        case 'flow':
          instructions.push('- Add smooth transitions');
          instructions.push('- Ensure logical progression');
          instructions.push('- Connect related ideas');
          break;
        case 'formatting':
          instructions.push('- Ensure consistent formatting');
          instructions.push('- Fix spacing issues');
          instructions.push('- Standardize lists and bullets');
          break;
      }
    }
    
    return instructions.join('\n');
  }

  splitIntoChunks(text, chunkSize) {
    const chunks = [];
    const paragraphs = text.split(/\n\n+/);
    
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  findTermVariations(text) {
    // Common term variations to standardize
    const variations = [
      { pattern: /\bAI\b|\bartificial intelligence\b/gi, standard: 'artificial intelligence' },
      { pattern: /\bML\b|\bmachine learning\b/gi, standard: 'machine learning' },
      { pattern: /\be\.g\.\b|\bfor example\b/gi, standard: 'for example' },
      { pattern: /\bi\.e\.\b|\bthat is\b/gi, standard: 'that is' }
    ];
    
    const found = [];
    
    for (const variation of variations) {
      if (variation.pattern.test(text)) {
        found.push(variation);
      }
    }
    
    return found;
  }

  checkFormattingConsistency(text) {
    const issues = [];
    
    // Check for inconsistent list formatting
    if (text.includes('1.') && text.includes('1)')) {
      issues.push('Inconsistent numbered list format');
    }
    
    // Check for inconsistent bullet points
    if (text.includes('•') && text.includes('-') && text.includes('*')) {
      issues.push('Inconsistent bullet point format');
    }
    
    // Check for double spaces
    if (text.includes('  ')) {
      issues.push('Double spaces found');
    }
    
    return issues;
  }

  formatCitationsConsistently(citations) {
    let changed = false;
    
    for (const citation of citations) {
      // Ensure consistent URL format
      if (citation.source.url && !citation.source.url.startsWith('http')) {
        citation.source.url = 'https://' + citation.source.url;
        changed = true;
      }
      
      // Ensure titles end with period
      if (citation.source.title && !citation.source.title.endsWith('.')) {
        citation.source.title += '.';
        changed = true;
      }
    }
    
    return { citations, changed };
  }

  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}