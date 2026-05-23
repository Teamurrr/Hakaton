Ниже готовый полный README.md текст. Его можно вставить как есть.

# Hakaton Project

Небольшой fullstack-проект с frontend на React + Vite и backend на FastAPI.

## Стек

- Frontend: React, TypeScript, Vite
- Backend: FastAPI, Uvicorn
- Пакетный менеджер frontend: `npm`
- Пакетный менеджер backend: `pip`

## Структура проекта

```text
hakaton/
├─ backend/
│  ├─ main.py
│  └─ requirements.txt
├─ frontend/
│  ├─ package.json
│  ├─ package-lock.json
│  └─ src/
└─ .gitignore
Что нужно перед запуском
Убедитесь, что у вас установлены:

Python 3
Node.js
npm
git
Проверить можно так:

python --version
node --version
npm --version
git --version
Как скачать проект
git clone <ССЫЛКА_НА_РЕПОЗИТОРИЙ>
cd hakaton
Установка зависимостей
1. Backend
Перейдите в папку backend:

cd backend
Создайте виртуальное окружение:

python -m venv venv
Активируйте его в PowerShell:

.\venv\Scripts\Activate.ps1
Если PowerShell не дает активировать окружение, выполните:

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
И затем снова:

.\venv\Scripts\Activate.ps1
Установите зависимости:

pip install -r requirements.txt
2. Frontend
Откройте второй терминал и перейдите в папку frontend:

cd frontend
npm install
Запуск проекта
Для работы проекта нужно запустить backend и frontend в двух отдельных терминалах.

1. Запуск backend
Из папки backend:

.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
Если все успешно, в терминале появится что-то вроде:

Uvicorn running on http://127.0.0.1:8000
2. Запуск frontend
Из папки frontend:

npm run dev
Если все успешно, в терминале появится локальный адрес, обычно:

http://localhost:5173
Как проверить, что backend работает
После запуска backend откройте в браузере:

http://127.0.0.1:8000/
Ожидаемый ответ:

{"message":"Backend is working"}
Также можно открыть встроенную документацию FastAPI:

http://127.0.0.1:8000/docs
Если страница /docs открывается, значит backend работает нормально.

Как проверить, что frontend работает
После запуска frontend откройте в браузере:

http://localhost:5173
Вы должны увидеть страницу React/Vite с заголовком Get started и кнопкой:

Count is 0
Простая проверка фронта
Откройте страницу http://localhost:5173
Найдите кнопку Count is 0
Нажмите на нее
Убедитесь, что текст меняется на Count is 1, Count is 2 и так далее
Если кнопка увеличивает счетчик, значит frontend работает корректно.

Как проверить, что frontend и backend готовы к разработке
Сейчас frontend и backend запускаются отдельно.

Минимальная проверка:

frontend открывается на http://localhost:5173
backend отвечает на http://127.0.0.1:8000/
backend docs открываются на http://127.0.0.1:8000/docs
Если все три пункта выполняются, проект поднят правильно.

Частые проблемы
Ошибка Import "fastapi" could not be resolved
Причина:
fastapi не установлен в активном виртуальном окружении или VS Code выбрал не тот Python interpreter.

Решение:

Убедитесь, что зависимости backend установлены:
pip install -r requirements.txt
В VS Code выберите правильный интерпретатор:
Ctrl+Shift+P
Python: Select Interpreter
выберите:
backend\venv\Scripts\python.exe
Ошибка npm не найден
Причина:
не установлен Node.js.

Решение:
установите Node.js, затем проверьте:

node --version
npm --version
Не активируется venv
Если PowerShell блокирует выполнение скриптов:

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
После этого снова выполните:

.\venv\Scripts\Activate.ps1
Полезные команды
Backend
Установка зависимостей:

pip install -r requirements.txt
Запуск сервера:

uvicorn main:app --reload
Frontend
Установка зависимостей:

npm install
Запуск dev-сервера:

npm run dev
Сборка проекта:

npm run build
Что не нужно коммитить в git
В репозиторий не добавляются:

venv
.venv
node_modules
__pycache__
.env
Это нормально. Каждый разработчик устанавливает зависимости у себя локально через:

pip install -r backend/requirements.txt
npm install в папке frontend
Краткий сценарий запуска
Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
Frontend
cd frontend
npm install
npm run dev
Проверка
Backend: http://127.0.0.1:8000/
Backend docs: http://127.0.0.1:8000/docs
Frontend: http://localhost:5173
