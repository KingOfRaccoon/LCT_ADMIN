#!/bin/bash

# 🚀 Скрипт быстрого деплоя BDUI Admin на /admin/panel
# Использование: ./deploy.sh [environment]
# Примеры:
#   ./deploy.sh production  # Деплой на продакшен
#   ./deploy.sh staging     # Деплой на staging

set -e  # Остановка при ошибке

ENVIRONMENT=${1:-production}
BUILD_DIR="dist"
ARCHIVE_NAME="bdui-admin-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).tar.gz"

echo "🔧 Начало деплоя для окружения: $ENVIRONMENT"

# 1. Очистка старых билдов
echo "🧹 Очистка старых билдов..."
rm -rf $BUILD_DIR node_modules/.vite

# 2. Production build
echo "📦 Создание production build..."
npm run build

if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Ошибка: Директория $BUILD_DIR не создана"
  exit 1
fi

# 3. Проверка путей в index.html
echo "🔍 Проверка путей в index.html..."
if grep -q '/admin/panel/' $BUILD_DIR/index.html; then
  echo "✅ Пути корректны"
else
  echo "❌ Ошибка: Пути не содержат /admin/panel/"
  echo "Содержимое index.html:"
  cat $BUILD_DIR/index.html
  exit 1
fi

# 4. Создание архива
echo "📦 Создание архива..."
cd $BUILD_DIR
tar -czf ../$ARCHIVE_NAME .
cd ..

echo "✅ Архив создан: $ARCHIVE_NAME"
echo "📊 Размер: $(du -h $ARCHIVE_NAME | cut -f1)"

# 5. Загрузка на сервер (раскомментируйте и настройте)
# echo "📤 Загрузка на сервер..."
# SERVER="user@sandkittens.me"
# REMOTE_PATH="/tmp/$ARCHIVE_NAME"
# 
# scp $ARCHIVE_NAME $SERVER:$REMOTE_PATH
# 
# echo "🔄 Развертывание на сервере..."
# ssh $SERVER << EOF
#   sudo mkdir -p /var/www/bdui-admin-backup
#   sudo cp -r /var/www/bdui-admin/* /var/www/bdui-admin-backup/ 2>/dev/null || true
#   sudo rm -rf /var/www/bdui-admin/*
#   sudo tar -xzf $REMOTE_PATH -C /var/www/bdui-admin/
#   sudo chown -R www-data:www-data /var/www/bdui-admin
#   sudo systemctl reload nginx
#   rm $REMOTE_PATH
# EOF
# 
# echo "✅ Деплой завершен!"

echo ""
echo "📋 Следующие шаги:"
echo "1. Загрузите $ARCHIVE_NAME на сервер:"
echo "   scp $ARCHIVE_NAME user@sandkittens.me:/tmp/"
echo ""
echo "2. Разверните на сервере:"
echo "   ssh user@sandkittens.me"
echo "   sudo tar -xzf /tmp/$ARCHIVE_NAME -C /var/www/bdui-admin/"
echo "   sudo systemctl reload nginx"
echo ""
echo "3. Проверьте: https://sandkittens.me/admin/panel"
echo ""
echo "📚 Полная инструкция: DEPLOYMENT_CHECKLIST.md"
