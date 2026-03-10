# Threads MCP Server

An MCP (Model Context Protocol) server for Meta Threads. Enables Claude Desktop, Claude Code, and other MCP clients to read and publish threads, view replies, and access analytics.

## Features

- **Profile**: View authenticated user profile
- **Read**: Browse threads, view individual posts, and read reply chains
- **Publish**: Create threads, schedule posts, reply to threads, delete posts
- **Analytics**: View insights for individual threads and account-level metrics

## Installation

### Prerequisites

- Node.js >= 18.0.0

### From Source

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `THREADS_ACCESS_TOKEN` | Yes | — | Meta Graph API access token |
| `THREADS_USER_ID` | No | `me` | Threads user ID |
| `THREADS_API_BASE_URL` | No | `https://graph.threads.net/v1.0` | Meta Graph API endpoint |

Create a `.env` file or set these in your shell environment.

### Auth Setup

Run the interactive OAuth flow to generate your access token:

```bash
npm run auth-setup
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "threads": {
      "command": "node",
      "args": ["/path/to/threads-mcp/build/index.js"],
      "env": {
        "THREADS_ACCESS_TOKEN": "your-access-token"
      }
    }
  }
}
```

## Usage with Claude Code

```bash
claude mcp add threads -- node /path/to/threads-mcp/build/index.js
```

## Available Tools

| Tool | Description |
|------|-------------|
| `get_profile` | View authenticated user profile |
| `list_threads` | List recent threads |
| `get_thread` | View a specific thread |
| `get_replies` | View replies to a thread |
| `create_thread` | Publish a new thread |
| `schedule_thread` | Schedule a thread for later |
| `reply_to_thread` | Reply to an existing thread |
| `delete_thread` | Delete a thread |
| `get_thread_insights` | Analytics for a specific thread |
| `get_account_insights` | Account-level analytics |

## Development

- `npm run dev` — Watch mode with TypeScript compilation
- `npm run build` — Build the project
- `npm start` — Start the built server
- `npm run auth-setup` — Interactive OAuth token setup

## License

MIT
