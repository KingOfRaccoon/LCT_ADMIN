# ⚡ Быстрая смена API URL

## Откройте этот файл:

```
src/config/api.js
```

## Измените строку 18:

```javascript
export const BASE_URL = 'https://sandkittens.me';
```

## Варианты:

```javascript
// Production
export const BASE_URL = 'https://sandkittens.me';

// Localhost
export const BASE_URL = 'http://localhost:8000';

// Staging
export const BASE_URL = 'https://staging.example.com';
```

## Сохраните файл и перезапустите:

```bash
npm run dev
```

Готово! 🎉

---

Подробнее: [docs/API_CONFIG_GUIDE.md](./API_CONFIG_GUIDE.md)
