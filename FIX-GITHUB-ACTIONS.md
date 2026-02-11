# 🔧 Исправление ошибки GitHub Actions

## Проблема
```
remote: Permission to samwerner123/kursarium.git denied to github-actions[bot].
fatal: unable to access 'https://github.com/samwerner123/kursarium/': The requested URL returned error: 403
```

GitHub Actions не может автоматически пушить обновления курсов.

---

## ✅ Решение (2 минуты)

### Шаг 1: Включи права для Workflow

1. Открой: https://github.com/samwerner123/kursarium/settings/actions

2. Прокрути страницу вниз до раздела **"Workflow permissions"**

3. Выбери:
   - ✅ **Read and write permissions** (вместо Read repository contents)

4. Поставь галочку:
   - ✅ **Allow GitHub Actions to create and approve pull requests**

5. Нажми **Save**

---

### Шаг 2: Перезапусти Workflow

1. Открой: https://github.com/samwerner123/kursarium/actions

2. Найди провалившийся workflow **"Auto Update Course Feeds"**

3. Нажми **Re-run jobs** → **Re-run all jobs**

4. Дождись завершения (~30 секунд)

5. ✅ Должно быть зелёная галочка!

---

## 🎉 Готово!

После этого автообновление будет работать каждые 6 часов без ошибок!

Проверить можно здесь:
https://github.com/samwerner123/kursarium/actions
