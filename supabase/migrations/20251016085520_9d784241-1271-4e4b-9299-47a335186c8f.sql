-- Add attachments support to campaign templates
ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Remove campaign_name from campaigns as it's no longer needed
ALTER TABLE campaigns DROP COLUMN IF EXISTS campaign_name;

-- Create settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on settings"
ON settings FOR ALL
USING (true)
WITH CHECK (true);

-- Create webinar recommendations table for AI-generated suggestions
CREATE TABLE IF NOT EXISTS webinar_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id uuid REFERENCES webinar_distributions(id) ON DELETE CASCADE,
  gartner_role text NOT NULL,
  webinar_title text NOT NULL,
  webinar_description text,
  relevance_score integer,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE webinar_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on webinar_recommendations"
ON webinar_recommendations FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for settings updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();