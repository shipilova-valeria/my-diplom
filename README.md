## Данные об авторе
<br> Шипилова Валерия Дмитриевна
<br> shipilova_vd_22
<br> 4 курс, 8 семестр
<br> Управление информационными ресурсами

Дипломная работа

# ERP-система управления проектами

Веб-приложение для планирования и контроля проектной деятельности: ведение проектов и задач, распределение нагрузки между сотрудниками, учёт рабочего времени, аналитика на дашборде, канбан-доска и выгрузка отчётов в Excel.

## Требования

- **Node.js** 18+
- **npm**
- **Docker Desktop** (для PostgreSQL)

## Как запустить

### 1. Запустите Docker Desktop
Установите **Docker Desktop** (нужен только для PostgreSQL) и запустите его (статус *Running*).  
Скачать: https://docs.docker.com/desktop/setup/install/windows-install/

Проект в Docker вручную добавлять **не нужно** — достаточно команд из этой инструкции.

### 2. Клонируйте репозиторий

```bash
git clone https://github.com/shipilova-valeria/my-diplom.git
cd my-diplom
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

Из папки проекта (`my-diplom`):

```bash
docker compose up -d
```

Если ошибка `container name "erp-postgres" is already in use` — контейнер уже создан. Выполните `docker ps`: если PostgreSQL уже **Up**, этот шаг можно пропустить.

При первом запуске создаются таблицы и начальные данные из папки `database/`.

### 5. Запустите backend

В **первом** терминале:

```bash
cd backend
npm run dev
```
API будет доступен по адресу: http://localhost:3000

### 6. Запустите frontend

Backend должен продолжать работать в первом терминале. Откройте **второе** окно командной строки (PowerShell или cmd), перейдите в папку проекта и запустите frontend:

```bash
cd my-diplom
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
| Менеджер | `e.smirnova@ilavista.by` | `smirnovaEl99` |
| Участник | `a.petrov@ilavista.by` | `p3tr0v#1` |
