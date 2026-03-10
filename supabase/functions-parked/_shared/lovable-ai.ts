const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export async function callLovableAI(params: {
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not set');

  const messages = [
    { role: 'system', content: params.systemPrompt },
    { role: 'user', content: params.userPrompt },
  ];

  const body: Record<string, unknown> = {
    model: params.model || 'google/gemini-3-flash-preview',
    messages,
    max_tokens: params.maxTokens ?? 8192,
    temperature: 0.3,
  };

  if (params.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(LOVABLE_AI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) throw new Error('Rate limit exceeded. Please try again later.');
    if (res.status === 402) throw new Error('AI credits exhausted. Please add funds.');
    throw new Error(`AI API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}
