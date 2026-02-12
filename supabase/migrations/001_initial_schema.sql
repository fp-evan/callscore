-- CallScore Initial Schema
-- Phase 1: Foundation

-- ============================================================
-- Organizations
-- ============================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL, -- 'hvac', 'plumbing', 'electrical', 'general'
  company_size TEXT, -- 'solo', '2-10', '11-50', '51-200', '200+'
  onboarding_completed BOOLEAN DEFAULT FALSE,
  notification_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Technicians
-- ============================================================
CREATE TABLE technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  specialties TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Eval Criteria
-- ============================================================
CREATE TABLE eval_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT, -- 'greeting', 'closing', 'sales_technique', 'compliance', etc.
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published', -- 'draft', 'published' (from addendum)
  target_pass_rate FLOAT DEFAULT 0.8, -- from addendum
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Few-Shot Examples
-- ============================================================
CREATE TABLE few_shot_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_criteria_id UUID REFERENCES eval_criteria(id) ON DELETE CASCADE,
  example_type TEXT NOT NULL, -- 'pass' or 'fail'
  transcript_snippet TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Transcripts
-- ============================================================
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  source TEXT NOT NULL, -- 'recording', 'paste', 'mock'
  raw_transcript TEXT NOT NULL,
  diarized_transcript JSONB,
  summary TEXT,
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  service_type TEXT,
  location TEXT,
  metadata JSONB DEFAULT '{}',
  eval_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Eval Results
-- ============================================================
CREATE TABLE eval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
  eval_criteria_id UUID REFERENCES eval_criteria(id) ON DELETE CASCADE,
  passed BOOLEAN,
  confidence FLOAT,
  reasoning TEXT,
  transcript_excerpt TEXT,
  excerpt_start_index INTEGER,
  excerpt_end_index INTEGER,
  eval_run_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Eval Templates
-- ============================================================
CREATE TABLE eval_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  criteria JSONB NOT NULL, -- array of {name, description, category}
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_transcripts_org ON transcripts(organization_id);
CREATE INDEX idx_transcripts_tech ON transcripts(technician_id);
CREATE INDEX idx_transcripts_eval_status ON transcripts(eval_status);
CREATE INDEX idx_eval_results_transcript ON eval_results(transcript_id);
CREATE INDEX idx_eval_results_criteria ON eval_results(eval_criteria_id);
CREATE INDEX idx_eval_results_run ON eval_results(eval_run_id);
CREATE INDEX idx_eval_criteria_org ON eval_criteria(organization_id);
CREATE INDEX idx_technicians_org ON technicians(organization_id);
CREATE INDEX idx_few_shot_examples_criteria ON few_shot_examples(eval_criteria_id);

-- ============================================================
-- Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technicians_updated_at
  BEFORE UPDATE ON technicians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eval_criteria_updated_at
  BEFORE UPDATE ON eval_criteria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcripts_updated_at
  BEFORE UPDATE ON transcripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
