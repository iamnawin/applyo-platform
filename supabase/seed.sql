-- Seed sample jobs for development/testing
-- These have NULL embeddings; scoring uses AI text comparison (not pgvector ANN)
-- Run via: Supabase dashboard → SQL editor, or supabase db reset --seed

INSERT INTO jobs (id, company_id, raw_description, normalized_data, embedding, status, source, source_url, created_at)
VALUES

(
  gen_random_uuid(),
  NULL,
  'Senior React Developer at TechCorp India. 4+ years experience with React, TypeScript, and Node.js. Build scalable frontend applications. Remote-friendly. CTC: 18-25 LPA.',
  '{"title":"Senior React Developer","company":"TechCorp India","location":"Remote","type":"remote","skills":["React","TypeScript","Node.js","REST APIs","Git"],"experience_years":4,"salary_range":{"min":1800000,"max":2500000,"currency":"INR"},"description_summary":"Build scalable frontend applications using React and TypeScript in a remote-first environment."}'::jsonb,
  NULL,
  'active',
  'seed',
  NULL,
  NOW() - INTERVAL '2 days'
),

(
  gen_random_uuid(),
  NULL,
  'Full Stack Engineer at Startupwala. We need a full-stack engineer with React and Python/Django experience. Bangalore, hybrid. 3-5 years experience. 15-22 LPA.',
  '{"title":"Full Stack Engineer","company":"Startupwala","location":"Bangalore","type":"full-time","skills":["React","Python","Django","PostgreSQL","Docker"],"experience_years":3,"salary_range":{"min":1500000,"max":2200000,"currency":"INR"},"description_summary":"Build product features end-to-end across frontend (React) and backend (Python/Django)."}'::jsonb,
  NULL,
  'active',
  'seed',
  NULL,
  NOW() - INTERVAL '3 days'
),

(
  gen_random_uuid(),
  NULL,
  'Frontend Engineer at Fintech Startup Mumbai. Strong Next.js and Tailwind skills required. Work on customer-facing dashboards. 2+ years exp. 12-18 LPA. Hybrid Mumbai.',
  '{"title":"Frontend Engineer","company":"FinPay Technologies","location":"Mumbai","type":"full-time","skills":["Next.js","React","Tailwind CSS","TypeScript","REST APIs"],"experience_years":2,"salary_range":{"min":1200000,"max":1800000,"currency":"INR"},"description_summary":"Build responsive customer-facing dashboards and UI components using Next.js and Tailwind."}'::jsonb,
  NULL,
  'active',
  'seed',
  NULL,
  NOW() - INTERVAL '4 days'
),

(
  gen_random_uuid(),
  NULL,
  'Backend Node.js Engineer at CloudBase. Build microservices and REST APIs. Strong Node.js, Express, PostgreSQL. 3+ years. Remote India. 14-20 LPA.',
  '{"title":"Backend Engineer - Node.js","company":"CloudBase Systems","location":"Remote","type":"remote","skills":["Node.js","Express","PostgreSQL","Redis","Docker","AWS"],"experience_years":3,"salary_range":{"min":1400000,"max":2000000,"currency":"INR"},"description_summary":"Design and build microservices and REST APIs using Node.js, Express, and PostgreSQL."}'::jsonb,
  NULL,
  'active',
  'seed',
  NULL,
  NOW() - INTERVAL '5 days'
),

(
  gen_random_uuid(),
  NULL,
  'Data Engineer at Analytics Co. Build ETL pipelines, work with Python, Spark, and BigQuery. 3-6 years experience. Hyderabad or remote. 16-24 LPA.',
  '{"title":"Data Engineer","company":"Analytics Co","location":"Hyderabad","type":"full-time","skills":["Python","Apache Spark","BigQuery","SQL","Airflow","dbt"],"experience_years":3,"salary_range":{"min":1600000,"max":2400000,"currency":"INR"},"description_summary":"Build and maintain data pipelines and ETL workflows using Python, Spark, and BigQuery."}'::jsonb,
  NULL,
  'active',
  'seed',
  NULL,
  NOW() - INTERVAL '6 days'
),

(
  gen_random_uuid(),
  NULL,
  'Product Engineer at Series B SaaS startup. We are hiring generalists who can work across the stack. React, Go, and PostgreSQL. Pune or remote. 5+ years. 25-35 LPA.',
  '{"title":"Product Engineer (Generalist)","company":"Growfast SaaS","location":"Pune","type":"full-time","skills":["React","Go","PostgreSQL","System Design","Kubernetes"],"experience_years":5,"salary_range":{"min":2500000,"max":3500000,"currency":"INR"},"description_summary":"Work across the full stack as a generalist engineer at a growing SaaS company."}'::jsonb,
  NULL,
  'active',
  'seed',
  NULL,
  NOW() - INTERVAL '7 days'
)

ON CONFLICT DO NOTHING;
