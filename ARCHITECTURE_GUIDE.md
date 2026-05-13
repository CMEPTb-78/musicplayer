# Архитектура музыкального приложения - Структура файлов и связи

## 🏗️ Общая архитектура

Ваше приложение построено по принципу **клиент-серверной архитектуры** с четким разделением ответственности между файлами и модулями.

## 📁 Структура директорий

```
music-player/
├── client/                    # Фронтенд React приложение
│   ├── src/
│   │   ├── api.ts          # API функции и типы
│   │   ├── auth/            # Аутентификация
│   │   │   └── AuthContext.tsx
│   │   ├── components/       # Переиспользуемые компоненты
│   │   │   ├── PlaylistSelector.tsx
│   │   │   ├── TrackActionsMenu.tsx
│   │   │   └── *.css
│   │   ├── icons/           # Иконки приложения
│   │   │   └── FigIcons.tsx
│   │   ├── layout/          # Компоненты верстки
│   │   │   ├── MainLayout.tsx
│   │   │   ├── PlayerBar.tsx
│   │   │   ├── figma.css       # Основные стили
│   │   │   └── playlistToPlayerTracks.ts
│   │   ├── pages/           # Страницы приложения
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── PlaylistPage.tsx
│   │   │   ├── TrackPage.tsx
│   │   │   ├── RecentPage.tsx
│   │   │   ├── DiscoverPage.tsx
│   │   │   └── LoginPage.tsx
│   │   ├── player/          # Аудиоплеер
│   │   │   └── PlayerContext.tsx
│   │   ├── routing/         # Маршрутизация
│   │   │   └── PrivateOutlet.tsx
│   │   ├── utils/           # Вспомогательные функции
│   │   │   └── format.ts
│   │   ├── App.tsx          # Главный компонент приложения
│   │   ├── main.tsx         # Точка входа
│   │   └── vite-env.d.ts    # Типы Vite
│   └── package.json
└── server/                    # Бэкенд Node.js сервер
    ├── src/
    │   ├── routes/          # API эндпоинты
    │   │   ├── auth.ts          # Аутентификация
    │   │   ├── playlists.ts     # Управление плейлистами
    │   │   ├── tracks.ts        # Управление треками
    │   │   └── artists.ts       # Управление артистами
    │   ├── services/        # Бизнес-логика
    │   │   ├── registration.ts  # Регистрация пользователей
    │   │   └── *.ts
    │   ├── middleware/       # Middleware функции
    │   │   └── auth.ts          # JWT аутентификация
    │   ├── lib/             # Утилиты
    │   │   └── prisma.ts        # Prisma клиент
    │   └── index.ts          # Точка входа сервера
    ├── prisma/
    │   ├── schema.prisma   # Схема базы данных
    │   └── seed.ts          # Наполнение БД данными
    ├── package.json
    └── tsconfig.json
```

## 🔗 Связи между файлами

### 1. Точка входа приложения

#### Клиент: `client/src/main.tsx`
```typescript
// Инициализация React приложения и рендеринг
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

#### Сервер: `server/src/index.ts`
```typescript
// Запуск Express сервера
import app from './app.js';

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
});
```

### 2. Главный компонент приложения

#### `client/src/App.tsx`
```typescript
// Маршрутизация и аутентификация
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.tsx';
import AppShell from './AppShell.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<PrivateOutlet />}>
            {/* Защищенные маршруты */}
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### 3. Система аутентификации

#### `client/src/auth/AuthContext.tsx`
```typescript
// Глобальное состояние аутентификации
import { createContext, useContext, useState, useEffect } from 'react';
import { login, register, getToken } from '../api.ts';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getToken());
  
  const login = async (email, password) => {
    const response = await login(email, password);
    setUser(response.user);
    setToken(response.token);
  };
  
  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### `server/src/middleware/auth.ts`
```typescript
// JWT middleware для защиты маршрутов
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

### 4. API слой

#### `client/src/api.ts`
```typescript
// Все API функции и типы данных
export const login = async (email: string, password: string) => {
  return request<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    json: { email, password },
  });
};

export const fetchPlaylists = async () => {
  return request<PlaylistSummary[]>('/api/playlists');
};
```

#### `server/src/routes/auth.ts`
```typescript
// Обработка аутентификации
import { Router } from 'express';
import { registerUserWithStarterPlaylist } from '../services/registration.js';

router.post('/register', async (req, res) => {
  try {
    const user = await registerUserWithStarterPlaylist(req.body);
    const token = signToken({ sub: user.id, email: user.email });
    res.status(201).json({ token, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### 5. Управление состоянием (State Management)

#### `client/src/player/PlayerContext.tsx`
```typescript
// Глобальное состояние аудиоплеера
import { createContext, useContext, useReducer, useRef } from 'react';

export const PlayerProvider = ({ children }) => {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const playTrack = (track) => {
    audioRef.current.src = streamUrl(track.id);
    audioRef.current.play();
  };
  
  return (
    <PlayerContext.Provider value={{ ...state, playTrack, togglePlay }}>
      {children}
      <audio ref={audioRef} />
    </PlayerContext.Provider>
  );
};
```

### 6. Компоненты верстки

#### `client/src/layout/MainLayout.tsx`
```typescript
// Основная верстка приложения
import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';

export default function MainLayout() {
  const { user } = useAuth();
  
  return (
    <div className="fig-layout">
      <aside className="fig-col-left">
        {/* Навигация */}
      </aside>
      <main className="fig-main-panel">
        <Outlet />
      </main>
      <aside className="fig-col-right">
        {/* Библиотека */}
      </aside>
    </div>
  );
}
```

### 7. База данных

#### `server/prisma/schema.prisma`
```prisma
// Схема базы данных
model User {
  id           Int       @id @default(autoincrement())
  email        String    @unique
  passwordHash String
  displayName  String
  playlists    Playlist[]
  favorites    UserFavoriteArtist[]
}

model Playlist {
  id          Int             @id @default(autoincrement())
  name        String
  userId      Int
  user        User            @relation(fields: [userId], references: [id])
  tracks      PlaylistTrack[]
}

model Track {
  id          Int             @id @default(autoincrement())
  title       String
  artistId    Int
  artist      Artist          @relation(fields: [artistId], references: [id])
  playlists   PlaylistTrack[]
}
```

## 🔄 Поток данных (Data Flow)

### 1. Процесс аутентификации
```
Пользователь → LoginPage → AuthContext → API (/auth/login) → Server → JWT токен → AuthContext → App
```

### 2. Загрузка плейлистов
```
App → DashboardPage → API (/playlists) → Server → База данных → DashboardPage → MainLayout
```

### 3. Воспроизведение музыки
```
PlaylistPage → PlayerContext → API (/stream/:id) → Server → Аудиофайл → HTML5 Audio
```

### 4. Создание плейлиста
```
DashboardPage → API (/playlists) → Server → База данных → Обновление UI
```

## 🎯 Ключевые паттерны архитектуры

### 1. Разделение ответственности (Separation of Concerns)
- **API слой** - только общение с сервером
- **UI компоненты** - только отображение данных
- **Бизнес-логика** - изолирована в services
- **Аутентификация** - централизована в AuthContext

### 2. Dependency Injection
- **React Context** для глобального состояния
- **Custom hooks** для инкапсуляции логики
- **Middleware** для сквозной функциональности

### 3. Типизация
- **TypeScript** для строгой типизации
- **Общие типы** в `api.ts`
- **Пропсы компонентов** строго типизированы

### 4. Обработка ошибок
- **Глобальные ошибки** в Error Boundaries
- **API ошибки** с человекочитаемыми сообщениями
- **Валидация** на клиенте и сервере

## 🛡️ Безопасность архитектуры

### 1. Аутентификация
- **JWT токены** с истечением срока
- **bcrypt** для хеширования паролей
- **Защита маршрутов** через middleware

### 2. Валидация данных
- **Zod схемы** на сервере
- **HTML5 валидация** форм на клиенте
- **TypeScript** для compile-time проверки

### 3. Изоляция данных
- **Разделение плейлистов** по пользователям
- **Проверка прав доступа** к ресурсам
- **Безопасные запросы** к API

## 📈 Масштабирование

### Горизонтальное масштабирование
- **Добавление новых страниц** через маршрутизацию
- **Расширение API** новыми эндпоинтами
- **Компонентный подход** для переиспользования

### Вертикальное масштабирование
- **Микросервисная архитектура** (будущее)
- **Кэширование Redis** для производительности
- **CDN** для статических ресурсов

---

Эта архитектура обеспечивает:
✅ **Четкое разделение** ответственности
✅ **Легкость тестирования** каждого слоя
✅ **Масштабируемость** приложения
✅ **Безопасность** на всех уровнях
✅ **Поддерживаемость** кода
