import Anthropic from '@anthropic-ai/sdk'

// Singleton server-side Anthropic client
// Never import this in client components
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export default anthropic
