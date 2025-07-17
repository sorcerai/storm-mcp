#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Import adapters
import { ClaudeMCPAdapter } from './llm_adapters/claude_mcp.js';
import { GeminiMCPAdapter } from './llm_adapters/gemini_mcp.js';
import { KimiMCPAdapter } from './llm_adapters/kimi_mcp.js';

// Import tools
import { ResearchTool } from './tools/research.js';
import { OutlineTool } from './tools/outline.js';
import { GenerateTool } from './tools/generate.js';
import { PolishTool } from './tools/polish.js';

// Import swarm orchestrator
import { SwarmOrchestrator } from './swarm/orchestrator.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Security Configuration
const SECURITY_CONFIG = {
  MAX_SESSIONS: 100,
  MAX_SESSION_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
  MAX_TOPIC_LENGTH: 500,
  MAX_PERSPECTIVES: 10,
  MAX_QUESTIONS_PER_PERSPECTIVE: 20,
  MAX_SECTIONS: 10,
  MAX_SUBSECTIONS: 5,
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 10,
  ALLOWED_OUTPUT_FORMATS: ['markdown', 'html', 'plain'],
  ALLOWED_SEARCH_ENGINES: ['google', 'bing', 'duckduckgo', 'you'],
  ALLOWED_SEARCH_DEPTHS: ['shallow', 'standard', 'deep'],
  ALLOWED_ARTICLE_LENGTHS: ['short', 'medium', 'long', 'comprehensive'],
  ALLOWED_POLISH_OPTIONS: ['grammar', 'clarity', 'flow', 'citations', 'formatting', 'seo'],
  ALLOWED_EXPORT_FORMATS: ['markdown', 'html', 'pdf', 'docx', 'plain'],
  ALLOWED_SWARM_TYPES: ['claude-flow', 'ruv-swarm'],
  ALLOWED_TOPOLOGIES: ['hierarchical', 'mesh', 'ring', 'star']
};

// Rate limiting storage
const rateLimitMap = new Map();

// Store active STORM sessions with size limits
const stormSessions = new Map();

// Initialize swarm orchestrator
const swarmOrchestrator = new SwarmOrchestrator();

// Security: Validate LLM provider
const ALLOWED_LLM_PROVIDERS = ['claude', 'gemini', 'kimi'];

// Store LLM configurations with validation
const llmConfigs = {
  claude: {
    adapter: ClaudeMCPAdapter,
    models: {
      conversation: 'claude-3-sonnet',
      question: 'claude-3-haiku',
      outline: 'claude-3-sonnet',
      article: 'claude-3-opus',
      polish: 'claude-3-sonnet'
    }
  },
  gemini: {
    adapter: GeminiMCPAdapter,
    models: {
      conversation: 'gemini-1.5-pro',
      question: 'gemini-1.5-flash',
      outline: 'gemini-1.5-pro',
      article: 'gemini-1.5-pro',
      polish: 'gemini-1.5-pro'
    }
  },
  kimi: {
    adapter: KimiMCPAdapter,
    models: {
      conversation: 'kimi-k2-0711-preview',
      question: 'kimi-k2-0711-preview',
      outline: 'kimi-k2-0711-preview',
      article: 'kimi-k2-0711-preview',
      polish: 'kimi-k2-0711-preview'
    }
  }
};

// Security: Input validation functions
function validateLLMProvider(provider) {
  if (!provider || typeof provider !== 'string') {
    throw new Error('LLM provider must be a non-empty string');
  }
  if (!ALLOWED_LLM_PROVIDERS.includes(provider)) {
    throw new Error(`Invalid LLM provider. Allowed values: ${ALLOWED_LLM_PROVIDERS.join(', ')}`);
  }
  return provider;
}

function validateTopic(topic) {
  if (!topic || typeof topic !== 'string') {
    throw new Error('Topic must be a non-empty string');
  }
  if (topic.length > SECURITY_CONFIG.MAX_TOPIC_LENGTH) {
    throw new Error(`Topic too long. Maximum length: ${SECURITY_CONFIG.MAX_TOPIC_LENGTH}`);
  }
  // Sanitize topic - remove potential script tags and suspicious patterns
  const sanitized = topic.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                          .replace(/javascript:/gi, '')
                          .replace(/data:text\/html/gi, '');
  return sanitized.trim();
}

function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new Error('Session ID must be a non-empty string');
  }
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    throw new Error('Invalid session ID format');
  }
  return sessionId;
}

function validateNumber(value, min, max, name) {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${name} must be a number`);
  }
  if (value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
  return value;
}

function validateEnum(value, allowedValues, name) {
  if (!allowedValues.includes(value)) {
    throw new Error(`Invalid ${name}. Allowed values: ${allowedValues.join(', ')}`);
  }
  return value;
}

function validateArray(value, allowedValues, name) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
  for (const item of value) {
    if (!allowedValues.includes(item)) {
      throw new Error(`Invalid ${name} item: ${item}. Allowed values: ${allowedValues.join(', ')}`);
    }
  }
  return value;
}

// Security: Rate limiting
function checkRateLimit(identifier = 'default') {
  const now = Date.now();
  const windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS;
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, []);
  }
  
  const requests = rateLimitMap.get(identifier);
  
  // Remove old requests
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (validRequests.length >= SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    throw new Error('Rate limit exceeded. Please wait before making more requests.');
  }
  
  validRequests.push(now);
  rateLimitMap.set(identifier, validRequests);
}

// Security: Session management
function cleanupOldSessions() {
  const now = Date.now();
  const cutoff = now - SECURITY_CONFIG.MAX_SESSION_AGE_MS;
  
  for (const [sessionId, session] of stormSessions.entries()) {
    if (new Date(session.created_at).getTime() < cutoff) {
      stormSessions.delete(sessionId);
    }
  }
}

function enforceSessionLimit() {
  if (stormSessions.size >= SECURITY_CONFIG.MAX_SESSIONS) {
    // Remove oldest session
    const oldest = Array.from(stormSessions.entries())
      .sort(([,a], [,b]) => new Date(a.created_at) - new Date(b.created_at))[0];
    if (oldest) {
      stormSessions.delete(oldest[0]);
    }
  }
}

// Security: Error sanitization
function sanitizeError(error, toolName) {
  // Log the full error for debugging
  console.error(`[SECURITY] Error in tool ${toolName}:`, error);
  
  // Return sanitized error message
  const sanitizedMessage = error.message || 'An error occurred';
  
  // Remove potential path information
  const cleanMessage = sanitizedMessage
    .replace(/\/[^\s]+/g, '[PATH]')
    .replace(/at [^\s]+/g, '[STACK]')
    .replace(/Error: /g, '')
    .substring(0, 200); // Limit length
  
  return {
    error: 'Operation failed',
    message: cleanMessage,
    tool: toolName,
    timestamp: new Date().toISOString()
  };
}

// Run cleanup every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);

// Available tools with enhanced security
const TOOLS = {
  'storm_create_session': {
    description: 'Create a new STORM article generation session',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to generate an article about',
          maxLength: SECURITY_CONFIG.MAX_TOPIC_LENGTH
        },
        llm_provider: {
          type: 'string',
          enum: ALLOWED_LLM_PROVIDERS,
          description: 'Which LLM provider to use',
          default: 'claude'
        },
        search_engine: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_SEARCH_ENGINES,
          description: 'Which search engine to use',
          default: 'google'
        },
        output_format: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_OUTPUT_FORMATS,
          description: 'Output format for the article',
          default: 'markdown'
        }
      },
      required: ['topic'],
      additionalProperties: false
    }
  },
  'storm_research': {
    description: 'Research and collect information about a topic',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID',
          pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        },
        max_perspectives: {
          type: 'number',
          description: 'Maximum number of perspectives to generate',
          minimum: 1,
          maximum: SECURITY_CONFIG.MAX_PERSPECTIVES,
          default: 5
        },
        max_questions_per_perspective: {
          type: 'number',
          description: 'Maximum questions per perspective',
          minimum: 1,
          maximum: SECURITY_CONFIG.MAX_QUESTIONS_PER_PERSPECTIVE,
          default: 10
        },
        search_depth: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_SEARCH_DEPTHS,
          description: 'How deep to search for information',
          default: 'standard'
        }
      },
      required: ['session_id'],
      additionalProperties: false
    }
  },
  'storm_generate_outline': {
    description: 'Generate an article outline from researched information',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID',
          pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        },
        max_sections: {
          type: 'number',
          description: 'Maximum number of main sections',
          minimum: 1,
          maximum: SECURITY_CONFIG.MAX_SECTIONS,
          default: 5
        },
        max_subsections: {
          type: 'number',
          description: 'Maximum subsections per section',
          minimum: 1,
          maximum: SECURITY_CONFIG.MAX_SUBSECTIONS,
          default: 3
        }
      },
      required: ['session_id'],
      additionalProperties: false
    }
  },
  'storm_generate_article': {
    description: 'Generate full article content from outline',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID',
          pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        },
        section_id: {
          type: 'string',
          description: 'Generate specific section only (optional)',
          maxLength: 100
        },
        include_citations: {
          type: 'boolean',
          description: 'Include source citations',
          default: true
        },
        target_length: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_ARTICLE_LENGTHS,
          description: 'Target article length',
          default: 'medium'
        }
      },
      required: ['session_id'],
      additionalProperties: false
    }
  },
  'storm_polish_article': {
    description: 'Polish and improve the generated article',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID',
          pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        },
        polish_options: {
          type: 'array',
          items: {
            type: 'string',
            enum: SECURITY_CONFIG.ALLOWED_POLISH_OPTIONS
          },
          description: 'Aspects to polish',
          default: ['grammar', 'clarity', 'flow'],
          maxItems: 6
        }
      },
      required: ['session_id'],
      additionalProperties: false
    }
  },
  'storm_get_session': {
    description: 'Get current status and data from a STORM session',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID',
          pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        },
        include_research: {
          type: 'boolean',
          description: 'Include research data',
          default: false
        },
        include_outline: {
          type: 'boolean',
          description: 'Include outline data',
          default: true
        },
        include_article: {
          type: 'boolean',
          description: 'Include article content',
          default: true
        }
      },
      required: ['session_id'],
      additionalProperties: false
    }
  },
  'storm_export': {
    description: 'Export the generated article in various formats',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID',
          pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        },
        format: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_EXPORT_FORMATS,
          description: 'Export format',
          default: 'markdown'
        },
        include_metadata: {
          type: 'boolean',
          description: 'Include metadata like sources and timestamps',
          default: true
        }
      },
      required: ['session_id'],
      additionalProperties: false
    }
  },
  'storm_list_sessions': {
    description: 'List all active STORM sessions',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  'storm_delete_session': {
    description: 'Delete a STORM session and its data',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID to delete',
          pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        }
      },
      required: ['session_id'],
      additionalProperties: false
    }
  },
  'storm_run_full_pipeline': {
    description: 'Run the complete STORM pipeline end-to-end',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to generate an article about',
          maxLength: SECURITY_CONFIG.MAX_TOPIC_LENGTH
        },
        llm_provider: {
          type: 'string',
          enum: ALLOWED_LLM_PROVIDERS,
          description: 'Which LLM provider to use',
          default: 'claude'
        },
        search_engine: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_SEARCH_ENGINES,
          description: 'Which search engine to use',
          default: 'google'
        },
        output_format: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_OUTPUT_FORMATS,
          description: 'Output format for the article',
          default: 'markdown'
        },
        research_depth: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_SEARCH_DEPTHS,
          description: 'Research thoroughness',
          default: 'standard'
        },
        article_length: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_ARTICLE_LENGTHS,
          description: 'Target article length',
          default: 'medium'
        }
      },
      required: ['topic'],
      additionalProperties: false
    }
  },
  'storm_create_swarm': {
    description: 'Create a swarm-orchestrated STORM session using multiple LLMs',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to generate an article about',
          maxLength: SECURITY_CONFIG.MAX_TOPIC_LENGTH
        },
        swarm_type: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_SWARM_TYPES,
          description: 'Which swarm orchestrator to use',
          default: 'claude-flow'
        },
        topology: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_TOPOLOGIES,
          description: 'Swarm topology',
          default: 'hierarchical'
        },
        max_agents: {
          type: 'number',
          description: 'Maximum number of agents in swarm',
          minimum: 1,
          maximum: 20,
          default: 8
        },
        output_format: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_OUTPUT_FORMATS,
          description: 'Output format for the article',
          default: 'markdown'
        }
      },
      required: ['topic'],
      additionalProperties: false
    }
  },
  'storm_run_swarm_pipeline': {
    description: 'Run STORM with swarm orchestration - multiple LLMs working together',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to generate an article about',
          maxLength: SECURITY_CONFIG.MAX_TOPIC_LENGTH
        },
        swarm_type: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_SWARM_TYPES,
          description: 'Which swarm orchestrator to use',
          default: 'claude-flow'
        },
        research_depth: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_SEARCH_DEPTHS,
          description: 'Research thoroughness',
          default: 'deep'
        },
        article_length: {
          type: 'string',
          enum: SECURITY_CONFIG.ALLOWED_ARTICLE_LENGTHS,
          description: 'Target article length',
          default: 'comprehensive'
        },
        parallelization: {
          type: 'boolean',
          description: 'Enable parallel processing',
          default: true
        }
      },
      required: ['topic'],
      additionalProperties: false
    }
  },
  'storm_get_swarm_status': {
    description: 'Get status of a swarm-orchestrated STORM session',
    inputSchema: {
      type: 'object',
      properties: {
        swarm_id: {
          type: 'string',
          description: 'Swarm ID to check status',
          pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        }
      },
      required: ['swarm_id'],
      additionalProperties: false
    }
  }
};

// Create server instance
const server = new Server(
  {
    name: 'storm-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Object.entries(TOOLS).map(([name, config]) => ({
    name,
    description: config.description,
    inputSchema: config.inputSchema
  }));
  
  return { tools };
});

// Handle tool execution with security
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    // Rate limiting
    checkRateLimit();
    
    // Input validation
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments provided');
    }
    
    // Clean up old sessions
    cleanupOldSessions();
    
    switch (name) {
      case 'storm_create_session': {
        const topic = validateTopic(args.topic);
        const llm_provider = validateLLMProvider(args.llm_provider || 'claude');
        const search_engine = validateEnum(args.search_engine || 'google', SECURITY_CONFIG.ALLOWED_SEARCH_ENGINES, 'search_engine');
        const output_format = validateEnum(args.output_format || 'markdown', SECURITY_CONFIG.ALLOWED_OUTPUT_FORMATS, 'output_format');
        
        // Enforce session limits
        enforceSessionLimit();
        
        const sessionId = uuidv4();
        
        // Initialize LLM adapters based on provider
        const config = llmConfigs[llm_provider];
        const adapters = {};
        
        for (const [role, model] of Object.entries(config.models)) {
          adapters[role] = new config.adapter(model);
        }
        
        // Create session
        const session = {
          id: sessionId,
          topic,
          llm_provider,
          search_engine,
          output_format,
          adapters,
          created_at: new Date().toISOString(),
          status: 'created',
          research_data: null,
          outline: null,
          article: null,
          metadata: {}
        };
        
        stormSessions.set(sessionId, session);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              session_id: sessionId,
              topic,
              llm_provider,
              search_engine,
              output_format,
              status: 'created',
              message: `STORM session created successfully. Use session_id '${sessionId}' for subsequent operations.`
            }, null, 2)
          }]
        };
      }
      
      case 'storm_research': {
        const session_id = validateSessionId(args.session_id);
        const max_perspectives = validateNumber(args.max_perspectives || 5, 1, SECURITY_CONFIG.MAX_PERSPECTIVES, 'max_perspectives');
        const max_questions_per_perspective = validateNumber(args.max_questions_per_perspective || 10, 1, SECURITY_CONFIG.MAX_QUESTIONS_PER_PERSPECTIVE, 'max_questions_per_perspective');
        const search_depth = validateEnum(args.search_depth || 'standard', SECURITY_CONFIG.ALLOWED_SEARCH_DEPTHS, 'search_depth');
        
        const session = stormSessions.get(session_id);
        
        if (!session) {
          throw new Error(`Session not found`);
        }
        
        session.status = 'researching';
        
        // Use research tool
        const researchTool = new ResearchTool(session.adapters, session.search_engine);
        const researchData = await researchTool.research(
          session.topic,
          max_perspectives,
          max_questions_per_perspective,
          search_depth
        );
        
        session.research_data = researchData;
        session.status = 'researched';
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              session_id,
              status: 'researched',
              perspectives_generated: researchData.perspectives.length,
              total_questions: researchData.total_questions,
              sources_collected: researchData.sources.length,
              message: 'Research completed successfully'
            }, null, 2)
          }]
        };
      }
      
      case 'storm_generate_outline': {
        const session_id = validateSessionId(args.session_id);
        const max_sections = validateNumber(args.max_sections || 5, 1, SECURITY_CONFIG.MAX_SECTIONS, 'max_sections');
        const max_subsections = validateNumber(args.max_subsections || 3, 1, SECURITY_CONFIG.MAX_SUBSECTIONS, 'max_subsections');
        
        const session = stormSessions.get(session_id);
        
        if (!session) {
          throw new Error(`Session not found`);
        }
        
        if (!session.research_data) {
          throw new Error('No research data available. Run storm_research first.');
        }
        
        session.status = 'outlining';
        
        // Use outline tool
        const outlineTool = new OutlineTool(session.adapters.outline);
        const outline = await outlineTool.generateOutline(
          session.topic,
          session.research_data,
          max_sections,
          max_subsections
        );
        
        session.outline = outline;
        session.status = 'outlined';
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              session_id,
              status: 'outlined',
              sections: outline.sections.length,
              total_subsections: outline.sections.reduce((sum, s) => sum + (s.subsections?.length || 0), 0),
              message: 'Outline generated successfully'
            }, null, 2)
          }]
        };
      }
      
      case 'storm_generate_article': {
        const session_id = validateSessionId(args.session_id);
        const section_id = args.section_id ? args.section_id.substring(0, 100) : undefined;
        const include_citations = typeof args.include_citations === 'boolean' ? args.include_citations : true;
        const target_length = validateEnum(args.target_length || 'medium', SECURITY_CONFIG.ALLOWED_ARTICLE_LENGTHS, 'target_length');
        
        const session = stormSessions.get(session_id);
        
        if (!session) {
          throw new Error(`Session not found`);
        }
        
        if (!session.outline) {
          throw new Error('No outline available. Run storm_generate_outline first.');
        }
        
        session.status = 'generating';
        
        // Use generate tool
        const generateTool = new GenerateTool(session.adapters.article);
        const article = await generateTool.generateArticle(
          session.topic,
          session.outline,
          session.research_data,
          {
            section_id,
            include_citations,
            target_length,
            output_format: session.output_format
          }
        );
        
        session.article = article;
        session.status = 'generated';
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              session_id,
              status: 'generated',
              word_count: article.word_count,
              sections_written: article.sections_written,
              citations_included: article.citations.length,
              message: 'Article generated successfully'
            }, null, 2)
          }]
        };
      }
      
      case 'storm_polish_article': {
        const session_id = validateSessionId(args.session_id);
        const polish_options = validateArray(args.polish_options || ['grammar', 'clarity', 'flow'], SECURITY_CONFIG.ALLOWED_POLISH_OPTIONS, 'polish_options');
        
        const session = stormSessions.get(session_id);
        
        if (!session) {
          throw new Error(`Session not found`);
        }
        
        if (!session.article) {
          throw new Error('No article available. Run storm_generate_article first.');
        }
        
        session.status = 'polishing';
        
        // Use polish tool
        const polishTool = new PolishTool(session.adapters.polish);
        const polishedArticle = await polishTool.polishArticle(
          session.article,
          polish_options
        );
        
        session.article = polishedArticle;
        session.status = 'completed';
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              session_id,
              status: 'completed',
              improvements_made: polishedArticle.improvements,
              final_word_count: polishedArticle.word_count,
              message: 'Article polished successfully'
            }, null, 2)
          }]
        };
      }
      
      case 'storm_get_session': {
        const session_id = validateSessionId(args.session_id);
        const include_research = typeof args.include_research === 'boolean' ? args.include_research : false;
        const include_outline = typeof args.include_outline === 'boolean' ? args.include_outline : true;
        const include_article = typeof args.include_article === 'boolean' ? args.include_article : true;
        
        const session = stormSessions.get(session_id);
        
        if (!session) {
          throw new Error(`Session not found`);
        }
        
        const response = {
          session_id,
          topic: session.topic,
          status: session.status,
          llm_provider: session.llm_provider,
          search_engine: session.search_engine,
          output_format: session.output_format,
          created_at: session.created_at
        };
        
        if (include_research && session.research_data) {
          response.research_summary = {
            perspectives: session.research_data.perspectives.length,
            total_questions: session.research_data.total_questions,
            sources: session.research_data.sources.length
          };
        }
        
        if (include_outline && session.outline) {
          response.outline = session.outline;
        }
        
        if (include_article && session.article) {
          response.article = session.article.content;
        }
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }]
        };
      }
      
      case 'storm_export': {
        const session_id = validateSessionId(args.session_id);
        const format = validateEnum(args.format || 'markdown', SECURITY_CONFIG.ALLOWED_EXPORT_FORMATS, 'format');
        const include_metadata = typeof args.include_metadata === 'boolean' ? args.include_metadata : true;
        
        const session = stormSessions.get(session_id);
        
        if (!session) {
          throw new Error(`Session not found`);
        }
        
        if (!session.article) {
          throw new Error('No article available to export');
        }
        
        let exportContent = session.article.content;
        
        if (include_metadata) {
          const metadata = {
            topic: session.topic,
            generated_at: new Date().toISOString(),
            llm_provider: session.llm_provider,
            word_count: session.article.word_count,
            sources: session.research_data?.sources.length || 0
          };
          
          if (format === 'markdown') {
            exportContent = `---\n${Object.entries(metadata).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n${exportContent}`;
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: exportContent
          }]
        };
      }
      
      case 'storm_list_sessions': {
        const sessions = Array.from(stormSessions.entries()).map(([id, session]) => ({
          session_id: id,
          topic: session.topic,
          status: session.status,
          llm_provider: session.llm_provider,
          created_at: session.created_at
        }));
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total_sessions: sessions.length,
              sessions
            }, null, 2)
          }]
        };
      }
      
      case 'storm_delete_session': {
        const session_id = validateSessionId(args.session_id);
        
        if (!stormSessions.has(session_id)) {
          throw new Error(`Session not found`);
        }
        
        stormSessions.delete(session_id);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              session_id,
              status: 'deleted',
              message: 'Session deleted successfully'
            }, null, 2)
          }]
        };
      }
      
      case 'storm_create_swarm': {
        const topic = validateTopic(args.topic);
        const swarm_type = validateEnum(args.swarm_type || 'claude-flow', SECURITY_CONFIG.ALLOWED_SWARM_TYPES, 'swarm_type');
        const topology = validateEnum(args.topology || 'hierarchical', SECURITY_CONFIG.ALLOWED_TOPOLOGIES, 'topology');
        const max_agents = validateNumber(args.max_agents || 8, 1, 20, 'max_agents');
        const output_format = validateEnum(args.output_format || 'markdown', SECURITY_CONFIG.ALLOWED_OUTPUT_FORMATS, 'output_format');
        
        try {
          const swarm = await swarmOrchestrator.createSwarm(topic, {
            swarmType: swarm_type,
            topology,
            maxAgents: max_agents,
            strategy: 'specialized'
          });
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                swarm_id: swarm.id,
                topic,
                swarm_type,
                topology,
                total_agents: swarm.agents.size,
                status: swarm.status,
                agent_distribution: {
                  claude: Array.from(swarm.agents.values()).filter(a => a.llm === 'claude').length,
                  gemini: Array.from(swarm.agents.values()).filter(a => a.llm === 'gemini').length,
                  kimi: Array.from(swarm.agents.values()).filter(a => a.llm === 'kimi').length
                },
                message: `Swarm created with ${swarm.agents.size} specialized agents ready for collaborative article generation`
              }, null, 2)
            }]
          };
        } catch (error) {
          throw new Error(`Failed to create swarm: ${error.message.substring(0, 100)}`);
        }
      }
      
      case 'storm_run_swarm_pipeline': {
        const topic = validateTopic(args.topic);
        const swarm_type = validateEnum(args.swarm_type || 'claude-flow', SECURITY_CONFIG.ALLOWED_SWARM_TYPES, 'swarm_type');
        const research_depth = validateEnum(args.research_depth || 'deep', SECURITY_CONFIG.ALLOWED_SEARCH_DEPTHS, 'research_depth');
        const article_length = validateEnum(args.article_length || 'comprehensive', SECURITY_CONFIG.ALLOWED_ARTICLE_LENGTHS, 'article_length');
        const parallelization = typeof args.parallelization === 'boolean' ? args.parallelization : true;
        
        try {
          console.log(`Starting swarm-orchestrated STORM pipeline for: ${topic}`);
          
          const result = await swarmOrchestrator.orchestrateSTORM(topic, {
            swarmType: swarm_type,
            researchDepth: research_depth,
            articleLength: article_length,
            parallelization
          });
          
          // Store the result in a session
          const sessionId = uuidv4();
          stormSessions.set(sessionId, {
            id: sessionId,
            topic,
            swarm_id: result.swarmId,
            article: result.article,
            metrics: result.metrics,
            status: 'completed',
            created_at: new Date().toISOString()
          });
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                session_id: sessionId,
                swarm_id: result.swarmId,
                topic,
                status: 'completed',
                metrics: result.metrics,
                message: 'Swarm-orchestrated article generation completed successfully',
                article_preview: result.article.substring(0, 500) + '...'
              }, null, 2)
            }]
          };
        } catch (error) {
          throw new Error(`Swarm pipeline failed: ${error.message.substring(0, 100)}`);
        }
      }
      
      case 'storm_get_swarm_status': {
        const swarm_id = validateSessionId(args.swarm_id);
        
        const swarm = swarmOrchestrator.swarms.get(swarm_id);
        if (!swarm) {
          throw new Error(`Swarm not found`);
        }
        
        const metrics = await swarmOrchestrator.getSwarmMetrics(swarm);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              swarm_id,
              topic: swarm.topic,
              status: swarm.status,
              topology: swarm.topology,
              agents: Array.from(swarm.agents.values()).map(agent => ({
                id: agent.id,
                name: agent.name,
                llm: agent.llm,
                type: agent.type,
                status: agent.status,
                tasks_completed: agent.tasksCompleted
              })),
              metrics,
              created_at: swarm.created_at
            }, null, 2)
          }]
        };
      }
      
      case 'storm_run_full_pipeline': {
        const topic = validateTopic(args.topic);
        const llm_provider = validateLLMProvider(args.llm_provider || 'claude');
        const search_engine = validateEnum(args.search_engine || 'google', SECURITY_CONFIG.ALLOWED_SEARCH_ENGINES, 'search_engine');
        const output_format = validateEnum(args.output_format || 'markdown', SECURITY_CONFIG.ALLOWED_OUTPUT_FORMATS, 'output_format');
        const research_depth = validateEnum(args.research_depth || 'standard', SECURITY_CONFIG.ALLOWED_SEARCH_DEPTHS, 'research_depth');
        const article_length = validateEnum(args.article_length || 'medium', SECURITY_CONFIG.ALLOWED_ARTICLE_LENGTHS, 'article_length');
        
        // Create session
        const createResult = await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'storm_create_session',
            arguments: { topic, llm_provider, search_engine, output_format }
          }
        });
        
        const sessionData = JSON.parse(createResult.content[0].text);
        const sessionId = sessionData.session_id;
        
        // Run research
        await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'storm_research',
            arguments: { 
              session_id: sessionId,
              search_depth: research_depth
            }
          }
        });
        
        // Generate outline
        await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'storm_generate_outline',
            arguments: { session_id: sessionId }
          }
        });
        
        // Generate article
        await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'storm_generate_article',
            arguments: { 
              session_id: sessionId,
              target_length: article_length
            }
          }
        });
        
        // Polish article
        await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'storm_polish_article',
            arguments: { session_id: sessionId }
          }
        });
        
        // Get final result
        const finalResult = await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'storm_get_session',
            arguments: { 
              session_id: sessionId,
              include_research: false,
              include_outline: false,
              include_article: true
            }
          }
        });
        
        return finalResult;
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(sanitizeError(error, name), null, 2)
      }]
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('STORM MCP Server (Security Enhanced) started successfully');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});