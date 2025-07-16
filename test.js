#!/usr/bin/env node

// Test script for STORM MCP Server
// Tests basic functionality with different LLM providers

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMCPServer() {
  console.log('🧪 Testing STORM MCP Server...\n');

  // Test commands
  const testCommands = [
    {
      name: 'List Tools',
      request: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      }
    },
    {
      name: 'Create Session with Claude',
      request: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'storm_create_session',
          arguments: {
            topic: 'Test Topic: Benefits of Green Tea',
            llm_provider: 'claude'
          }
        }
      }
    },
    {
      name: 'Test Gemini CLI',
      request: {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'storm_create_session',
          arguments: {
            topic: 'Test Topic: Future of Electric Vehicles',
            llm_provider: 'gemini'
          }
        }
      }
    },
    {
      name: 'Test Kimi K2',
      request: {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'storm_create_session',
          arguments: {
            topic: 'Test Topic: Artificial Intelligence Ethics',
            llm_provider: 'kimi'
          }
        }
      }
    },
    {
      name: 'List Sessions',
      request: {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'storm_list_sessions',
          arguments: {}
        }
      }
    }
  ];

  // Start the server
  const serverPath = join(__dirname, 'server.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverReady = false;
  let responseBuffer = '';

  // Handle server output
  server.stdout.on('data', (data) => {
    const output = data.toString();
    responseBuffer += output;
    
    // Try to parse complete JSON responses
    const lines = responseBuffer.split('\n');
    responseBuffer = lines[lines.length - 1]; // Keep incomplete line
    
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          const response = JSON.parse(line);
          console.log('📥 Response:', JSON.stringify(response, null, 2));
          console.log('---\n');
        } catch (e) {
          // Not JSON, ignore
        }
      }
    }
  });

  server.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message.includes('started successfully')) {
      serverReady = true;
      console.log('✅ Server started successfully\n');
    } else if (message) {
      console.log('📝 Server log:', message);
    }
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
  });

  // Wait for server to be ready
  await new Promise(resolve => {
    const checkReady = setInterval(() => {
      if (serverReady) {
        clearInterval(checkReady);
        resolve();
      }
    }, 100);
  });

  // Run tests
  for (const test of testCommands) {
    console.log(`\n🔧 Testing: ${test.name}`);
    console.log('📤 Request:', JSON.stringify(test.request, null, 2));
    
    // Send request to server
    server.stdin.write(JSON.stringify(test.request) + '\n');
    
    // Wait a bit for response
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Cleanup
  console.log('\n🏁 Tests completed. Shutting down server...');
  server.kill();
}

// Run tests
testMCPServer().catch(console.error);