/**
 * Caty AI Hook — Lovable AI (Gemini) Streaming Integration
 * Token-by-token streaming for capacity AI responses
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

const CAPACITY_AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capacity-ai`;

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UseCatyAIReturn {
  isStreaming: boolean;
  streamResponse: (
    messages: Message[],
    onDelta: (text: string) => void,
    onDone: () => void,
    onError?: (error: string) => void
  ) => Promise<void>;
  abortStream: () => void;
}

export function useCatyAI(): UseCatyAIReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const abortStream = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
    }
  }, [abortController]);

  const streamResponse = useCallback(async (
    messages: Message[],
    onDelta: (text: string) => void,
    onDone: () => void,
    onError?: (error: string) => void
  ) => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsStreaming(true);

    try {
      const response = await fetch(CAPACITY_AI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      // Handle error responses
      if (!response.ok || !response.body) {
        let errorMessage = 'Failed to connect to AI service';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }

        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please wait a moment.');
          errorMessage = 'Rate limit exceeded. Please try again in a moment.';
        } else if (response.status === 402) {
          toast.error('AI credits exhausted. Please add funds.');
          errorMessage = 'AI credits exhausted. Please add funds to continue.';
        }

        onError?.(errorMessage);
        setIsStreaming(false);
        return;
      }

      // Stream the response token-by-token
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        // Process line-by-line as data arrives
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1); // handle CRLF
          if (line.startsWith(':') || line.trim() === '') continue; // SSE comments/keepalive
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content); // emit token(s) immediately
          } catch {
            // Incomplete JSON split across chunks: put it back and wait for more data
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush in case remaining buffered lines arrived without trailing newline
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content);
          } catch { /* ignore partial leftovers */ }
        }
      }

      onDone();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Caty AI streaming error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onError?.(errorMessage);
        toast.error('AI error. Please try again.');
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  }, []);

  return {
    isStreaming,
    streamResponse,
    abortStream,
  };
}
