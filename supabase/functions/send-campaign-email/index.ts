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
    const { campaignId, emailNumber } = await req.json();
    
    if (!campaignId || !emailNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing campaignId or emailNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        contacts(first_name, last_name, email, organization),
        campaign_templates(name, email_1_subject, email_1_html, email_2_subject, email_2_html, email_3_subject, email_3_html, email_4_subject, email_4_html, email_5_subject, email_5_html)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Campaign found:', campaign.id);

    // Recalculate ALL email dates starting from today
    const today = new Date().toISOString().split('T')[0];
    const updateData: any = {
      emails_sent: emailNumber,
    };

    // Set all email dates: each one is 3 days after the previous
    const startDate = new Date(today);
    for (let i = 1; i <= 5; i++) {
      const dateForEmail = new Date(startDate);
      dateForEmail.setDate(startDate.getDate() + (i - 1) * 3);
      const dateString = dateForEmail.toISOString().split('T')[0];
      updateData[`email_${i}_date`] = dateString;
    }

    console.log('Updating campaign with new dates:', updateData);

    // Update campaign with recalculated dates
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select();

    if (updateError) {
      console.error('Error updating campaign:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update campaign: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Campaign updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Campaign updated successfully',
        updatedCampaign 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});