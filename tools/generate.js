// Article Generation Tool for STORM MCP
// Generates full article content from outline

export class GenerateTool {
  constructor(adapter) {
    this.adapter = adapter;
  }

  async generateArticle(topic, outline, researchData, options = {}) {
    const {
      section_id = null,
      include_citations = true,
      target_length = 'medium',
      output_format = 'markdown'
    } = options;

    const lengthConfig = {
      short: { wordsPerSection: 300, wordsPerSubsection: 150 },
      medium: { wordsPerSection: 500, wordsPerSubsection: 250 },
      long: { wordsPerSection: 800, wordsPerSubsection: 400 },
      comprehensive: { wordsPerSection: 1200, wordsPerSubsection: 600 }
    };

    const config = lengthConfig[target_length] || lengthConfig.medium;

    // Generate specific section or full article
    if (section_id) {
      const section = outline.sections.find(s => s.order === parseInt(section_id));
      if (!section) {
        throw new Error(`Section ${section_id} not found`);
      }
      return this.generateSection(topic, section, outline, researchData, config, include_citations, output_format);
    } else {
      return this.generateFullArticle(topic, outline, researchData, config, include_citations, output_format);
    }
  }

  async generateFullArticle(topic, outline, researchData, config, include_citations, output_format) {
    const article = {
      title: topic,
      content: '',
      sections: [],
      citations: [],
      word_count: 0,
      sections_written: 0,
      format: output_format,
      generated_at: new Date().toISOString()
    };

    // Generate title
    article.content = this.formatTitle(topic, output_format);

    // Generate each section
    for (const section of outline.sections) {
      const sectionContent = await this.generateSection(
        topic, 
        section, 
        outline, 
        researchData, 
        config, 
        include_citations, 
        output_format
      );

      article.sections.push(sectionContent);
      article.content += '\n\n' + sectionContent.content;
      article.word_count += sectionContent.word_count;
      article.sections_written += 1;

      // Collect citations
      if (sectionContent.citations) {
        article.citations.push(...sectionContent.citations);
      }
    }

    // Add citations section if needed
    if (include_citations && article.citations.length > 0) {
      article.content += '\n\n' + this.formatCitations(article.citations, output_format);
    }

    // Deduplicate citations
    article.citations = this.deduplicateCitations(article.citations);

    return article;
  }

  async generateSection(topic, section, outline, researchData, config, include_citations, output_format) {
    const sectionResult = {
      title: section.title,
      content: '',
      subsections: [],
      citations: [],
      word_count: 0
    };

    // Generate section heading
    sectionResult.content = this.formatHeading(section.title, 2, output_format);

    // Generate section introduction
    const intro = await this.generateSectionIntro(topic, section, outline, config.wordsPerSection);
    sectionResult.content += '\n\n' + intro.text;
    sectionResult.word_count += this.countWords(intro.text);

    // Generate subsections
    if (section.subsections && section.subsections.length > 0) {
      for (const subsection of section.subsections) {
        const subsectionContent = await this.generateSubsection(
          topic,
          section,
          subsection,
          researchData,
          config.wordsPerSubsection,
          include_citations
        );

        sectionResult.subsections.push(subsectionContent);
        sectionResult.content += '\n\n' + this.formatHeading(subsection.title, 3, output_format);
        sectionResult.content += '\n\n' + subsectionContent.text;
        sectionResult.word_count += this.countWords(subsectionContent.text);

        if (subsectionContent.citations) {
          sectionResult.citations.push(...subsectionContent.citations);
        }
      }
    } else {
      // Generate main content if no subsections
      const mainContent = await this.generateSectionContent(
        topic,
        section,
        researchData,
        config.wordsPerSection,
        include_citations
      );

      sectionResult.content += '\n\n' + mainContent.text;
      sectionResult.word_count += this.countWords(mainContent.text);

      if (mainContent.citations) {
        sectionResult.citations.push(...mainContent.citations);
      }
    }

    return sectionResult;
  }

  async generateSectionIntro(topic, section, outline, targetWords) {
    const prompt = `Write an introduction for the following section of an article about "${topic}":

Section: ${section.title}
Description: ${section.description}

This introduction should:
1. Introduce what will be covered in this section
2. Connect to previous sections if applicable
3. Set up the context for the subsections
4. Be approximately ${targetWords / 4} words

Write in a clear, engaging style suitable for a comprehensive article.`;

    const response = await this.adapter.generateText(prompt, {
      temperature: 0.7,
      max_tokens: Math.ceil(targetWords / 2)
    });

    return { text: response.text };
  }

  async generateSubsection(topic, section, subsection, researchData, targetWords, include_citations) {
    // Find relevant sources for this subsection
    const relevantSources = this.findRelevantSources(subsection, researchData);

    const sourcesText = relevantSources
      .slice(0, 5)
      .map((s, i) => `[${i+1}] ${s.title}: ${s.content.substring(0, 200)}...`)
      .join('\n');

    const prompt = `Write content for the following subsection of an article about "${topic}":

Section: ${section.title}
Subsection: ${subsection.title}
Description: ${subsection.description}

${sourcesText ? `Relevant sources to cite:\n${sourcesText}\n` : ''}

Requirements:
1. Write approximately ${targetWords} words
2. Be informative and comprehensive
3. Use clear, engaging language
4. ${include_citations ? 'Include citations using [1], [2] format where appropriate' : 'Do not include citations'}
5. Focus on facts and insights

Write the content:`;

    const response = await this.adapter.generateText(prompt, {
      temperature: 0.7,
      max_tokens: targetWords * 2
    });

    const citations = include_citations ? this.extractCitations(response.text, relevantSources) : [];

    return {
      text: response.text,
      citations
    };
  }

  async generateSectionContent(topic, section, researchData, targetWords, include_citations) {
    const relevantSources = this.findRelevantSources(section, researchData);

    const sourcesText = relevantSources
      .slice(0, 8)
      .map((s, i) => `[${i+1}] ${s.title}: ${s.content.substring(0, 200)}...`)
      .join('\n');

    const prompt = `Write comprehensive content for the following section of an article about "${topic}":

Section: ${section.title}
Description: ${section.description}

${sourcesText ? `Relevant sources to cite:\n${sourcesText}\n` : ''}

Requirements:
1. Write approximately ${targetWords} words
2. Cover the topic comprehensively
3. Use clear, professional language
4. ${include_citations ? 'Include citations using [1], [2] format' : 'Do not include citations'}
5. Organize content with clear paragraphs

Write the content:`;

    const response = await this.adapter.generateText(prompt, {
      temperature: 0.7,
      max_tokens: targetWords * 2
    });

    const citations = include_citations ? this.extractCitations(response.text, relevantSources) : [];

    return {
      text: response.text,
      citations
    };
  }

  findRelevantSources(section, researchData) {
    const relevant = [];
    const sectionKeywords = this.extractKeywords(section.title + ' ' + section.description);

    for (const source of researchData.sources) {
      const sourceKeywords = this.extractKeywords(source.title + ' ' + source.content);
      const relevanceScore = this.calculateRelevance(sectionKeywords, sourceKeywords);

      if (relevanceScore > 0.3) {
        relevant.push({
          ...source,
          relevance: relevanceScore
        });
      }
    }

    // Sort by relevance
    return relevant.sort((a, b) => b.relevance - a.relevance);
  }

  extractKeywords(text) {
    // Simple keyword extraction
    return text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
  }

  calculateRelevance(keywords1, keywords2) {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    
    let overlap = 0;
    for (const word of set1) {
      if (set2.has(word)) {
        overlap++;
      }
    }

    return overlap / Math.max(set1.size, set2.size);
  }

  isStopWord(word) {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
      'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
      'that', 'these', 'those', 'from', 'with', 'about', 'into', 'through'
    ]);
    
    return stopWords.has(word);
  }

  extractCitations(text, sources) {
    const citations = [];
    const citationPattern = /\[(\d+)\]/g;
    
    let match;
    while ((match = citationPattern.exec(text)) !== null) {
      const index = parseInt(match[1]) - 1;
      if (index >= 0 && index < sources.length) {
        citations.push({
          number: match[1],
          source: sources[index]
        });
      }
    }

    return citations;
  }

  formatTitle(title, format) {
    switch (format) {
      case 'markdown':
        return `# ${title}`;
      case 'html':
        return `<h1>${title}</h1>`;
      default:
        return title.toUpperCase();
    }
  }

  formatHeading(text, level, format) {
    switch (format) {
      case 'markdown':
        return '#'.repeat(level) + ' ' + text;
      case 'html':
        return `<h${level}>${text}</h${level}>`;
      default:
        return '\n' + text + '\n' + '='.repeat(text.length);
    }
  }

  formatCitations(citations, format) {
    const uniqueCitations = this.deduplicateCitations(citations);
    
    let citationsText = this.formatHeading('References', 2, format) + '\n\n';
    
    for (const citation of uniqueCitations) {
      const source = citation.source;
      switch (format) {
        case 'markdown':
          citationsText += `[${citation.number}] ${source.title}. ${source.url || 'No URL'}\n\n`;
          break;
        case 'html':
          citationsText += `<p>[${citation.number}] ${source.title}. <a href="${source.url || '#'}">${source.url || 'No URL'}</a></p>\n`;
          break;
        default:
          citationsText += `[${citation.number}] ${source.title}. ${source.url || 'No URL'}\n\n`;
      }
    }

    return citationsText;
  }

  deduplicateCitations(citations) {
    const seen = new Map();
    const unique = [];

    for (const citation of citations) {
      const key = citation.source.url || citation.source.title;
      if (!seen.has(key)) {
        seen.set(key, true);
        unique.push(citation);
      }
    }

    // Renumber citations
    return unique.map((c, i) => ({
      ...c,
      number: String(i + 1)
    }));
  }

  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}