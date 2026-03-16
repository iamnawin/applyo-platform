alter table resumes
add column if not exists processing_status text not null default 'ready'
  check (processing_status in ('ready', 'pending_ai', 'failed_ai'));

update resumes
set processing_status = case
  when embedding is not null then 'ready'
  else 'pending_ai'
end
where processing_status is null
   or processing_status not in ('ready', 'pending_ai', 'failed_ai');
