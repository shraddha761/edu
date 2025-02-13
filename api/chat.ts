import { NextRequest } from 'next/server';
import { RateLimiter } from '../utils/rateLimiter';

const rateLimiter = new RateLimiter({
  requestsPerMinute: Number(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) || 15,
  requestsPerHour: Number(process.env.RATE_LIMIT_REQUESTS_PER_HOUR) || 250,
  requestsPerDay: Number(process.env.RATE_LIMIT_REQUESTS_PER_DAY) || 500
});

export const config = {
  runtime: 'edge'
};

export default async function handler(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || 'anonymous';
    const isAllowed = await rateLimiter.checkLimit(clientIp);
    
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const body = await req.json();
    const { messages } = body;

    // Log the request (but not the API key)
    console.log('Making request to OpenAI:', {
      model: 'gpt-3.5-turbo',
      messageCount: messages.length,
      firstMessagePreview: messages[0]?.content?.slice(0, 50)
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`,
    };

    if (process.env.OPENAI_ORG_ID) {
      headers['OpenAI-Organization'] = process.env.OPENAI_ORG_ID;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage += ` - ${JSON.stringify(errorData)}`;
        console.error('Detailed API Error:', errorData);
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('API error:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal Server Error',
      details: error.toString(),
      type: error.constructor.name
    }), {
      status: error.status || 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}