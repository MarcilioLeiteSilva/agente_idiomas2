#!/bin/bash
# Script de backup do PostgreSQL para Agente Idiomas

# Carrega DATABASE_URL do arquivo .env se existir
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Erro: DATABASE_URL não definida."
  exit 1
fi

BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo "Iniciando backup em $BACKUP_FILE..."

# Tenta fazer o backup usando pg_dump
# O pg_dump aceita a string de conexão diretamente
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup concluído com sucesso!"
  # Opcional: remover backups antigos (ex: manter últimos 7 dias)
  # find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
else
  echo "Erro ao realizar backup."
  exit 1
fi
