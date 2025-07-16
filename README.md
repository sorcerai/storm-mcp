# STORM MCP Server

> **Based on Stanford STORM Research** - A Multi-LLM MCP implementation inspired by Stanford's groundbreaking STORM system.

## 🎓 Attribution & Credits

This project is **based on and inspired by** the original Stanford STORM research:

- **Original Paper**: "Assisting in Writing Wikipedia-like Articles From Scratch with Large Language Models" 
- **Original Repository**: https://github.com/stanford-oval/storm
- **Authors**: Yijia Shao, Yucheng Jiang, Theodore A. Kanell, Peter Xu, Omar Khattab, Monica S. Lam
- **Institution**: Stanford University

### Key Extensions to Original STORM:
- **Multi-LLM Architecture**: Integrates Claude Sonnet 4, Gemini 2.5 Pro, and Kimi K2 (vs. single LLM)
- **MCP Integration**: Native Model Context Protocol support for Claude Code
- **Dynamic Model Selection**: AI-powered evaluation determines optimal model for each task
- **Swarm Orchestration**: Compatible with claude-flow and ruv-swarm patterns
- **Quality-First Design**: Empirically tested model performance and routing

An MCP (Model Context Protocol) server implementation that extends Stanford's STORM (Synthesis of Topic Outline through Retrieval and Multi-perspective question asking) system with multi-LLM swarm orchestration for AI-powered knowledge curation and article generation.

## Features

- 🤖 **Multi-LLM Support**: Works with Claude (via Claude Code), Google Gemini, and Kimi K2
- 🐝 **Swarm Orchestration**: Multiple LLMs work together, each handling what they do best
- 📚 **Knowledge Curation**: Automated research from multiple perspectives
- 📝 **Article Generation**: Creates Wikipedia-style articles from scratch
- 🔍 **Multi-Source Research**: Integrates with various search engines
- ✨ **Article Polishing**: Grammar, clarity, flow, and SEO optimization
- 🎯 **Flexible Pipeline**: Run full pipeline, individual stages, or swarm mode
- ⚡ **Parallel Processing**: Swarm agents work simultaneously for faster results

## Prerequisites

### Required MCP Tools
This server requires the following MCP tools to be available in your Claude Code environment:

1. **Google Gemini CLI MCP** - For Gemini 2.5 Pro integration
   - Install: Follow [Google Gemini CLI MCP setup](https://github.com/google/generative-ai-mcp)
   - Tools used: `mcp__google-gemini-cli__gemini`

2. **Claude Flow MCP** (Optional) - For advanced swarm orchestration
   - Install: `npm install -g claude-flow@alpha`
   - Tools used: `mcp__claude-flow__swarm_init`, `mcp__claude-flow__agent_spawn`

3. **Kimi K2 API Access** - For premium technical analysis
   - Get API key from [Moonshot AI](https://platform.moonshot.cn)
   - Model: `kimi-k2-0711-preview`

### System Requirements
- **Node.js**: 18.0.0 or higher
- **Claude Code**: Latest version with MCP support
- **Operating System**: macOS, Linux, or Windows

## Installation

### 1. Clone and Setup
```bash
git clone https://github.com/sorcerai/storm-mcp.git
cd storm-mcp
npm install
```

### 2. Configure API Keys
```bash
cp .env.example .env
# Edit .env and add your Kimi API key:
# KIMI_API_KEY=your_kimi_api_key_here
```

### 3. Authentication Setup

#### Google Gemini (Free with Google Subscription)
```bash
# Install and authenticate Gemini CLI
npm install -g @google-ai/generative-ai-cli
gemini auth
```

#### Kimi K2 (Paid API)
- Sign up at [Moonshot AI Platform](https://platform.moonshot.cn)
- Create API key
- Add to `.env` file as `KIMI_API_KEY=your_key_here`

#### Claude (Free via Claude Code)
- No setup required - works natively through Claude Code

### 4. Add to Claude Code
Add this server to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "storm-mcp": {
      "command": "node",
      "args": ["/path/to/storm-mcp/server.js"]
    }
  }
}
```

**Configuration file locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 5. Test Installation
```bash
# Test the MCP server
node server.js

# Should show: "STORM MCP Server running on stdio"
```

### 6. Restart Claude Code
After adding the MCP server configuration, restart Claude Code to load the new server.

## Usage

### Basic Usage
```javascript
// Generate an article using swarm mode
storm_run_swarm_pipeline({
  topic: "The Future of Quantum Computing",
  swarm_type: "claude-flow",
  research_depth: "deep",
  article_length: "comprehensive"
})
```

### Advanced Usage
```javascript
// Create a custom swarm configuration
storm_create_swarm("Artificial Intelligence in Healthcare", {
  swarmType: "claude-flow",
  topology: "hierarchical",
  maxAgents: 10,
  strategy: "specialized"
})
```

## Agent Configuration

### Quality-Optimized Distribution (Default)
- **Claude Sonnet 4**: 5 agents (50%) - Best general performance, FREE
- **Gemini 2.5 Pro**: 3 agents (30%) - Massive context, thinking mode, FREE with subscription
- **Kimi K2**: 2 agents (20%) - Premium technical analysis, PAID

### Agent Roles
- **Researcher**: Fact-finding and perspective generation
- **Architect**: System design and structure planning
- **Specialist**: Domain-specific expertise
- **Coordinator**: Task orchestration and management
- **Reviewer**: Quality control and validation
- **Optimizer**: Performance and efficiency improvements

## Configuration Options

### Research Depth
- **`quick`**: Fast research, 3 sources per perspective
- **`standard`**: Balanced approach, 5 sources per perspective  
- **`deep`**: Comprehensive research, 10 sources per perspective

### Article Length
- **`short`**: ~1,500 words
- **`medium`**: ~3,000 words
- **`long`**: ~5,000 words
- **`comprehensive`**: 7,000+ words

### Swarm Types
- **`claude-flow`**: Advanced orchestration with memory and coordination
- **`ruv-swarm`**: Alternative swarm implementation
- **`basic`**: Simple multi-agent coordination

## Troubleshooting

### MCP Server Not Loading
1. **Check Claude Code configuration**:
   ```bash
   # Verify config file exists
   ls ~/Library/Application\ Support/Claude/claude_desktop_config.json
   
   # Check for syntax errors
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python -m json.tool
   ```

2. **Verify server path is correct**:
   ```json
   {
     "mcpServers": {
       "storm-mcp": {
         "command": "node",
         "args": ["/absolute/path/to/storm-mcp/server.js"]
       }
     }
   }
   ```

3. **Test server manually**:
   ```bash
   cd /path/to/storm-mcp
   node server.js
   ```

### API Authentication Issues

#### Gemini CLI Issues
```bash
# Check authentication status
gemini auth status

# Re-authenticate if needed
gemini auth login
```

#### Kimi API Issues
- Verify API key is valid
- Check remaining credits at [Moonshot AI Platform](https://platform.moonshot.cn)
- Ensure `.env` file is properly formatted

#### Claude Code Issues
- Update Claude Code to latest version
- Check MCP protocol compatibility
- Verify no conflicting MCP servers

### Performance Issues
1. **Reduce concurrent agents**: Lower `maxAgents` in swarm configuration
2. **Use lighter research depth**: Switch from `deep` to `standard` or `quick`
3. **Check API rate limits**: Especially for Kimi K2 API
4. **Monitor system resources**: Ensure adequate memory and CPU

### Quality Issues
1. **Increase research depth**: Use `deep` instead of `standard`
2. **Enable premium analysis**: Ensure Kimi K2 API is configured
3. **Use hierarchical topology**: Better for complex topics
4. **Increase agent count**: More agents = more perspectives

## Cost Optimization

### Free Tier Strategy
- **Claude**: Free via Claude Code (unlimited)
- **Gemini**: Free with Google subscription
- **Kimi**: Use only for premium technical content

### Paid Usage Guidelines
- **Light usage**: Standard depth, 5-7 agents
- **Medium usage**: Deep research, 8-10 agents
- **Heavy usage**: Comprehensive articles, 10+ agents

### Cost Monitoring
```javascript
// Monitor API usage
storm_get_usage_stats()

// Optimize for cost
storm_optimize_for_cost({
  max_kimi_calls: 5,
  prefer_free_models: true
})
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/sorcerai/storm-mcp/issues)
- **Documentation**: [Wiki](https://github.com/sorcerai/storm-mcp/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/sorcerai/storm-mcp/discussions)

## Acknowledgments

- Stanford OVAL team for the original STORM research
- Anthropic for the MCP protocol and Claude Code
- Google for Gemini API access
- Moonshot AI for Kimi K2 API access

---

**Built with ❤️ for AI-powered knowledge synthesis**

## Usage

### Quick Start - Swarm Mode (Recommended!)

Generate articles using multiple LLMs working together:

```javascript
// Let multiple LLMs collaborate on your article
storm_run_swarm_pipeline({
  topic: "The Future of Quantum Computing",
  swarm_type: "claude-flow",  // or "ruv-swarm"
  research_depth: "deep",
  article_length: "comprehensive"
})
```

**How it works:**
- 🔍 **Gemini** handles factual research and technical sections
- 🧠 **Kimi K2** generates diverse perspectives and creates outlines
- ✍️ **Claude** writes introductions, conclusions, and polishes the final article
- 🐝 All agents work in parallel for maximum efficiency!

### Traditional Mode - Single LLM

Generate a complete article with one LLM:

```javascript
storm_run_full_pipeline({
  topic: "The Future of Quantum Computing",
  llm_provider: "gemini",  // or "claude", "kimi"
  research_depth: "deep",
  article_length: "comprehensive"
})
```

### Step-by-Step Usage

1. **Create a session**:
```javascript
storm_create_session({
  topic: "Artificial Intelligence in Healthcare",
  llm_provider: "claude",
  search_engine: "google"
})
```

2. **Research the topic**:
```javascript
storm_research({
  session_id: "your-session-id",
  max_perspectives: 5,
  search_depth: "deep"
})
```

3. **Generate outline**:
```javascript
storm_generate_outline({
  session_id: "your-session-id",
  max_sections: 5,
  max_subsections: 3
})
```

4. **Generate article**:
```javascript
storm_generate_article({
  session_id: "your-session-id",
  target_length: "comprehensive",
  include_citations: true
})
```

5. **Polish the article**:
```javascript
storm_polish_article({
  session_id: "your-session-id",
  polish_options: ["grammar", "clarity", "flow", "seo"]
})
```

6. **Export the result**:
```javascript
storm_export({
  session_id: "your-session-id",
  format: "markdown",
  include_metadata: true
})
```

## Available Tools

### Swarm Tools (New!)
- `storm_create_swarm` - Initialize a multi-LLM swarm for collaborative generation
- `storm_run_swarm_pipeline` - Run complete pipeline with swarm orchestration
- `storm_get_swarm_status` - Monitor swarm agents and their progress

### Core Tools (Single LLM)
- `storm_create_session` - Initialize a new article generation session
- `storm_run_full_pipeline` - Execute complete pipeline in one command
- `storm_research` - Research and gather information
- `storm_generate_outline` - Create article structure
- `storm_generate_article` - Write the full article
- `storm_polish_article` - Improve and refine content

### Management Tools
- `storm_get_session` - Retrieve session data and progress
- `storm_list_sessions` - View all active sessions
- `storm_delete_session` - Remove a session
- `storm_export` - Export article in various formats

## Configuration Options

### LLM Providers

**Claude (via Claude Code)**
- Models: claude-3-opus, claude-3-sonnet, claude-3-haiku
- Best for: Complex reasoning, nuanced writing
- Native integration through Claude Code

**Google Gemini**
- Models: gemini-1.5-pro, gemini-1.5-flash
- Best for: Long context, multimodal understanding
- Authentication: Uses CLI auth (run `npx google-gemini-cli@latest auth`)

**Kimi K2**
- Model: kimi-k2-0711-preview
- Best for: Deep analysis, Chinese content
- Requires: KIMI_API_KEY

### Research Depth

- `shallow` - Quick research, 3 sources per perspective
- `standard` - Balanced approach, 5 sources per perspective
- `deep` - Comprehensive research, 10 sources per perspective

### Article Length

- `short` - ~1,500 words
- `medium` - ~3,000 words
- `long` - ~5,000 words
- `comprehensive` - 7,000+ words

### Polish Options

- `grammar` - Fix grammatical errors
- `clarity` - Improve readability
- `flow` - Enhance transitions and structure
- `citations` - Format and verify citations
- `formatting` - Standardize formatting
- `seo` - Optimize for search engines

## Examples

### Technology Article
```javascript
// Generate an article about blockchain technology
storm_run_full_pipeline({
  topic: "Blockchain Technology and Its Real-World Applications",
  llm_provider: "gemini",
  research_depth: "deep",
  article_length: "comprehensive"
})
```

### Scientific Topic
```javascript
// Research climate change with multiple perspectives
const session = await storm_create_session({
  topic: "Climate Change Mitigation Strategies",
  llm_provider: "claude"
});

await storm_research({
  session_id: session.session_id,
  max_perspectives: 7,  // Get diverse viewpoints
  search_depth: "deep"
});
```

### Business Analysis
```javascript
// Quick business article with Kimi K2
storm_run_full_pipeline({
  topic: "Digital Transformation in Traditional Retail",
  llm_provider: "kimi",
  research_depth: "standard",
  article_length: "medium"
})
```

## How Swarm Mode Works

The swarm orchestrator assigns tasks based on each LLM's strengths:

### Task Distribution

**Research Phase:**
- 🔍 **Gemini agents** → Fact-finding, data collection, verification
- 🧠 **Kimi agents** → Perspective generation, deep analysis, pattern recognition

**Outline Phase:**
- 🧠 **Kimi agent** → Creates initial structure (excellent at patterns)
- ✍️ **Claude agent** → Reviews and refines outline

**Writing Phase:**
- 📊 **Gemini** → Technical sections, data-heavy content
- ✍️ **Claude** → Introductions, conclusions, creative sections
- 🧠 **Kimi** → Analytical sections, comparisons

**Polish Phase:**
- ✍️ **Claude** → Flow, consistency, style
- 🔍 **Gemini** → Fact-checking, accuracy verification

### Swarm Topologies

- **Hierarchical** (default): Coordinator agent manages others
- **Mesh**: All agents communicate freely
- **Ring**: Sequential processing with handoffs
- **Star**: Central hub coordinates all agents

## Architecture

The STORM MCP server follows a modular architecture:

```
storm-mcp/
├── server.js           # Main MCP server
├── llm_adapters/       # LLM integrations
│   ├── claude_mcp.js   # Claude adapter
│   ├── gemini_mcp.js   # Gemini adapter
│   └── kimi_mcp.js     # Kimi K2 adapter
├── swarm/              # Swarm orchestration
│   ├── orchestrator.js # Swarm coordinator
│   └── llm_dispatcher.js # Task routing
├── tools/              # Core functionality
│   ├── research.js     # Knowledge curation
│   ├── outline.js      # Outline generation
│   ├── generate.js     # Article writing
│   └── polish.js       # Content improvement
└── examples/           # Usage examples
```

## Customization

### Adding New LLM Providers

1. Create adapter in `llm_adapters/`:
```javascript
export class YourLLMAdapter {
  async generateText(prompt, options) {
    // Your implementation
  }
}
```

2. Register in `server.js`:
```javascript
const llmConfigs = {
  your_llm: {
    adapter: YourLLMAdapter,
    models: { /* model config */ }
  }
};
```

### Custom Search Integration

Modify `tools/research.js` to add new search engines:
```javascript
async performSearch(query, topic, searchDepth) {
  // Add your search API integration
}
```

## Troubleshooting

### API Key Issues
- Ensure all required API keys are in `.env`
- Check API key permissions and quotas
- Verify network connectivity

### Generation Quality
- Use appropriate LLM for your use case
- Adjust research depth for better sources
- Try different perspectives count
- Enable all polish options for best quality

### Performance
- Reduce `max_perspectives` for faster research
- Use `shallow` search depth for quick results
- Choose smaller target lengths
- Use Gemini Flash for faster processing

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Stanford OVAL team for the original STORM research
- Anthropic for the MCP protocol
- Google, Moonshot AI for LLM access

---

Built with ❤️ for AI-powered knowledge synthesis