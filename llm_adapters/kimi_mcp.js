// Kimi K2 MCP Adapter for STORM
// Uses Kimi K2 through the Moonshot API

import axios from 'axios';

export class KimiMCPAdapter {
  constructor(model = 'kimi-k2-0711-preview') {
    this.model = model;
    this.provider = 'kimi';
    this.apiKey = process.env.KIMI_API_KEY;
    this.baseUrl = 'https://api.moonshot.ai/v1';
    
    // Validate API key is configured
    if (!this.apiKey) {
      throw new Error('KIMI_API_KEY environment variable is required but not set');
    }
  }

  async generateText(prompt, options = {}) {
    const {
      temperature = 0.7,
      max_tokens = 2000,
      system_prompt = null
    } = options;

    try {
      const messages = [];
      
      if (system_prompt) {
        messages.push({ role: 'system', content: system_prompt });
      }
      
      messages.push({ role: 'user', content: prompt });

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature,
          max_tokens,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const text = response.data.choices[0].message.content;

      return {
        text,
        model: this.model,
        usage: response.data.usage || {
          prompt_tokens: Math.ceil(prompt.length / 4),
          completion_tokens: Math.ceil(text.length / 4),
          total_tokens: Math.ceil((prompt.length + text.length) / 4)
        }
      };
    } catch (error) {
      console.error('Kimi MCP Adapter error:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateWithMessages(messages, options = {}) {
    const {
      temperature = 0.7,
      max_tokens = 2000
    } = options;

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature,
          max_tokens,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const text = response.data.choices[0].message.content;

      return {
        text,
        model: this.model,
        usage: response.data.usage || {
          prompt_tokens: Math.ceil(JSON.stringify(messages).length / 4),
          completion_tokens: Math.ceil(text.length / 4),
          total_tokens: Math.ceil((JSON.stringify(messages).length + text.length) / 4)
        }
      };
    } catch (error) {
      console.error('Kimi MCP Adapter error:', error.response?.data || error.message);
      throw error;
    }
  }

  async streamGenerate(prompt, options = {}, onChunk) {
    const {
      temperature = 0.7,
      max_tokens = 2000,
      system_prompt = null
    } = options;

    try {
      const messages = [];
      
      if (system_prompt) {
        messages.push({ role: 'system', content: system_prompt });
      }
      
      messages.push({ role: 'user', content: prompt });

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature,
          max_tokens,
          stream: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );

      let fullText = '';
      
      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                resolve({
                  text: fullText,
                  model: this.model,
                  usage: {
                    prompt_tokens: Math.ceil(prompt.length / 4),
                    completion_tokens: Math.ceil(fullText.length / 4),
                    total_tokens: Math.ceil((prompt.length + fullText.length) / 4)
                  }
                });
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  fullText += content;
                  onChunk(content);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        });

        response.data.on('error', reject);
      });
    } catch (error) {
      // Fallback to non-streaming
      const response = await this.generateText(prompt, options);
      
      // Simulate streaming
      const chunks = response.text.match(/.{1,50}/g) || [];
      for (const chunk of chunks) {
        onChunk(chunk);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      return response;
    }
  }

  // Method for STORM's conversation simulation
  async simulateConversation(persona, topic, context, options = {}) {
    const systemPrompt = `You are ${persona.name}, ${persona.description}. 
You are having a conversation about "${topic}".
Your expertise: ${persona.expertise}
Your perspective: ${persona.perspective}

Kimi K2特性提示：
- 使用你的深度思考能力来生成有洞察力的问题
- 从多个角度分析话题
- 提供独特的观点和见解`;

    const prompt = `Given the following context about ${topic}:
${context}

As ${persona.name}, what questions would you ask to understand this topic better? 
What aspects would you want to explore based on your expertise?

请使用深度思考，生成富有洞察力的问题。`;

    return this.generateText(prompt, { ...options, system_prompt: systemPrompt });
  }

  // Method for STORM's question generation
  async generateQuestions(topic, perspective, existingInfo, options = {}) {
    const prompt = `Topic: ${topic}
Perspective: ${perspective}
Existing Information: ${existingInfo}

Generate insightful questions about this topic from the given perspective that haven't been addressed in the existing information. 
Focus on questions that would lead to comprehensive understanding.

Kimi K2任务要求：
1. 生成至少5个高质量的问题
2. 问题应该具有探索性和深度
3. 避免重复已有信息中涵盖的内容
4. 从给定视角出发，但也可以跨领域思考`;

    return this.generateText(prompt, options);
  }

  // Method for STORM's outline generation
  async generateOutline(topic, information, options = {}) {
    const prompt = `Create a comprehensive outline for an article about "${topic}" based on the following researched information:

${information}

The outline should:
1. Have clear main sections (至少5个主要部分)
2. Include relevant subsections (每个主要部分包含2-4个子部分)
3. Follow a logical flow (逻辑清晰，层次分明)
4. Cover all important aspects of the topic (全面覆盖主题的各个方面)

Kimi K2优化要求：
- 使用你的深度分析能力来组织信息
- 确保大纲结构既全面又有深度
- 在适当的地方建议插入数据、案例或图表`;

    return this.generateText(prompt, options);
  }

  // Method for STORM's article generation
  async generateArticleSection(section, outline, sources, options = {}) {
    const prompt = `Write a detailed section for the following part of the article:

Section: ${section.title}
Outline: ${JSON.stringify(outline)}

Use these sources for citations:
${sources.map((s, i) => `[${i+1}] ${s.title}: ${s.content}`).join('\n')}

Include inline citations where appropriate using [1], [2], etc. format.

Kimi K2写作要求：
1. 内容要有深度和洞察力
2. 适当使用数据和事实支撑观点
3. 保持专业性的同时确保可读性
4. 每个段落都要有明确的主题句
5. 使用过渡句连接不同的想法`;

    return this.generateText(prompt, options);
  }

  // Method for STORM's article polishing
  async polishText(text, polishOptions, options = {}) {
    const polishInstructions = polishOptions.map(opt => {
      switch(opt) {
        case 'grammar': return '修正所有语法错误';
        case 'clarity': return '提高清晰度和可读性';
        case 'flow': return '增强句子和段落之间的流畅性';
        case 'citations': return '确保引用格式正确';
        case 'formatting': return '改进格式和结构';
        case 'seo': return '在保持质量的同时优化搜索引擎';
        default: return opt;
      }
    }).join(', ');

    const prompt = `Polish the following text according to these requirements: ${polishInstructions}

Text to polish:
${text}

Kimi K2润色标准：
- 保持原意的同时提升表达质量
- 使用更精确和专业的词汇
- 确保逻辑连贯性
- 增强文章的说服力和吸引力`;

    return this.generateText(prompt, options);
  }
}