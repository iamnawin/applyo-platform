-- Vector similarity indexes for fast matching
create index on resumes using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on jobs using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- RLS policies
alter table candidates enable row level security;
alter table resumes enable row level security;
alter table preferences enable row level security;
alter table applications enable row level security;
alter table jobs enable row level security;
alter table companies enable row level security;

create policy "Candidates own their data"
  on candidates for all
  using (user_id = auth.uid());

create policy "Candidates own their resumes"
  on resumes for all
  using (candidate_id in (select id from candidates where user_id = auth.uid()));

create policy "Candidates own their preferences"
  on preferences for all
  using (candidate_id in (select id from candidates where user_id = auth.uid()));

create policy "Candidates own their applications"
  on applications for all
  using (candidate_id in (select id from candidates where user_id = auth.uid()));

create policy "Jobs are publicly readable"
  on jobs for select using (true);

create policy "Companies own their data"
  on companies for all
  using (user_id = auth.uid());
