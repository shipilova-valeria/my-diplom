INSERT INTO users (email, password_hash, last_name, first_name, middle_name, position, phone, role, status, start_date) VALUES
('head@ilavista.by', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Волков', 'Андрей', 'Петрович', 'Руководитель отдела', '+375 29 111 00 00', 'head', 'active', '2020-06-01'),
('admin@ilavista.by', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Козлова', 'Ольга', 'Владимировна', 'Administrator', '+375 29 500 00 05', 'admin', 'active', '2021-05-01'),
('e.smirnova@ilavista.by', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Смирнова', 'Елена', 'Александровна', 'Project Manager', '+375 29 100 00 01', 'manager', 'active', '2022-01-15'),
('s.kuznetsov@ilavista.by', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Кузнецов', 'Сергей', 'Игоревич', 'Project Manager', '+375 29 101 00 02', 'manager', 'active', '2022-06-01'),
('s.sokolova@ilavista.by', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Соколова', 'Светлана', 'Павловна', 'Project Manager', '+375 29 102 00 03', 'manager', 'active', '2023-02-10'),
('j.antonova@ilavista.by', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Антонова', 'Юлия', 'Михайловна', 'Business Analyst', '+375 29 203 00 04', 'participant', 'active', '2023-09-01'),
('a.petrov@ilavista.by', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Петров', 'Алексей', 'Александрович', 'Business Analyst', '+375 29 200 00 02', 'participant', 'active', '2023-06-01'),
('i.ivanov@ilavista.by', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Иванов', 'Иван', 'Иванович', 'Backend Developer', '+375 29 123 45 67', 'participant', 'active', '2023-03-12'),
('v.ershov@ilavista.by', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Ершов', 'Владимир', 'Николаевич', 'Backend Developer', '+375 29 210 00 06', 'participant', 'active', '2024-03-01'),
('e.sidorova@ilavista.by', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Сидорова', 'Елена', 'Викторовна', 'Frontend Developer', '+375 29 300 00 03', 'participant', 'active', '2023-08-20'),
('m.gromova@ilavista.by', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Громова', 'Марина', 'Олеговна', 'Frontend Developer', '+375 29 310 00 07', 'participant', 'active', '2024-05-15'),
('d.kozlov@ilavista.by', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Козлов', 'Дмитрий', 'Сергеевич', 'QA Engineer', '+375 29 400 00 04', 'participant', 'active', '2024-01-10');

INSERT INTO projects (name, description, start_date, deadline, pm_id, status, allocated_hours, progress) VALUES
('CRM Portal', 'Корпоративный CRM портал', '2025-10-01', '2026-07-15', 3, 'active', 240, 45),
('Mobile App', 'Мобильное приложение для клиентов', '2025-09-22', '2026-09-20', 3, 'active', 180, 62),
('E-commerce B2B', 'B2B маркетплейс', '2025-09-01', '2026-08-01', 3, 'on_review', 320, 78),
('Analytics Dashboard', 'Дашборд аналитики', '2026-02-01', '2026-08-10', 3, 'paused', 120, 15);

INSERT INTO project_members (project_id, user_id, allocated_hours, logged_hours) VALUES
(1, 8, 70, 2), (1, 10, 50, 30), (1, 12, 20, 5),
(2, 8, 35, 19), (2, 10, 45, 25), (2, 12, 30, 12), (2, 7, 30, 8), (2, 9, 40, 10), (2, 11, 40, 12),
(3, 8, 80, 76), (3, 6, 60, 55), (3, 9, 50, 20), (3, 11, 45, 18), (3, 12, 35, 12),
(4, 7, 15, 14), (4, 10, 25, 8);

INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, deadline) VALUES
(1, 'Настроить роли доступа', 'RBAC для модулей CRM', 'todo', 'high', NULL, '2026-06-18'),
(1, 'Интеграция с 1С', 'API обмен данными', 'todo', 'medium', NULL, '2026-06-22'),
(1, 'Дизайн главной страницы', 'Макеты Figma', 'todo', 'low', 10, '2026-06-25'),
(1, 'Миграция БД', 'Скрипты миграции', 'todo', 'high', 8, '2026-06-20'),
(1, 'API авторизации', 'JWT + refresh tokens', 'in_progress', 'high', 8, '2026-06-16'),
(1, 'Канбан-доска', 'Drag and drop задач', 'in_progress', 'medium', 10, '2026-06-19'),
(1, 'Unit-тесты API', 'Покрытие 80%', 'in_progress', 'medium', 8, '2026-06-21'),
(1, 'Ревью UI компонентов', 'Code review', 'in_review', 'medium', 12, '2026-06-17'),
(1, 'Тестирование форм', 'QA регресс', 'in_review', 'low', 12, '2026-06-18'),
(1, 'Настройка CI/CD', 'GitHub Actions', 'done', 'medium', 8, '2026-06-10'),
(1, 'Инициализация репозитория', 'Monorepo setup', 'done', 'low', 8, '2026-06-05'),
(1, 'Документация API', 'Swagger', 'done', 'low', NULL, '2026-06-12');

INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, deadline) VALUES
(2, 'Сбор требований к push-уведомлениям', 'User stories и критерии приёмки', 'todo', 'high', 7, '2026-06-10'),
(2, 'Проектирование REST API v2', 'Контракты эндпоинтов для мобильного клиента', 'todo', 'medium', 9, '2026-06-12'),
(2, 'Экран профиля пользователя', 'Вёрстка и интеграция с API', 'in_progress', 'high', 11, '2026-06-08'),
(2, 'Smoke-тесты авторизации', 'Проверка login/logout на iOS и Android', 'in_progress', 'medium', 12, '2026-06-09'),
(2, 'Согласование user stories', 'Ревью бэклога с заказчиком', 'in_review', 'medium', 7, '2026-06-05'),
(2, 'Code review API платежей', 'Проверка интеграции с платёжным шлюзом', 'in_review', 'high', 9, '2026-06-07'),
(2, 'Навигация приложения', 'Tab bar и deep links', 'done', 'medium', 11, '2026-06-28'),
(2, 'Регресс основных сценариев', 'Чек-лист регресса релиза 0.9', 'done', 'low', 12, '2026-06-30');

INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, deadline) VALUES
(3, 'Матрица ролей и сценариев закупки', 'User stories и BPMN для B2B-заказов', 'todo', 'high', 6, '2026-06-15'),
(3, 'API каталога и прайс-листов', 'REST-эндпоинты для номенклатуры и цен', 'in_progress', 'high', 9, '2026-06-12'),
(3, 'Корзина и оформление заказа', 'UI checkout и интеграция с API', 'in_review', 'medium', 11, '2026-06-10'),
(3, 'Регресс оформления заказа', 'Smoke и регресс сценариев checkout', 'done', 'medium', 12, '2026-06-08');

INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, deadline) VALUES
(4, 'Сбор метрик KPI', 'Согласование показателей с заказчиком', 'todo', 'high', 7, '2026-06-18'),
(4, 'ETL-конвейер данных', 'Загрузка данных из CRM и ERP', 'in_progress', 'high', 7, '2026-06-14'),
(4, 'Виджеты главного экрана', 'Графики и таблицы дашборда', 'in_review', 'medium', 10, '2026-06-12'),
(4, 'Проверка расчётов отчётов', 'QA сверка агрегатов', 'done', 'medium', 12, '2026-06-09');

INSERT INTO project_members (project_id, user_id, allocated_hours, logged_hours) VALUES
(4, 12, 10, 4)
ON CONFLICT (project_id, user_id) DO NOTHING;

INSERT INTO task_time_entries (task_id, user_id, started_at, ended_at, minutes) VALUES
(21, 6, '2026-06-03 09:00:00+03', '2026-06-03 10:30:00+03', 90),
(22, 9, '2026-06-04 10:00:00+03', '2026-06-04 13:20:00+03', 200),
(23, 11, '2026-06-05 09:30:00+03', '2026-06-05 12:00:00+03', 150),
(24, 12, '2026-06-06 13:00:00+03', '2026-06-06 15:00:00+03', 120),
(25, 7, '2026-06-07 09:00:00+03', '2026-06-07 11:00:00+03', 120),
(26, 7, '2026-06-08 14:00:00+03', '2026-06-08 16:30:00+03', 150),
(27, 10, '2026-06-09 10:00:00+03', '2026-06-09 12:15:00+03', 135),
(28, 12, '2026-06-10 09:00:00+03', '2026-06-10 10:30:00+03', 90);

INSERT INTO task_comments (task_id, user_id, content) VALUES
(5, 3, 'Приоритет — завершить до демо заказчику.'),
(5, 8, 'Добавлен refresh token, осталось покрыть тестами.'),
(8, 12, 'Найдены мелкие замечания по отступам, исправлю сегодня.');
