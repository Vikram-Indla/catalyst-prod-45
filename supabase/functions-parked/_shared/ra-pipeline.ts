import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AgentStep {
  name: string;
  order: number;
  execute: (input: unknown) => Promise<unknown>;
}

export async function runPipeline(params: {
  documentId: string;
  steps: AgentStep[];
  supabase: ReturnType<typeof createClient>;
}) {
  const { documentId, steps, supabase } = params;
  const channel = supabase.channel(`rec-${documentId}`);

  let lastOutput: unknown = null;

  for (const step of steps) {
    // Insert agent run record
    const { data: run } = await supabase
      .from('ra_agent_runs')
      .insert({
        document_id: documentId,
        agent_name: step.name,
        agent_order: step.order,
        status: 'running',
      })
      .select()
      .single();

    // Broadcast agent-start
    await channel.send({
      type: 'broadcast',
      event: 'agent-progress',
      payload: { event: 'agent-start', agent_name: step.name, agent_order: step.order },
    });

    try {
      const startTime = Date.now();
      lastOutput = await step.execute(lastOutput);
      const elapsed = (Date.now() - startTime) / 1000;

      // Update agent run as complete
      if (run) {
        await supabase
          .from('ra_agent_runs')
          .update({ status: 'complete', completed_at: new Date().toISOString() })
          .eq('id', run.id);
      }

      // Broadcast agent-complete
      await channel.send({
        type: 'broadcast',
        event: 'agent-progress',
        payload: {
          event: 'agent-complete',
          agent_name: step.name,
          agent_order: step.order,
          elapsed_seconds: Math.round(elapsed * 10) / 10,
        },
      });
    } catch (error) {
      // Update agent run as failed
      if (run) {
        await supabase
          .from('ra_agent_runs')
          .update({ status: 'failed', error_message: (error as Error).message })
          .eq('id', run.id);
      }

      // Broadcast pipeline-error
      await channel.send({
        type: 'broadcast',
        event: 'agent-progress',
        payload: { event: 'pipeline-error', error: (error as Error).message },
      });

      // Update document as failed
      await supabase
        .from('ra_documents')
        .update({ status: 'failed' })
        .eq('id', documentId);

      throw error;
    }
  }

  // Broadcast pipeline-complete
  await channel.send({
    type: 'broadcast',
    event: 'agent-progress',
    payload: { event: 'pipeline-complete' },
  });

  return lastOutput;
}
