import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { distributionId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Get distribution details
    const { data: distribution } = await supabase
      .from('webinar_distributions')
      .select('*')
      .eq('id', distributionId)
      .single();

    if (!distribution) {
      throw new Error('Distribution not found');
    }

    // Get webinar recommendations for this distribution
    const { data: recommendations } = await supabase
      .from('webinar_recommendations')
      .select('*')
      .eq('distribution_id', distributionId);

    // Get contacts subscribed to webinars
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('webinars_subscribed', true);

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No contacts subscribed to webinars' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get email signature from settings
    const { data: signatureData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'email_signature')
      .maybeSingle();

    const signature = signatureData?.value?.signature || '';

    let emailsSent = 0;

    // Send personalized emails
    for (const contact of contacts) {
      // Get recommendations for this contact's role
      const relevantWebinars = recommendations?.filter(
        r => r.gartner_role === contact.gartner_role
      ) || [];

      let html = distribution.email_html;
      
      // Replace placeholders
      html = html.replace(/{{nombre}}/g, contact.first_name);
      html = html.replace(/{{apellido}}/g, contact.last_name);
      
      // Add relevant webinars section if available
      if (relevantWebinars.length > 0) {
        const webinarList = relevantWebinars
          .map(w => `<li><strong>${w.webinar_title}</strong>: ${w.webinar_description}</li>`)
          .join('');
        html += `<br/><h3>Webinars recomendados para tu rol:</h3><ul>${webinarList}</ul>`;
      }
      
      // Add signature
      if (signature) {
        html += `<br/><br/>${signature}`;
      }

      console.log('Sending webinar email to:', contact.email);

      await resend.emails.send({
        from: "Lovable <onboarding@resend.dev>",
        to: [contact.email],
        subject: distribution.email_subject,
        html: html,
        attachments: [
          {
            filename: distribution.file_name,
            path: distribution.file_url,
          }
        ],
      });

      emailsSent++;
    }

    // Mark distribution as sent
    await supabase
      .from('webinar_distributions')
      .update({
        sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', distributionId);

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending webinar emails:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});