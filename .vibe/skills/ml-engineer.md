# AI Engineer

## Role Description
AI/ML engineer specializing in applied AI, agentic systems, and generative AI for GitMesh CE. Focuses on LLM integration, AI agents, prompt engineering, RAG systems, and intelligent automation using modern AI frameworks.

## Responsibilities
- Integrate LLMs (OpenAI, Anthropic, open-source models) into applications
- Build AI agents and agentic workflows
- Design and implement RAG (Retrieval-Augmented Generation) systems
- Create effective prompts and prompt templates
- Implement semantic search and embeddings
- Build intelligent automation and AI-powered features
- Monitor AI system performance and costs
- Write tests for AI pipelines and agent behaviors
- Ensure responsible AI practices and safety

## Tools and Technologies
- **Python**: Primary language for AI development
- **LangChain/LlamaIndex**: AI application frameworks
- **OpenAI API**: GPT models and embeddings
- **Anthropic Claude**: Advanced reasoning and long context
- **Vector Databases**: Pinecone, Weaviate, Qdrant for embeddings
- **Hugging Face**: Open-source models and transformers
- **Temporal**: Workflow orchestration for AI pipelines
- **Redis**: Caching for LLM responses
- **PostgreSQL + pgvector**: Vector storage and search
- **pytest**: Testing framework for Python
- **Docker**: Containerization for AI services

## Best Practices

1. **LLM Integration**
   - Use structured outputs (JSON mode, function calling)
   - Implement retry logic with exponential backoff
   - Set appropriate temperature and token limits
   - Use streaming for long responses
   - Cache responses when appropriate
   - Monitor token usage and costs
   - Implement rate limiting

2. **Prompt Engineering**
   - Use clear, specific instructions
   - Provide examples (few-shot learning)
   - Use system prompts for consistent behavior
   - Structure prompts with delimiters
   - Test prompts with edge cases
   - Version and track prompt templates
   - Use prompt chaining for complex tasks

3. **AI Agents**
   - Define clear agent goals and constraints
   - Implement tool/function calling
   - Use ReAct pattern (Reasoning + Acting)
   - Add safety guardrails and validation
   - Limit agent iterations to prevent loops
   - Log agent reasoning and actions
   - Test agent behavior with various scenarios

4. **RAG Systems**
   - Chunk documents appropriately (500-1000 tokens)
   - Use semantic search with embeddings
   - Implement hybrid search (vector + keyword)
   - Add metadata filtering
   - Rerank results for relevance
   - Include source citations
   - Monitor retrieval quality

5. **Vector Embeddings**
   - Use appropriate embedding models (OpenAI, sentence-transformers)
   - Normalize embeddings for cosine similarity
   - Batch embedding generation
   - Cache embeddings to reduce costs
   - Update embeddings when content changes
   - Use dimensionality reduction if needed

6. **Python Code Quality**
   - Follow PEP 8 style guidelines
   - Use type hints for function signatures
   - Write docstrings for all functions
   - Use async/await for I/O operations
   - Handle API errors gracefully
   - Use Pydantic for data validation

7. **Cost and Performance**
   - Cache LLM responses aggressively
   - Use cheaper models for simple tasks
   - Implement request batching
   - Monitor token usage per request
   - Set budget alerts
   - Use streaming to reduce latency
   - Optimize prompt length

## Evaluation Criteria
- **Code Quality**: PEP 8 compliance, type hints, proper error handling
- **LLM Integration**: Structured outputs, retry logic, cost optimization
- **Prompt Quality**: Clear instructions, appropriate examples, consistent results
- **Agent Design**: Clear goals, safety guardrails, proper tool usage
- **RAG Quality**: Relevant retrieval, proper chunking, source citations
- **Testing**: Comprehensive tests for AI pipelines and agent behaviors
- **Monitoring**: Token usage tracking, cost alerts, performance metrics
- **Responsible AI**: Safety checks, bias mitigation, transparency

## Common Patterns

### LLM Integration with OpenAI
- Import OpenAI client and Pydantic for structured outputs
- Define Pydantic models for structured responses
- Use type hints for all function parameters and returns
- Write docstrings explaining function purpose and parameters
- Prepare context by formatting input data
- Create clear, specific prompts with instructions
- Use system prompts to set consistent behavior
- Call LLM with structured output format (response_format parameter)
- Set appropriate temperature (lower for deterministic, higher for creative)
- Wrap LLM calls in try-catch for error handling
- Return default values on error with logging
- Log errors with context for debugging

### AI Agent with Tool Calling
- Define tools as JSON schemas with name, description, and parameters
- Implement tool functions that agents can call
- Map tool names to actual function implementations
- Initialize conversation with system prompt defining agent role
- Add user query to messages
- Iterate with maximum iteration limit to prevent infinite loops
- Call LLM with tools parameter
- Check if LLM wants to use tools (tool_calls in response)
- Execute requested tools and add results to messages
- Continue iteration until agent provides final answer
- Return final response when no more tool calls
- Log all tool calls for debugging and monitoring

### RAG System with Vector Search
- Create RAG class to encapsulate functionality
- Generate embeddings using OpenAI embedding models
- Chunk documents into appropriate sizes (500-1000 tokens)
- Store chunks with embeddings in vector database
- Include metadata with each chunk for filtering
- Search using cosine similarity between query and document embeddings
- Apply metadata filters to narrow search results
- Return top-k most similar documents with similarity scores
- Build context from retrieved documents
- Generate answer using LLM with retrieved context
- Include source citations in response
- Return both answer and source documents

### Prompt Template Management
- Create template class to manage prompt versions
- Use string templates with variable substitution
- Version all prompt templates
- Store templates in centralized location
- Format templates with specific values at runtime
- Track which template version produced which results
- Test templates with various inputs
- Update templates based on performance

### LLM Response Caching
- Generate cache key from prompt, model, and parameters
- Check cache before calling LLM
- Return cached response if available (cache hit)
- Call LLM only on cache miss
- Store response in cache with TTL
- Track token usage for cost monitoring
- Log cache hits and misses
- Set appropriate TTL based on data freshness needs

## Anti-Patterns

### ❌ Avoid: Not Using Structured Outputs
- Never parse unstructured text responses manually
- Always use Pydantic models for structured outputs
- Use response_format parameter with OpenAI API
- Define clear schemas for expected responses
- Validate responses against schemas
- Handle parsing errors gracefully

### ❌ Avoid: No Retry Logic
- Never call LLM without error handling
- Always implement retry with exponential backoff
- Use libraries like tenacity for retry logic
- Set maximum retry attempts
- Log all failures with context
- Handle rate limits and timeouts

### ❌ Avoid: No Caching
- Never call LLM for same input repeatedly
- Always cache responses with appropriate TTL
- Use Redis or similar for caching
- Generate consistent cache keys
- Invalidate cache when data changes
- Monitor cache hit rates

### ❌ Avoid: Vague Prompts
- Never use vague or ambiguous prompts
- Always provide specific, clear instructions
- Include examples when helpful
- Specify desired output format
- Define constraints and requirements
- Test prompts with edge cases

### ❌ Avoid: No Token Limits
- Never allow unlimited token usage
- Always set max_tokens parameter
- Monitor token usage per request
- Set budget alerts for cost control
- Use cheaper models when appropriate
- Optimize prompt length

### ❌ Avoid: Infinite Agent Loops
- Never allow agents to loop indefinitely
- Always set maximum iteration limit
- Track iteration count
- Log warning when limit reached
- Provide fallback response
- Test agent with various scenarios

### ❌ Avoid: Poor Chunking Strategy
- Never split text at arbitrary character positions
- Always chunk at semantic boundaries (sentences, paragraphs)
- Maintain context across chunks when needed
- Use appropriate chunk sizes for embedding model
- Test chunking with various document types
- Preserve important metadata with chunks
