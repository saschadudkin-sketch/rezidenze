# 🔥 Подключение Firebase — пошаговая инструкция

## Этап 1: Настройка Firebase Console

### 1.1 Firestore Database

1. Откройте [Firebase Console](https://console.firebase.google.com) → ваш проект
2. **Build → Firestore Database → Create database**
3. Выберите **Start in production mode**
4. Регион: `europe-west1` (ближайший к Москве)
5. Нажмите **Enable**

### 1.2 Authentication (SMS)

1. **Build → Authentication → Get started**
2. Вкладка **Sign-in method** → включите **Phone**
3. Добавьте тестовые номера (для разработки):
   - **Settings → Phone numbers for testing**
   - Например: `+7 916 123-45-67` → код `123456`
   - Это позволит логиниться без реальных SMS

### 1.3 Storage (для фото и аватарок)

1. **Build → Storage → Get started**
2. Выберите **Start in production mode**
3. Регион: тот же `europe-west1`

### 1.4 Получить ключи

1. **Project Settings** (⚙️ шестерёнка) → **General**
2. Прокрутите вниз до **Your apps** → **Web app** (кнопка `</>`)
3. Зарегистрируйте приложение (имя: `residenze-web`)
4. Скопируйте конфигурацию:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Этап 2: Настройка проекта

### 2.1 Установить Firebase SDK

```bash
cd residenze_v5
npm install firebase
```

### 2.2 Создать файл `.env.local`

Скопируйте `.env.example` → `.env.local` и заполните ключами из п.1.4:

```env
REACT_APP_FB_API_KEY=AIza...
REACT_APP_FB_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FB_PROJECT_ID=your-project
REACT_APP_FB_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FB_MESSAGING_ID=123456789
REACT_APP_FB_APP_ID=1:123456789:web:abc123
```

⚠️ `.env.local` добавлен в `.gitignore` — ключи не попадут в git.

### 2.3 Включить live-режим

В файле `src/config/features.js` поменяйте:

```javascript
export const FEATURES = {
  FIREBASE_LIVE: true,  // ← было false
};
```

---

## Этап 3: Firestore — создать коллекции

### 3.1 Структура базы данных

В Firestore Console создайте коллекции (или они создадутся автоматически при первом использовании):

```
users/{uid}
  ├── name: "Михаил Волков"
  ├── phone: "+79161234567"
  ├── role: "owner"         // owner | tenant | contractor | concierge | security | admin
  ├── apartment: "12"
  └── avatar: null

requests/{auto-id}
  ├── type: "pass"          // pass | tech
  ├── category: "guest"     // guest | courier | taxi | car | worker | master | team | electrician | plumber
  ├── status: "pending"     // pending | approved | rejected | accepted | arrived | scheduled
  ├── createdByUid: "..."
  ├── createdByRole: "owner"
  ├── createdByName: "Михаил Волков"
  ├── createdByApt: "12"
  ├── visitorName: "Иван Петров"
  ├── visitorPhone: "+79161111111"
  ├── carPlate: null
  ├── comment: ""
  ├── priority: "normal"
  ├── passDuration: "once"  // once | temporary | permanent
  ├── validUntil: null      // Timestamp
  ├── photo: null            // URL из Storage
  ├── createdAt: Timestamp
  ├── arrivedAt: null        // Timestamp
  └── scheduledFor: null     // Timestamp

chat/{auto-id}
  ├── uid: "..."
  ├── name: "Михаил Волков"
  ├── role: "owner"
  ├── text: "Привет"
  ├── photo: null
  ├── replyTo: null         // { id, name, text }
  ├── reactions: {}         // { "👍": ["uid1", "uid2"] }
  ├── edited: false
  └── at: Timestamp

perms/{uid}
  ├── visitors: [{ name, phone, carPlate }]
  └── workers: [{ name, phone, carPlate }]

templates/{uid}
  └── items: [{ id, name, type, category, ... }]

blacklist/{auto-id}
  ├── name: "Петров Сергей"
  ├── carPlate: "X666XX77"
  ├── reason: "Нарушение порядка"
  ├── addedBy: "Игорь Смирнов"
  └── addedAt: Timestamp
```

### 3.2 Правила безопасности Firestore

В **Firestore → Rules** вставьте:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Пользователи — читать могут все аутентифицированные, писать только admin
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        (request.auth.uid == uid || isAdmin());
    }

    // Заявки — читать все, создавать аутентифицированные, менять статус — staff
    match /requests/{reqId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && isStaff();
      allow delete: if request.auth != null && isAdmin();
    }

    // Чат — все аутентифицированные
    match /chat/{msgId} {
      allow read, create: if request.auth != null;
      allow update: if request.auth != null &&
        request.auth.uid == resource.data.uid;
      allow delete: if request.auth != null &&
        (request.auth.uid == resource.data.uid || isAdmin());
    }

    // Перм-списки — владелец + admin
    match /perms/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        (request.auth.uid == uid || isAdmin());
    }

    // Шаблоны — только владелец
    match /templates/{uid} {
      allow read, write: if request.auth != null &&
        request.auth.uid == uid;
    }

    // Чёрный список — staff + admin
    match /blacklist/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && isStaff();
    }

    // Хелперы
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    function isStaff() {
      let role = get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
      return role == 'admin' || role == 'security' || role == 'concierge';
    }
  }
}
```

### 3.3 Правила Storage

В **Storage → Rules**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        request.auth.uid == uid &&
        request.resource.size < 2 * 1024 * 1024;
    }
    match /requests/{reqId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

---

## Этап 4: Начальные данные

### 4.1 Создать первого пользователя (admin)

В Firestore Console → коллекция `users` → Add document:

- **Document ID**: (оставьте auto)
- Поля:

| Поле | Тип | Значение |
|------|-----|----------|
| name | string | Ваше Имя |
| phone | string | +7XXXXXXXXXX |
| role | string | admin |
| apartment | string | — |

⚠️ Document ID должен совпадать с UID из Firebase Auth. Сначала зарегистрируйте номер через приложение, затем найдите UID в Authentication → Users.

### 4.2 Создать остальных пользователей

Повторите для каждой роли:
- Собственник (role: `owner`, apartment: `12`)
- Охрана (role: `security`, apartment: `—`)
- Консьерж (role: `concierge`, apartment: `—`)

---

## Этап 5: Деплой

### Вариант A: Firebase Hosting (рекомендуется)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Public directory: build
# Single-page app: Yes
# Overwrite build/index.html: No

npm run build
firebase deploy
```

### Вариант B: Vercel

```bash
npm i -g vercel
npm run build
cd build
vercel
```

### Вариант C: Netlify

1. Перетащите папку `build/` на [app.netlify.com](https://app.netlify.com)
2. Или подключите GitHub репозиторий

⚠️ Для QR-камеры обязателен **HTTPS** — все три варианта дают его бесплатно.

---

## Чеклист готовности

- [ ] Firebase проект создан
- [ ] Firestore включён
- [ ] Auth с Phone включён
- [ ] Storage включён
- [ ] `.env.local` заполнен ключами
- [ ] `FIREBASE_LIVE: true`
- [ ] `npm install firebase`
- [ ] Firestore Rules настроены
- [ ] Storage Rules настроены
- [ ] Первый пользователь (admin) создан
- [ ] Деплой на HTTPS-хостинг
- [ ] Тестовый вход работает
