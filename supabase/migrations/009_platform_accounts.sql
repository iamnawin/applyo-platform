-- Platform accounts for authenticated browser automation
CREATE TABLE IF NOT EXISTS platform_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('linkedin', 'indeed', 'naukri')),
  credentials_encrypted text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  linked_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz,
  UNIQUE (candidate_id, platform)
);

-- RLS: candidates can only see their own linked accounts
ALTER TABLE platform_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates manage own platform accounts"
  ON platform_accounts FOR ALL
  USING (candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid()));
