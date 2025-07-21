# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Vue 3 frontend application for an AI-powered document helper that connects to the `doc_ai_helper_backend` API. The application provides document viewing and LLM-based chat functionality for markdown documents.

Key technologies:
- Vue 3 with TypeScript and Composition API
- Vite for build tooling
- Pinia for state management
- PrimeVue for UI components
- Axios for API communication
- Marked.js for markdown rendering
- Highlight.js for syntax highlighting

## Build and Development Commands

```bash
# Development server
npm run dev

# Production build (runs type-check and build-only in parallel)
npm run build

# Type checking only
npm run type-check

# Build without type checking
npm run build-only

# Preview production build
npm run preview

# Unit tests (Vitest with jsdom)
npm run test:unit

# Code formatting
npm run format
```

## Project Architecture

### Core Structure
- **Main Application**: Entry point in `src/main.ts` with PrimeVue setup
- **Stores**: Pinia stores in `src/stores/` for state management
- **Services**: API layer in `src/services/` with modular structure
- **Components**: Vue components organized by feature in `src/components/`
- **Utils**: Configuration and utility functions in `src/utils/`

### Key Architectural Patterns

**State Management (Pinia Stores):**
- `chat.store.ts`: Chat messages, LLM interactions, MCP tool management
- `document.store.ts`: Current document content and metadata
- `repository.store.ts`: Repository structure and navigation

**API Service Layer:**
- `src/services/api/modules/`: Modular service architecture
- Type-safe API with auto-generated types from OpenAPI spec (`types.auto.ts`)
- Streaming support for LLM responses with SSE
- MCP (Model Context Protocol) tools integration

**Component Architecture:**
- Document viewer with markdown rendering and syntax highlighting
- Chat interface with streaming responses and tool execution
- Repository navigator (currently disabled, using placeholder)
- Responsive layout with PrimeVue Splitter components

### Important Implementation Details

**LLM Integration:**
- Multiple message sending modes: direct query, streaming, with/without MCP tools
- Conversation history optimization from backend
- Document context integration with system prompts
- Template-based prompt formatting

**MCP Tools System:**
- Tool execution tracking and progress monitoring
- Streaming tool calls with real-time updates
- Configurable tool choices: 'auto', 'none', 'required', or specific tools
- Tool execution history and error handling

**Configuration System:**
Environment variables (prefix: `VITE_`):
- `VITE_API_BASE_URL`: Backend API base URL
- `VITE_BACKEND_URL`: Backend URL for link transformations
- `VITE_USE_MOCK_API`: Enable/disable mock API mode
- `VITE_DEFAULT_SERVICE`: Git service (github, gitlab, mock)
- `VITE_DEFAULT_OWNER`: Repository owner
- `VITE_DEFAULT_REPO`: Repository name
- `VITE_DEFAULT_REF`: Default branch/ref
- `VITE_DEFAULT_PATH`: Default document path

## Code Conventions from .github/copilot-instructions.md

**Vue 3 Best Practices:**
- Use Composition API consistently
- Implement single responsibility principle for components
- Maintain proper TypeScript type definitions

**Component Design:**
- Create reusable components with slots for flexibility
- Use scoped CSS for styling
- Follow responsive design principles

**State Management:**
- Use Pinia with composition stores
- Separate stores by feature domain
- Maintain reactive state patterns

**Development Priorities:**
1. Document viewer and chat interface (completed)
2. Conversation history management (completed)  
3. Repository navigation (future phase)
4. Search functionality (future extension)

## Key Files and Their Purposes

**Core Application:**
- `src/main.ts`: App initialization and PrimeVue setup
- `src/App.vue`: Root component with layout
- `src/router/index.ts`: Vue Router configuration

**Services (`src/services/api/`):**
- `modules/`: Modular API services (LLM, document, streaming, tools)
- `types.ts` & `types.auto.ts`: TypeScript definitions
- `api.service.ts`: Main API service coordinator

**Stores (`src/stores/`):**
- `chat.store.ts`: Chat state, LLM queries, MCP tools (967 lines - complex)
- `document.store.ts`: Document content and metadata
- `repository.store.ts`: Repository structure

**Components (`src/components/`):**
- `chat/ChatInterface.vue`: Main chat UI
- `document/DocumentViewer.vue`: Markdown document display
- `repository/RepositoryNavigator.vue`: File tree (currently disabled)

**Configuration (`src/utils/`):**
- `config.util.ts`: Environment-based configuration
- `mcp-config.util.ts` & `mcp-tools.util.ts`: MCP tools configuration

## Testing

- Framework: Vitest with jsdom environment
- Test files: `**/__tests__/**/*.spec.ts`
- Existing tests: API services and chat store
- Run tests: `npm run test:unit`

## Important Notes

**Current State:**
- Document viewing and basic chat functionality are complete
- MCP (Model Context Protocol) tools integration is implemented
- Repository navigator is temporarily disabled (using placeholder)
- Left panel will be converted to Table of Contents in future

**API Integration:**
- Supports both real backend API and mock services
- Streaming LLM responses with Server-Sent Events
- Document context automatically included in LLM queries
- Conversation history optimization handled by backend

**MCP Tools:**
- Advanced tool execution with progress tracking
- Configurable execution modes and tool choices
- Integration with streaming responses
- Detailed logging and error handling

When working on this codebase, always check the extensive README.md and .github/copilot-instructions.md for detailed implementation guidance and current development status.