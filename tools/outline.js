// Outline Generation Tool for STORM MCP
// Creates structured outlines from researched information

export class OutlineTool {
  constructor(adapter) {
    this.adapter = adapter;
  }

  async generateOutline(topic, researchData, maxSections = 5, maxSubsections = 3) {
    // Step 1: Analyze research data to identify main themes
    const themes = await this.identifyThemes(topic, researchData);
    
    // Step 2: Organize themes into logical sections
    const sections = await this.organizeSections(topic, themes, researchData, maxSections);
    
    // Step 3: Generate subsections for each section
    const outline = await this.generateSubsections(topic, sections, researchData, maxSubsections);
    
    // Step 4: Add metadata and structure
    return this.structureOutline(topic, outline, researchData);
  }

  async identifyThemes(topic, researchData) {
    // Aggregate all questions and key information
    const allQuestions = [];
    const keyInsights = [];
    
    for (const perspective of researchData.perspectives) {
      if (perspective.questions) {
        allQuestions.push(...perspective.questions);
      }
    }
    
    for (const source of researchData.sources) {
      if (source.content) {
        keyInsights.push({
          content: source.content.substring(0, 200),
          source: source.title
        });
      }
    }

    const prompt = `Analyze the following research data about "${topic}" and identify the main themes:

Questions asked:
${allQuestions.slice(0, 20).join('\n')}

Key insights from sources:
${keyInsights.slice(0, 10).map(i => `- ${i.content}... (from ${i.source})`).join('\n')}

Identify 5-8 major themes that would form the basis of a comprehensive article.
Format your response as a JSON array of theme objects:
[
  {
    "theme": "Theme name",
    "description": "What this theme covers",
    "importance": "Why this is important to cover",
    "related_questions": ["question1", "question2"]
  }
]`;

    const response = await this.adapter.generateText(prompt, {
      temperature: 0.7,
      max_tokens: 1500
    });

    try {
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing themes:', error);
    }

    // Fallback themes
    return this.getDefaultThemes(topic);
  }

  async organizeSections(topic, themes, researchData, maxSections) {
    const prompt = `Organize the following themes into ${maxSections} main sections for an article about "${topic}":

Themes:
${themes.map(t => `- ${t.theme}: ${t.description}`).join('\n')}

Create a logical flow that:
1. Starts with foundational/introductory concepts
2. Progresses to more detailed/advanced topics
3. Ends with future outlook or conclusions

Format as JSON:
[
  {
    "title": "Section Title",
    "description": "What this section covers",
    "themes": ["theme1", "theme2"],
    "order": 1
  }
]`;

    const response = await this.adapter.generateText(prompt, {
      temperature: 0.6,
      max_tokens: 1000
    });

    try {
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing sections:', error);
    }

    // Create sections from themes
    return this.createSectionsFromThemes(themes, maxSections);
  }

  async generateSubsections(topic, sections, researchData, maxSubsections) {
    const sectionsWithSubsections = [];

    for (const section of sections) {
      const prompt = `Generate ${maxSubsections} subsections for the following section of an article about "${topic}":

Section: ${section.title}
Description: ${section.description}
Related themes: ${section.themes?.join(', ') || 'General'}

The subsections should:
1. Break down the main topic into specific aspects
2. Follow a logical progression
3. Be specific and actionable

Format as JSON:
{
  "subsections": [
    {
      "title": "Subsection Title",
      "description": "What this covers",
      "key_points": ["point1", "point2"]
    }
  ]
}`;

      const response = await this.adapter.generateText(prompt, {
        temperature: 0.6,
        max_tokens: 800
      });

      try {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          section.subsections = parsed.subsections || [];
        }
      } catch (error) {
        console.error('Error parsing subsections:', error);
        section.subsections = this.getDefaultSubsections(section, maxSubsections);
      }

      sectionsWithSubsections.push(section);
    }

    return sectionsWithSubsections;
  }

  structureOutline(topic, sections, researchData) {
    // Add introduction and conclusion
    const outline = {
      title: topic,
      generated_at: new Date().toISOString(),
      total_sources: researchData.sources.length,
      perspectives_considered: researchData.perspectives.length,
      sections: [
        {
          title: "Introduction",
          description: `Overview and context for ${topic}`,
          order: 0,
          subsections: [
            {
              title: "Background and Context",
              description: "Setting the stage for understanding the topic"
            },
            {
              title: "Scope and Objectives",
              description: "What this article will cover"
            }
          ]
        },
        ...sections.map((s, i) => ({ ...s, order: i + 1 })),
        {
          title: "Conclusion",
          description: "Summary and future outlook",
          order: sections.length + 1,
          subsections: [
            {
              title: "Key Takeaways",
              description: "Main points to remember"
            },
            {
              title: "Future Directions",
              description: "What's next for this topic"
            }
          ]
        }
      ]
    };

    // Add navigation structure
    outline.navigation = this.generateNavigation(outline.sections);

    return outline;
  }

  generateNavigation(sections) {
    const nav = [];
    
    for (const section of sections) {
      const navItem = {
        title: section.title,
        order: section.order,
        subsections: []
      };
      
      if (section.subsections) {
        navItem.subsections = section.subsections.map(sub => ({
          title: sub.title
        }));
      }
      
      nav.push(navItem);
    }
    
    return nav;
  }

  getDefaultThemes(topic) {
    return [
      {
        theme: "Overview and Fundamentals",
        description: `Basic understanding of ${topic}`,
        importance: "Foundation for deeper understanding",
        related_questions: []
      },
      {
        theme: "Current State and Applications",
        description: "How it's used today",
        importance: "Practical relevance",
        related_questions: []
      },
      {
        theme: "Challenges and Limitations",
        description: "Current problems and constraints",
        importance: "Critical analysis",
        related_questions: []
      },
      {
        theme: "Future Developments",
        description: "Emerging trends and possibilities",
        importance: "Forward-looking perspective",
        related_questions: []
      }
    ];
  }

  createSectionsFromThemes(themes, maxSections) {
    const sections = [];
    const themesPerSection = Math.ceil(themes.length / maxSections);
    
    for (let i = 0; i < maxSections && i * themesPerSection < themes.length; i++) {
      const sectionThemes = themes.slice(i * themesPerSection, (i + 1) * themesPerSection);
      
      sections.push({
        title: this.generateSectionTitle(sectionThemes),
        description: this.generateSectionDescription(sectionThemes),
        themes: sectionThemes.map(t => t.theme),
        order: i + 1
      });
    }
    
    return sections;
  }

  generateSectionTitle(themes) {
    if (themes.length === 1) {
      return themes[0].theme;
    }
    
    // Find common thread
    const firstTheme = themes[0].theme.toLowerCase();
    if (firstTheme.includes('overview') || firstTheme.includes('fundamental')) {
      return "Foundation and Overview";
    } else if (firstTheme.includes('current') || firstTheme.includes('application')) {
      return "Current Applications and Use Cases";
    } else if (firstTheme.includes('challenge') || firstTheme.includes('limitation')) {
      return "Challenges and Considerations";
    } else if (firstTheme.includes('future') || firstTheme.includes('trend')) {
      return "Future Outlook and Trends";
    }
    
    return themes[0].theme;
  }

  generateSectionDescription(themes) {
    const descriptions = themes.map(t => t.description).join(', ');
    return `This section covers: ${descriptions}`;
  }

  getDefaultSubsections(section, maxSubsections) {
    const defaults = [
      {
        title: "Key Concepts",
        description: "Important concepts to understand",
        key_points: []
      },
      {
        title: "Detailed Analysis",
        description: "In-depth exploration",
        key_points: []
      },
      {
        title: "Practical Examples",
        description: "Real-world applications",
        key_points: []
      }
    ];
    
    return defaults.slice(0, maxSubsections);
  }
}