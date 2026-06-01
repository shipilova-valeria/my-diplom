INSERT INTO project_members (project_id, user_id, allocated_hours, logged_hours)
SELECT DISTINCT t.project_id, t.assignee_id, 0, 0
FROM tasks t
WHERE t.assignee_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;
