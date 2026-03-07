# Guia de Deploy - Agente Idiomas v13

Este projeto está pronto para ser deployed usando **Docker**, **Easypanel** ou diretamente em uma **VPS**.

## 1. Requisitos
- Servidor com Docker e Docker Compose instalados.
- Domínio configurado (ex: `seudominio.com`).

## 2. Deploy via Docker Compose (VPS Pura)

1. Clone o repositório na sua VPS:
   ```bash
   git clone <url-do-seu-repo>
   cd agente-idiomas
   ```

2. Configure as variáveis de ambiente:
   ```bash
   cp .env.example backend/.env
   nano backend/.env # Adicione sua OPENAI_API_KEY
   ```

3. Suba os containers:
   ```bash
   docker compose up -d
   ```

A aplicação estará disponível na porta `8080` (proxy Nginx).

## 3. Deploy via Easypanel (Recomendado)

1. No Easypanel, crie um novo **Projeto**.
2. Adicione um serviço do tipo **App** para o Backend:
   - **Source**: GitHub
   - **Root Directory**: `backend`
   - **Environment Variables**: Adicione `OPENAI_API_KEY` e `DATABASE_URL=data/app.db`.
   - **Volume**: Adicione um volume de persistência para `/app/data`.
   - **Domain**: `api.seudominio.com`.

3. Adicione um serviço do tipo **App** para o Frontend:
   - **Source**: GitHub
   - **Root Directory**: `frontend`
   - **Domain**: `app.seudominio.com`.

## 4. Persistência de Dados
O banco de dados SQLite é armazenado em `data/app.db`. É CRÍTICO que a pasta `data` seja montada como um volume persistente no Docker para evitar perda de dados em novos deploys.

## 5. Próximos Passos
- Configurar SSL (Easypanel faz isso automaticamente).
- Migrar para PostgreSQL (alterando `DATABASE_URL` quando o suporte estiver pronto).
