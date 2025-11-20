# Inventory Chat Implementation Guide

## Overview

The Inventory Chat Agent is an AI-powered conversational interface that allows hub users to explore their publication inventory through natural language queries. It uses Anthropic's Claude API to provide intelligent responses about publications, channels, pricing, and audience demographics.

## Architecture

### Backend Components

#### 1. Database Schema (`server/conversationSchema.ts`)
- Defines conversation structure with messages, metadata, and context file references
- Stores conversation history in MongoDB `conversations` collection

#### 2. Conversation Service (`server/conversationService.ts`)
- CRUD operations for conversations
- Message management and retrieval
- Auto-title generation from first message
- Recent message retrieval for context

#### 3. Hub Inventory LLM Service (`server/hubInventoryLLMService.ts`)
- Integrates with Anthropic Claude Sonnet 4.5
- Prepares publication data as context (all fields from Publication schema)
- Manages conversation history (last 10 messages)
- Context caching per hub (1 hour TTL)
- Error handling for rate limits and API issues

#### 4. API Routes (`server/routes/inventory-chat.ts`)
- `POST /api/inventory-chat/conversations` - Create new conversation
- `GET /api/inventory-chat/conversations` - List user's conversations (filtered by hub)
- `GET /api/inventory-chat/conversations/:id` - Get conversation details
- `DELETE /api/inventory-chat/conversations/:id` - Delete conversation
- `POST /api/inventory-chat/conversations/:id/messages` - Send message & get AI response
- `PATCH /api/inventory-chat/conversations/:id/title` - Update conversation title

All routes use `authenticateToken` middleware and verify hub access through user permissions.

### Frontend Components

#### 1. API Client (`src/api/inventoryChat.ts`)
- TypeScript API wrapper
- Type-safe conversation and message interfaces
- Error handling with user-friendly messages

#### 2. Chat Interface (`src/components/inventory-chat/InventoryChatInterface.tsx`)
- Message display with user/assistant differentiation
- **Markdown rendering** for AI responses (headers, lists, bold, italic, etc.)
- Real-time message updates
- Auto-scroll to latest message
- Textarea input with keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Loading states during AI response
- Empty state with example queries

#### 2a. Markdown Message Component (`src/components/inventory-chat/MarkdownMessage.tsx`)
- Renders formatted markdown in AI responses
- Supports: Headers (h1-h3), bold, italic, lists (bullet & numbered), inline code, horizontal rules
- Properly styled with Tailwind typography classes
- No external dependencies required

#### 3. Conversation Sidebar (`src/components/inventory-chat/ConversationSidebar.tsx`)
- List of user's conversations for selected hub
- Create new conversation button
- Select/switch between conversations
- Delete conversation with confirmation dialog
- Display conversation metadata (message count, last activity)

#### 4. Container Component (`src/components/inventory-chat/InventoryChatContainer.tsx`)
- Combines sidebar and chat interface
- Manages conversation selection state
- Loads conversation details on selection
- Hub context integration

#### 5. Hub Central Integration
- Added "AI Chat" tab to Hub Central navigation
- Uses existing HubContext for automatic hub filtering
- Responsive layout with sidebar (320px) and chat interface (flex-1)

## Data Flow

1. User opens "AI Chat" tab in Hub Central
2. Frontend loads user's conversations for selected hub via HubContext
3. User creates new conversation or selects existing one
4. User types message and sends
5. Frontend optimistically adds user message to UI
6. Backend receives message, saves to database
7. Backend fetches hub publications from MongoDB
8. Backend prepares publication context (JSON with all publication data)
9. Backend calls Anthropic API with:
   - System prompt defining agent role
   - Publication context data
   - Recent conversation history (last 10 messages)
   - New user message
10. Anthropic returns AI response
11. Backend saves assistant message to database
12. Backend returns response to frontend
13. Frontend displays assistant message in chat

## Environment Variables Required

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Example Queries

Users can ask questions like:
- "What publications do we have in this hub?"
- "Show me all publications with print distribution"
- "Compare the audience size of our top 3 publications"
- "What's the pricing for newsletter ads?"
- "Which publications have the best reach for young adults?"
- "Show me publications that offer podcast advertising"
- "What are the demographics of [Publication Name]?"

## Testing Checklist

### Backend Testing
- [ ] Create conversation endpoint returns valid conversation
- [ ] List conversations filters by hub correctly
- [ ] Send message saves both user and assistant messages
- [ ] Delete conversation removes from database
- [ ] Hub publications are properly loaded and formatted
- [ ] Anthropic API is called with correct parameters
- [ ] Error handling works for API failures
- [ ] Authentication middleware blocks unauthenticated requests
- [ ] Hub access permissions are enforced

### Frontend Testing
- [ ] Chat interface renders correctly
- [ ] Conversation sidebar displays list of conversations
- [ ] Creating new conversation works
- [ ] Selecting conversation loads messages
- [ ] Sending message displays optimistically
- [ ] AI response appears after processing
- [ ] Delete conversation shows confirmation dialog
- [ ] Empty states display correctly
- [ ] Loading states show during API calls
- [ ] Error messages display properly
- [ ] Auto-scroll works when new messages arrive
- [ ] Keyboard shortcuts work (Enter/Shift+Enter)

### Integration Testing
- [ ] Hub context properly filters conversations
- [ ] Switching hubs changes available conversations
- [ ] Multiple users can have separate conversations
- [ ] Conversation history persists across sessions
- [ ] Large publication datasets don't cause issues
- [ ] Token limits are handled gracefully

## Known Limitations

1. **Context Size**: Very large hubs with 100+ publications may approach token limits. The service includes all publication data in context.
2. **Rate Limiting**: Anthropic API has rate limits. The service catches 429 errors but doesn't implement automatic retry with backoff.
3. **No Streaming**: Responses are returned all at once, not streamed. This may cause delays for longer responses.
4. **Context Cache**: Context is cached for 1 hour per hub. Changes to publications won't reflect immediately in ongoing conversations.

## Future Enhancements

1. **Streaming Responses**: Implement SSE or WebSocket for real-time streaming
2. **Conversation Search**: Add ability to search within conversations
3. **Export Conversations**: Allow users to export chat history
4. **Conversation Sharing**: Enable sharing conversations with team members
5. **Smart Context Selection**: Only include relevant publications based on query
6. **Rate Limit Handling**: Implement exponential backoff for retries
7. **Analytics**: Track popular queries and conversation metrics
8. **Suggested Questions**: Show suggested follow-up questions
9. **Multi-language Support**: Support conversations in multiple languages
10. **Voice Input**: Add voice-to-text for queries

## Troubleshooting

### "API key not configured" Error
- Ensure `ANTHROPIC_API_KEY` is set in `.env` file
- Restart server after adding environment variable

### "No publications found" Error
- Verify hub has publications assigned via Hub Management
- Check that publications have `hubIds` array including the hub

### Messages Not Loading
- Check browser console for API errors
- Verify authentication token is valid
- Ensure user has access to the hub

### Slow Responses
- Check publication count in hub (>50 may be slow)
- Verify Anthropic API status
- Check network connectivity

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Users can only access conversations they created
3. **Hub Access**: Conversations are filtered by user's hub permissions
4. **Data Privacy**: Conversation history is private to each user
5. **API Keys**: Anthropic API key is stored securely on server
6. **Input Validation**: User messages are validated before processing
7. **Rate Limiting**: Consider implementing rate limiting per user

## File Structure

```
chicago-hub/
├── server/
│   ├── conversationSchema.ts          # MongoDB schema
│   ├── conversationService.ts         # Service layer
│   ├── hubInventoryLLMService.ts     # Anthropic integration
│   └── routes/
│       └── inventory-chat.ts          # API endpoints
├── src/
│   ├── api/
│   │   └── inventoryChat.ts          # Frontend API client
│   └── components/
│       └── inventory-chat/
│           ├── InventoryChatInterface.tsx    # Chat UI
│           ├── ConversationSidebar.tsx       # Sidebar UI
│           └── InventoryChatContainer.tsx    # Container
└── docs/
    └── INVENTORY_CHAT_IMPLEMENTATION.md      # This file
```

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in browser console
3. Check server logs for backend errors
4. Verify environment variables are set correctly

