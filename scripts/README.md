# Скрипты синхронизации

## Проблема

При разработке create-claude-agents мы улучшаем агентов в `templates/`, но используем старые версии в `.claude/`. Это приводит к тому что:

- ❌ Мы не тестируем улучшения на себе
- ❌ Разработка идёт без новых фичей (Context7, complexity scoring)
- ❌ "Сапожник без сапог"

## Решение: Автоматическая синхронизация

### Что делает скрипт `sync-local-agents.sh`

Копирует улучшенные агенты из `templates/` в локальную `.claude/`:

```
templates/.claude/skills/         → .claude/skills/
templates/.claude/agents/         → .claude/agents/
templates/.claude/commands/       → .claude/commands/
templates/docs/                   → docs/
templates/CLAUDE.md               → CLAUDE.md
```

### Использование

**Вручную:**
```bash
./scripts/sync-local-agents.sh
```

**Через npm:**
```bash
npm run sync:agents
```

**Автоматически при установке зависимостей:**
```bash
npm install  # Вызовет postinstall hook
```

### Что синхронизируется

**T001: Context7 Integration**
- ✅ `.claude/skills/validate-context7-availability/`
- ✅ `.claude/agents/health/workers/bug-hunter.md` (updated)
- ✅ `.claude/agents/health/workers/security-scanner.md` (updated)
- ✅ `.claude/agents/health/workers/dependency-auditor.md` (updated)
- ✅ `docs/Agents Ecosystem/CONTEXT7-INTEGRATION-GUIDE.md`
- ✅ `CLAUDE.md` (with PD-4)

**T002: Complexity Scoring**
- ✅ `.claude/skills/calculate-complexity-score/`
- ✅ `.claude/agents/health/workers/research-agent.md` (new)
- ✅ `.claude/agents/health/orchestrators/bug-orchestrator.md` (updated)

**T003+: Future enhancements**
- Будут автоматически синхронизироваться

### Workflow

1. **Разработка**: Создаём/обновляем агентов в `templates/`
2. **Коммит**: `git add templates/... && git commit -m "..."`
3. **Синхронизация**: `npm run sync:agents`
4. **Тестирование**: Используем улучшенных агентов локально
5. **Публикация**: `npm run push [patch|minor|major]`

### Безопасность

- Скрипт безопасен: использует `cp -rf` без удаления
- Новые файлы добавляются, существующие перезаписываются
- Нет риска потери данных (backups в .backup.* создавались раньше)

### Отключение автосинхронизации

Если не хотите автоматическую синхронизацию при `npm install`:

1. Откройте `package.json`
2. Удалите строку из `scripts`:
   ```json
   "postinstall": "./scripts/sync-local-agents.sh"
   ```

### FAQ

**Q: Почему не symlinks?**
A: Symlinks не работают кросс-платформенно и могут вызвать проблемы при публикации в npm.

**Q: Почему не копировать в обратную сторону (.claude/ → templates/)?**
A: `templates/` - это source of truth для генератора. `.claude/` - рабочая копия для разработки.

**Q: Что если я изменил файл в .claude/ вручную?**
A: Следующая синхронизация перезапишет изменения. Всегда редактируйте в `templates/`.

## Интеграция с CI/CD

Для автоматического тестирования:

```yaml
# .github/workflows/test.yml
- name: Sync agents
  run: npm run sync:agents

- name: Test with synced agents
  run: npm test
```
