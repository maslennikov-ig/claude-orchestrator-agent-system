#!/bin/bash
# sync-local-agents.sh
# Синхронизирует улучшенные агенты из templates/ в локальную .claude/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Синхронизация агентов templates/ → .claude/ ==="
echo ""

# Проверка наличия директорий
if [ ! -d "$PROJECT_ROOT/templates/.claude" ]; then
    echo "❌ Ошибка: templates/.claude не существует"
    exit 1
fi

# Функция для синхронизации содержимого (не перезаписывает директорию)
sync_contents() {
    local source=$1
    local target=$2
    local name=$3

    if [ -d "$source" ]; then
        echo "📦 Синхронизация: $name"

        # Создаём целевую директорию если не существует
        mkdir -p "$target"

        # Копируем содержимое с перезаписью
        cp -rf "$source"/* "$target/"
        echo "   ✅ Готово: $(ls -1 "$source" | wc -l) файлов"
    else
        echo "⚠️  Пропуск: $name (не существует)"
    fi
}

# Синхронизируем навыки
echo ""
echo "--- Навыки ---"
sync_contents \
    "$PROJECT_ROOT/templates/.claude/skills" \
    "$PROJECT_ROOT/.claude/skills" \
    "Skills"

# Синхронизируем агентов
echo ""
echo "--- Агенты ---"
sync_contents \
    "$PROJECT_ROOT/templates/.claude/agents" \
    "$PROJECT_ROOT/.claude/agents" \
    "Agents"

# Синхронизируем команды
echo ""
echo "--- Команды ---"
sync_contents \
    "$PROJECT_ROOT/templates/.claude/commands" \
    "$PROJECT_ROOT/.claude/commands" \
    "Commands"

# Синхронизируем скрипты
echo ""
echo "--- Скрипты ---"
sync_contents \
    "$PROJECT_ROOT/templates/.claude/scripts" \
    "$PROJECT_ROOT/.claude/scripts" \
    "Scripts"

# Синхронизируем документацию
echo ""
echo "--- Документация ---"
if [ -d "$PROJECT_ROOT/templates/docs" ]; then
    mkdir -p "$PROJECT_ROOT/docs"
    cp -rf "$PROJECT_ROOT/templates/docs"/* "$PROJECT_ROOT/docs/"
    echo "📦 Синхронизация: Documentation"
    echo "   ✅ Готово"
fi

# NOTE: НЕ синхронизируем CLAUDE.md из templates/
# Корневой CLAUDE.md - это отдельный файл для разработки генератора
# templates/CLAUDE.md - это Behavioral OS для агентов (копируется в проекты пользователей)

echo ""
echo "=== ✅ Синхронизация завершена! ==="
echo ""
echo "Что синхронизировано:"
echo "  ✅ Навыки → .claude/skills/"
echo "  ✅ Агенты → .claude/agents/"
echo "  ✅ Команды → .claude/commands/"
echo "  ✅ Скрипты → .claude/scripts/"
echo "  ✅ Документация → docs/"
echo ""
echo "Теперь текущий проект использует улучшенные агенты из templates/!"
