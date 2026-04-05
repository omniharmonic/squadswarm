-- Skills table: canonical skill definitions
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  synonyms JSONB DEFAULT '[]',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills (slug);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills (category);

-- User skills: tracks skill portfolio with attestation-based proficiency
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  skill_id UUID NOT NULL REFERENCES skills(id),
  attestation_count INTEGER NOT NULL DEFAULT 0,
  last_attested_at TIMESTAMP,
  proficiency_level TEXT NOT NULL DEFAULT 'demonstrated',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_skills_unique ON user_skills (user_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills (user_id);

-- Add required_skills column to deliverables
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS required_skills JSONB DEFAULT '[]';
