-- Create contacts table (CRM module)
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  gartner_role TEXT NOT NULL,
  title TEXT NOT NULL,
  contact_type TEXT NOT NULL,
  contacted BOOLEAN DEFAULT false,
  last_contact_date TIMESTAMPTZ,
  interested BOOLEAN DEFAULT false,
  webinars_subscribed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create campaign_templates table
CREATE TABLE public.campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  gartner_role TEXT NOT NULL,
  email_1_subject TEXT NOT NULL,
  email_1_html TEXT NOT NULL,
  email_2_subject TEXT NOT NULL,
  email_2_html TEXT NOT NULL,
  email_3_subject TEXT NOT NULL,
  email_3_html TEXT NOT NULL,
  email_4_subject TEXT NOT NULL,
  email_4_html TEXT NOT NULL,
  email_5_subject TEXT NOT NULL,
  email_5_html TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.campaign_templates(id) ON DELETE SET NULL,
  campaign_name TEXT NOT NULL,
  start_campaign BOOLEAN DEFAULT false,
  email_1_date TIMESTAMPTZ,
  email_2_date TIMESTAMPTZ,
  email_3_date TIMESTAMPTZ,
  email_4_date TIMESTAMPTZ,
  email_5_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  response_date TIMESTAMPTZ,
  response_text TEXT,
  emails_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create webinar_distributions table
CREATE TABLE public.webinar_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  email_html TEXT NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_distributions ENABLE ROW LEVEL SECURITY;

-- Create policies (single user app, allow all operations)
CREATE POLICY "Allow all operations on contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on campaign_templates" ON public.campaign_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on webinar_distributions" ON public.webinar_distributions FOR ALL USING (true) WITH CHECK (true);

-- Create update triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_templates_updated_at BEFORE UPDATE ON public.campaign_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for webinar PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('webinars', 'webinars', true);

-- Storage policies for webinars bucket
CREATE POLICY "Allow all operations on webinars bucket" ON storage.objects FOR ALL USING (bucket_id = 'webinars') WITH CHECK (bucket_id = 'webinars');