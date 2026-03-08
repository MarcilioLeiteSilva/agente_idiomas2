# Guia de Deploy - Agente Idiomas v13

Este guia descreve como realizar o deploy da aplicação em um servidor VPS usando **Easypanel**.

## 🚀 Estrutura do Projeto
- **Backend**: Python (FastAPI) rodando na porta `8000`.
- **Frontend**: Nginx (Estático/SPA) rodando na porta `80`.

## 📦 Deploy no Easypanel

### 1. Serviço de Backend
- **Tipo**: App
- **Repositório**: Seu repositório do GitHub
- **Build**:
  - **Context**: `/` (Raiz do repositório)
  - **Dockerfile Path**: `backend/Dockerfile`
- **Networking/Rede**:
  - **Internal Port**: `8000`
  - **Domain**: `api.seu-dominio.com` ou o gerado pelo Easypanel.
- **Variáveis de Ambiente**:
  - `OPENAI_API_KEY`: Sua chave da OpenAI.
  - `DB_PATH`: `/app/data/app.db`
  - `DATABASE_URL`: `sqlite:////app/data/app.db`
- **Volumes**:
  - Adicione um volume montando `/app/data` para persistência do banco de dados SQLite.

### 2. Serviço de Frontend
- **Tipo**: App
- **Repositório**: Seu repositório do GitHub
- **Build**:
  - **Context**: `/` (Raiz do repositório)
  - **Dockerfile Path**: `frontend/Dockerfile`
- **Networking/Rede**:
  - **Internal Port**: `80`
  - **Domain**: `app.seu-dominio.com` ou o gerado pelo Easypanel.

---

## 🛠️ Configurações Importantes

### Comunicação Frontend -> Backend
O arquivo `frontend/js/api.js` está configurado para buscar o backend automaticamente. 
- Se o frontend estiver em `xyz-frontend.gtalg3.easypanel.host`, ele buscará a API em `xyz-backend.gtalg3.easypanel.host`.
- Caso use domínios customizados, verifique a variável `PROD_API_URL` no arquivo `api.js`.

### CORS
O backend está configurado para aceitar requisições de qualquer origem (`allow_origins=["*"]`), garantindo que a comunicação entre subdomínios funcione sem bloqueios.

---

## ✅ Verificação do Deploy
Após o deploy, acesse:
- `https://seu-backend/health` -> Deve retornar `{"ok": true, "version": "v13.9"}`.
- `https://seu-frontend/` -> Deve carregar a interface do chat.
