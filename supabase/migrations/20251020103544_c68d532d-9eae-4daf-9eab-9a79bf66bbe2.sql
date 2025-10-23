-- Add webinar_role column to contacts table
ALTER TABLE public.contacts
ADD COLUMN webinar_role text;

ALTER TABLE campaigns 
ADD COLUMN has_replied BOOLEAN DEFAULT false,
ADD COLUMN last_reply_date TIMESTAMP;