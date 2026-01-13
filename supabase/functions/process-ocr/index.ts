import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attachmentId, imageUrl } = await req.json();

    if (!attachmentId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: "attachmentId and imageUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    const mediaType = imageResponse.headers.get("content-type") || "image/png";

    // Call Lovable AI Gateway with vision model
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${base64}`,
                },
              },
              {
                type: "text",
                text: `Extract ALL text from this screenshot. Include:
- UI labels, buttons, menus
- Error messages and alerts
- Form field labels and values
- URLs and email addresses
- Console output
- Any readable text

Return ONLY the extracted text, preserving layout with line breaks. No commentary or explanations.`,
              },
            ],
          },
        ],
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices?.[0]?.message?.content || "";
    
    // Calculate confidence based on text length and quality
    const wordCount = extractedText.split(/\s+/).filter((w: string) => w.length > 0).length;
    const confidence = wordCount > 10 ? 0.9 : wordCount > 3 ? 0.7 : 0.5;

    // Update database with OCR results
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateError } = await supabase
      .from("step_result_attachments")
      .update({
        ocr_text: extractedText,
        ocr_confidence: confidence,
        ocr_processed_at: new Date().toISOString(),
      })
      .eq("id", attachmentId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error("Failed to save OCR results");
    }

    return new Response(
      JSON.stringify({
        text: extractedText,
        confidence,
        wordCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OCR processing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
