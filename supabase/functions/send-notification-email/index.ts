import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body, notificationType } = await req.json();

    // MOCK EMAIL SENDING - Phase 1 implementation
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    
    console.log('📧 Mock Email Send:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Type: ${notificationType}`);
    console.log(`  Body: ${body.substring(0, 100)}...`);

    // Simulate email delivery delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email queued for delivery (mock)',
        emailId: crypto.randomUUID(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
