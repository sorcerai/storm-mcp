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

// Store active STORM sessions
const stormSessions = new Map();

// Initialize swarm orchestrator
const swarmOrchestrator = new SwarmOrchestrator();

// Store LLM configurations
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

// Available tools
const TOOLS = {
  'storm_create_session': {
    description: 'Create a new STORM article generation session',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to generate an article about'
        },
        llm_provider: {
          type: 'string',
          enum: ['claude', 'gemini', 'kimi'],
          description: 'Which LLM provider to use',
          default: 'claude'
        },
        search_engine: {
          type: 'string',
          enum: ['google', 'bing', 'duckduckgo', 'you'],
          description: 'Which search engine to use',
          default: 'google'
        },
        output_format: {
          type: 'string',
          enum: ['markdown', 'html', 'plain'],
          description: 'Output format for the article',
          default: 'markdown'
        }
      },
      required: ['topic']
    }
  },
  'storm_research': {
    description: 'Research and collect information about a topic',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID'
        },
        max_perspectives: {
          type: 'number',
          description: 'Maximum number of perspectives to generate',
          default: 5
        },
        max_questions_per_perspective: {
          type: 'number',
          description: 'Maximum questions per perspective',
          default: 10
        },
        search_depth: {
          type: 'string',
          enum: ['shallow', 'standard', 'deep'],
          description: 'How deep to search for information',
          default: 'standard'
        }
      },
      required: ['session_id']
    }
  },
  'storm_generate_outline': {
    description: 'Generate an article outline from researched information',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID'
        },
        max_sections: {
          type: 'number',
          description: 'Maximum number of main sections',
          default: 5
        },
        max_subsections: {
          type: 'number',
          description: 'Maximum subsections per section',
          default: 3
        }
      },
      required: ['session_id']
    }
  },
  'storm_generate_article': {
    description: 'Generate full article content from outline',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID'
        },
        section_id: {
          type: 'string',
          description: 'Generate specific section only (optional)'
        },
        include_citations: {
          type: 'boolean',
          description: 'Include source citations',
          default: true
        },
        target_length: {
          type: 'string',
          enum: ['short', 'medium', 'long', 'comprehensive'],
          description: 'Target article length',
          default: 'medium'
        }
      },
      required: ['session_id']
    }
  },
  'storm_polish_article': {
    description: 'Polish and improve the generated article',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID'
        },
        polish_options: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['grammar', 'clarity', 'flow', 'citations', 'formatting', 'seo']
          },
          description: 'Aspects to polish',
          default: ['grammar', 'clarity', 'flow']
        }
      },
      required: ['session_id']
    }
  },
  'storm_get_session': {
    description: 'Get current status and data from a STORM session',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID'
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
      required: ['session_id']
    }
  },
  'storm_export': {
    description: 'Export the generated article in various formats',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID'
        },
        format: {
          type: 'string',
          enum: ['markdown', 'html', 'pdf', 'docx', 'plain'],
          description: 'Export format',
          default: 'markdown'
        },
        include_metadata: {
          type: 'boolean',
          description: 'Include metadata like sources and timestamps',
          default: true
        }
      },
      required: ['session_id']
    }
  },
  'storm_list_sessions': {
    description: 'List all active STORM sessions',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  'storm_delete_session': {
    description: 'Delete a STORM session and its data',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'STORM session ID to delete'
        }
      },
      required: ['session_id']
    }
  },
  'storm_run_full_pipeline': {
    description: 'Run the complete STORM pipeline end-to-end',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to generate an article about'
        },
        llm_provider: {
          type: 'string',
          enum: ['claude', 'gemini', 'kimi'],
          description: 'Which LLM provider to use',
          default: 'claude'
        },
        search_engine: {
          type: 'string',
          enum: ['google', 'bing', 'duckduckgo', 'you'],
          description: 'Which search engine to use',
          default: 'google'
        },
        output_format: {
          type: 'string',
          enum: ['markdown', 'html', 'plain'],
          description: 'Output format for the article',
          default: 'markdown'
        },
        research_depth: {
          type: 'string',
          enum: ['shallow', 'standard', 'deep'],
          description: 'Research thoroughness',
          default: 'standard'
        },
        article_length: {
          type: 'string',
          enum: ['short', 'medium', 'long', 'comprehensive'],
          description: 'Target article length',
          default: 'medium'
        }
      },
      required: ['topic']
    }
  },
  'storm_create_swarm': {
    description: 'Create a swarm-orchestrated STORM session using multiple LLMs',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to generate an article about'
        },
        swarm_type: {
          type: 'string',
          enum: ['claude-flow', 'ruv-swarm'],
          description: 'Which swarm orchestrator to use',
          default: 'claude-flow'
        },
        topology: {
          type: 'string',
          enum: ['hierarchical', 'mesh', 'ring', 'star'],
          description: 'Swarm topology',
          default: 'hierarchical'
        },
        max_agents: {
          type: 'number',
          description: 'Maximum number of agents in swarm',
          default: 8
        },
        output_format: {
          type: 'string',
          enum: ['markdown', 'html', 'plain'],
          description: 'Output format for the article',
          default: 'markdown'
        }
      },
      required: ['topic']
    }
  },
  'storm_run_swarm_pipeline': {
    description: 'Run STORM with swarm orchestration - multiple LLMs working together',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to generate an article about'
        },
        swarm_type: {
          type: 'string',
          enum: ['claude-flow', 'ruv-swarm'],
          description: 'Which swarm orchestrator to use',
          default: 'claude-flow'
        },
        research_depth: {
          type: 'string',
          enum: ['shallow', 'standard', 'deep'],
          description: 'Research thoroughness',
          default: 'deep'
        },
        article_length: {
          type: 'string',
          enum: ['short', 'medium', 'long', 'comprehensive'],
          description: 'Target article length',
          default: 'comprehensive'
        },
        parallelization: {
          type: 'boolean',
          description: 'Enable parallel processing',
          default: true
        }
      },
      required: ['topic']
    }
  },
  'storm_get_swarm_status': {
    description: 'Get status of a swarm-orchestrated STORM session',
    inputSchema: {
      type: 'object',
      properties: {
        swarm_id: {
          type: 'string',
          description: 'Swarm ID to check status'
        }
      },
      required: ['swarm_id']
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

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'storm_create_session': {
        const sessionId = uuidv4();
        const { topic, llm_provider = 'claude', search_engine = 'google', output_format = 'markdown' } = args;
        
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
        const { session_id, max_perspectives = 5, max_questions_per_perspective = 10, search_depth = 'standard' } = args;
        const session = stormSessions.get(session_id);
        
        if (!session) {
          throw new Error(`Session ${session_id} not found`);
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
        const { session_id, max_sections = 5, max_subsections = 3 } = args;
        const session = stormSessions.get(session_id);
        
        if (!session) {
          throw new Error(`Session ${session_id} not found`);
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
        const { session_id, section_id, include_citations = true, target_length = 'medium' } = args;
        const session = stormSessions.get(session_id);
        
        if (!session) {
          throw new Error(`Session ${session_id} not found`);
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
        const { session_id, polish_options = ['grammar', 'clarity', 'flow'] } = args;
        const session = stormSessions.get(session_id);
        
        if (!session) {
          throw new Error(`Session ${session_id} not found`);
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
        const { session_id, include_research = false, include_outline = true, include_article = true } = args;
        const session = stormSessions.get(session_id);
        
        if (!session) {
          throw new Error(`Session ${session_id} not found`);
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
        const { session_id, format = 'markdown', include_metadata = true } = args;
        const session = stormSessions.get(session_id);
        
        if (!session) {
          throw new Error(`Session ${session_id} not found`);
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
        const { session_id } = args;
        
        if (!stormSessions.has(session_id)) {
          throw new Error(`Session ${session_id} not found`);
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
        const { topic, swarm_type = 'claude-flow', topology = 'hierarchical', max_agents = 8, output_format = 'markdown' } = args;
        
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
          throw new Error(`Failed to create swarm: ${error.message}`);
        }
      }
      
      case 'storm_run_swarm_pipeline': {
        const { 
          topic, 
          swarm_type = 'claude-flow',
          research_depth = 'deep',
          article_length = 'comprehensive',
          parallelization = true
        } = args;
        
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
          throw new Error(`Swarm pipeline failed: ${error.message}`);
        }
      }
      
      case 'storm_get_swarm_status': {
        const { swarm_id } = args;
        
        const swarm = swarmOrchestrator.swarms.get(swarm_id);
        if (!swarm) {
          throw new Error(`Swarm ${swarm_id} not found`);
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
        const { 
          topic, 
          llm_provider = 'claude', 
          search_engine = 'google', 
          output_format = 'markdown',
          research_depth = 'standard',
          article_length = 'medium'
        } = args;
        
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
        text: JSON.stringify({
          error: error.message,
          tool: name,
          arguments: args
        }, null, 2)
      }]
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('STORM MCP Server started successfully');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});