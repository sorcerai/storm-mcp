# STORM MCP Quick Start Examples

## 1. Generate an Article About Quantum Computing

```javascript
// Using Gemini CLI (with auth)
storm_run_full_pipeline({
  topic: "Quantum Computing: From Theory to Practice",
  llm_provider: "gemini",
  research_depth: "deep",
  article_length: "comprehensive"
})
```

## 2. Research Climate Change Solutions

```javascript
// Step 1: Create session with Claude
const session = storm_create_session({
  topic: "Innovative Climate Change Solutions for 2025",
  llm_provider: "claude"
})

// Step 2: Deep research with multiple perspectives
storm_research({
  session_id: session.session_id,
  max_perspectives: 7,
  search_depth: "deep"
})

// Step 3: Generate and review outline
storm_generate_outline({
  session_id: session.session_id
})

// Step 4: Generate article
storm_generate_article({
  session_id: session.session_id,
  target_length: "long"
})

// Step 5: Polish with all options
storm_polish_article({
  session_id: session.session_id,
  polish_options: ["grammar", "clarity", "flow", "citations", "seo"]
})

// Step 6: Export final article
storm_export({
  session_id: session.session_id,
  format: "markdown"
})
```

## 3. Quick Business Analysis with Kimi K2

```javascript
// Kimi K2 excels at deep analysis
storm_run_full_pipeline({
  topic: "AI Impact on Traditional Retail Business Models",
  llm_provider: "kimi",
  research_depth: "standard",
  article_length: "medium"
})
```

## 4. Technical Documentation Generation

```javascript
// Create technical documentation
const tech_session = storm_create_session({
  topic: "Building Scalable Microservices with Kubernetes",
  llm_provider: "gemini",
  output_format: "markdown"
})

// Research with technical perspectives
storm_research({
  session_id: tech_session.session_id,
  max_perspectives: 5,
  max_questions_per_perspective: 15,
  search_depth: "deep"
})

// Generate technical outline
storm_generate_outline({
  session_id: tech_session.session_id,
  max_sections: 7,
  max_subsections: 4
})

// Generate comprehensive technical article
storm_generate_article({
  session_id: tech_session.session_id,
  target_length: "comprehensive",
  include_citations: true
})
```

## 5. Educational Content Creation

```javascript
// Create educational content about space exploration
storm_run_full_pipeline({
  topic: "The James Webb Space Telescope: Discoveries and Impact",
  llm_provider: "claude",
  research_depth: "standard",
  article_length: "medium"
})
```

## 6. Generate Specific Section Only

```javascript
// First create and research a topic
const session = storm_create_session({
  topic: "Cryptocurrency and Blockchain Technology",
  llm_provider: "gemini"
})

storm_research({
  session_id: session.session_id
})

storm_generate_outline({
  session_id: session.session_id
})

// Generate only section 2 (e.g., "Technical Fundamentals")
storm_generate_article({
  session_id: session.session_id,
  section_id: "2",
  target_length: "long"
})
```

## 7. Multi-Language Content (with Kimi K2)

```javascript
// Kimi K2 handles multilingual content well
storm_create_session({
  topic: "中国传统医学与现代科学的结合 (Integration of Traditional Chinese Medicine and Modern Science)",
  llm_provider: "kimi"
})
```

## Tips for Best Results

1. **Choose the right LLM**:
   - Claude: Best for nuanced, complex topics
   - Gemini: Great for technical and factual content
   - Kimi K2: Excellent for deep analysis and multilingual

2. **Adjust research depth**:
   - `shallow`: Quick overview articles
   - `standard`: Balanced depth and speed
   - `deep`: Comprehensive, well-researched pieces

3. **Target length guidelines**:
   - `short`: Blog posts, quick reads
   - `medium`: Standard articles
   - `long`: In-depth analysis
   - `comprehensive`: Complete guides

4. **Polish options**:
   - Always use `["grammar", "clarity", "flow"]` as baseline
   - Add `"citations"` for academic content
   - Add `"seo"` for web content

5. **Session management**:
   - Use `storm_list_sessions()` to track active work
   - Save session IDs for resuming work
   - Delete completed sessions to free memory