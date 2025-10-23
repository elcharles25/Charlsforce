import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { distributionId, fileUrl } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Downloading PDF from:', fileUrl);
    
    // Download the PDF file
    const pdfResponse = await fetch(fileUrl);
    if (!pdfResponse.ok) {
      throw new Error('Failed to download PDF');
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    console.log('Analyzing PDF with AI...');

    // Get Gartner roles from contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('gartner_role')
      .not('gartner_role', 'is', null);

    const uniqueRoles = [...new Set(contacts?.map(c => c.gartner_role) || [])];

    const prompt = `Analiza este documento PDF de webinars y extrae información sobre los webinars disponibles. 
    Para cada webinar identifica:
    - Título del webinar
    - Descripción breve
    - Cuál de estos roles de Gartner sería más relevante: ${uniqueRoles.join(', ')}
    - Puntuación de relevancia (1-10) para cada rol

    Devuelve SOLO un JSON array con este formato:
    [
      {
        "title": "título del webinar",
        "description": "descripción breve",
        "gartner_role": "rol más relevante",
        "relevance_score": 8
      }
    ]`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content;
    
    console.log('AI Response:', content);

    // Parse the JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const webinars = JSON.parse(jsonMatch[0]);

    // Insert recommendations into database
    const recommendations = webinars.map((w: any) => ({
      distribution_id: distributionId,
      webinar_title: w.title,
      webinar_description: w.description,
      gartner_role: w.gartner_role,
      relevance_score: w.relevance_score
    }));

    const { error: insertError } = await supabase
      .from('webinar_recommendations')
      .insert(recommendations);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Successfully created recommendations:', recommendations.length);

    return new Response(
      JSON.stringify({ success: true, recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});