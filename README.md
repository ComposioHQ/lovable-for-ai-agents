# Lovable AI Agents

A platform to build custom AI agents with visual frontend builders and powerful backend integration. Generate both frontend interfaces and AI agent backends from simple text descriptions.

## Features

🎨 **Dynamic Frontend Generation** - Automatically generate beautiful agent interfaces  
🤖 **AI Agent Generation** - Automatically generate backend code using Vercel AI SDK  
🛠️ **Tool Integration** - Built-in Composio integration for agent capabilities  
⚡ **Live Preview** - Test your agents in real-time  
📱 **Responsive Design** - Mobile and desktop optimized interfaces  
💻 **Code Export** - Download generated frontend and backend code  

## Quick Start

1. **Clone and Install**
   ```bash
   git clone ComposioHQ/lovable-for-ai-agents
   cd lovable-for-ai-agents
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your API keys (server-side only; do not expose secrets to the browser)
   OPENAI_API_KEY=your_openai_key_here
   COMPOSIO_API_KEY=your_composio_key_here
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   Navigate to `http://localhost:3000`

## How It Works

### 1. Describe Your Agent
Write a description of the AI agent you want to build:
- "Create a customer support agent that handles refunds and tracks orders"
- "Build a data analysis agent that processes CSV files and generates reports"
- "Make a social media agent that schedules posts and analyzes engagement"

### 2. Generate Code
The platform uses AI to generate:
- **Frontend**: Complete HTML interface with required input fields
- **Backend**: Next.js API route with Vercel AI SDK and Composio integration

### 3. Customize Interface
The system automatically generates:
- Modify the generated frontend
- Add custom styling and components
- Adjust layout and responsiveness

### 4. Test Your Agent
- Enter your API keys (LLM + Composio)
- Input prompts to test agent functionality
- View real-time responses

## Architecture

```
┌─ Frontend (Next.js + React + TailwindCSS)
│  ├─ Dynamic Frontend Generation
│  ├─ Code Preview (Monaco Editor)
│  └─ Agent Testing Interface
│
├─ Backend (Next.js API Routes)
│  ├─ /api/generate-agent (AI Code Generation)
│  ├─ /api/run-agent (Agent Execution)
│  └─ /api/route (Base Agent Endpoint)
│
└─ Integrations
   ├─ Vercel AI SDK (LLM Integration)
   ├─ Composio (Tool Integration)
   └─ OpenAI (Code Generation)
```

## API Endpoints

### POST `/api/generate-agent`
Generates frontend and backend code for AI agents.
```json
{
  "agentIdea": "Your agent description"
}
```

### POST `/api/run-agent`
Executes a generated AI agent with streaming response.
```json
{
  "prompt": "User prompt",
  "agentCode": "Generated backend code"
}
```

## Generated Agent Structure

Each generated agent includes:

**Frontend Features:**
- No API key fields in the browser
- Prompt textarea
- Run Agent button
- Response display area
- Modern, responsive design

**Backend Features:**
- Vercel AI SDK integration
- Composio tool access
- Streaming responses
- Error handling
- TypeScript support

## Customization

### Adding New Tools
Modify the tools array in `/api/run-agent/route.ts`:
```typescript
const tools = await composio.tools.get('default', {
  tools: [
    'mcp-shell',
    'web_search', 
    'your_custom_tool'
  ]
});
```

### Styling the Interface
The visual builder supports:
- Custom CSS classes
- Responsive breakpoints
- Component libraries
- Theme customization

## Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Environment Variables for Production
```
OPENAI_API_KEY=your_production_openai_key
COMPOSIO_API_KEY=your_production_composio_key
APP_URL=https://your-domain.com
```

## Examples

### Customer Support Agent
```
Create a customer support agent that can:
- Handle refund requests using Stripe API
- Track order status via Shopify
- Answer FAQ questions from knowledge base
- Escalate complex issues to human agents
```

### Data Analysis Agent  
```
Build a data analyst agent that:
- Processes CSV and Excel files
- Generates charts and visualizations
- Performs statistical analysis
- Creates summary reports
```

### Content Creation Agent
```
Make a content creator agent that:
- Generates blog posts and articles
- Creates social media content
- Optimizes for SEO
- Schedules posts across platforms
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Next.js API Routes, TypeScript
- **AI**: Vercel AI SDK, OpenAI GPT-4
- **Tools**: Composio Integration Platform
- **Editor**: Dynamic Frontend Generation
- **Icons**: Lucide React

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request


## References
- [Composio Website](https://composio.dev/)
- [Composio Docs](https://docs.composio.dev/docs/welcome)
- [Composio SDK](https://github.com/composiohq/composio)

## License

MIT License - see LICENSE file for details

---

**Built with ❤️ for the AI Agent ecosystem**
