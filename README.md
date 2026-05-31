# ERP-система управления проектами

Веб-приложение для планирования и контроля проектной деятельности: ведение проектов и задач, распределение нагрузки между сотрудниками, учёт рабочего времени, аналитика на дашборде, канбан-доска и выгрузка отчётов в Excel.

## Требования

- **Node.js** 18+
- **npm**
- **Docker Desktop** (для PostgreSQL)

## Как запустить

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/shipilova-valeria/my-diplom.git
cd erp-system
```

### 2. Установите зависимости

```bash
npm run install:all
```

### 3. Создайте файл настроек backend

```bash
copy backend\.env.example backend\.env
```

### 4. Запустите базу данных

```bash
docker compose up -d
```
При первом запуске создаются таблицы и начальные данные из папки `database/`.

### 5. Запустите backend

В **первом** терминале:

```bash
cd backend
npm run dev
```
API будет доступен по адресу: http://localhost:3000

### 6. Запустите frontend

Во **втором** терминале (из корня проекта):

```bash
cd frontend
npm run dev
```
Откройте в браузере: http://localhost:5173

### 7. Вход в систему

Учётные записи заданы в `database/seed.sql`. Пароли — в `backend/src/config/userPasswords.js` и применяются при старте сервера.

Примеры для входа:

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | `admin@ilavista.by` | `password123` |
| Руководитель | `head@ilavista.by` | `volkovvvHead92` |
| Менеджер | `s.kuznetsov@ilavista.by` | `kuznetsov-851` |
| Участник | `j.antonova@ilavista.by` | `antonova:2024` |
