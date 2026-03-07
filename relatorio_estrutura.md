# Estrutura de Arquivos - Agente Idiomas 2

Este documento detalha a organização de pastas e arquivos do projeto **Agente Idiomas 2**.

## Visão Geral da Árvore de Diretórios

```
agente_idiomas2/
├── app/                  # Camada de Aplicação (API)
│   ├── __init__.py
│   └── main.py           # Ponto de entrada da aplicação FastAPI
│
├── core/                 # Núcleo de Lógica de Negócios e Back-end
│   ├── core_open.py      # Lógica de processamento alternativa/antiga
│   ├── core_openai.py    # Lógica principal de interação com a OpenAI (LLM, STT, TTS)
│   ├── logger.py         # Configuração de Logs
│   ├── provider_base.py  # Classe base abstrata para provedores de IA
│   ├── provider_openai.py# Implementação do provedor OpenAI
│   └── store.py          # Camada de persistência de dados (SQLite)
│
├── web/                  # Camada de Frontend (Cliente Web)
│   ├── app.js            # Lógica do client-side (interação UI, Áudio, API)
│   ├── index.html        # Estrutura HTML da interface principal
│   ├── index_bk.html     # Backup do arquivo HTML original
│   └── style.css         # Estilos da interface
│
├── agent.db              # Banco de dados SQLite persistente (Sessões, mensagens, créditos)
├── .env                  # Arquivo de variáveis de ambiente (Chaves de API, Configurações - NÃO COMITAR)
├── requirements.txt      # Lista de dependências Python do projeto
├── relatorio_desenvolvimento.md # Relatório detalhado do desenvolvimento
├── relatorio_estrutura.md       # Este arquivo
│
└── [Arquivos de Teste]   # Scripts de validação e testes
    ├── test_api.py       # Testes gerais da API
    ├── test_api_audio.py # Testes específicos de endpoints de áudio
    ├── test_api_real.py  # Testes de integração real
    ├── test_auto_lang.py # Testes de detecção de idioma
    ├── test_backend_logic.py # Testes unitários da lógica de backend
    ├── test_credits.py   # Testes do sistema de créditos
    └── test_provider.py  # Testes isolados dos provedores de IA
```

## Descrição Detalhada dos Módulos

### 1. `app/`
Responsável pela interface HTTP da aplicação.
- **`main.py`**: Define a instância `FastAPI`, configura CORS e define as rotas da API (`/v1/message`, `/v1/stream`, etc.). Atua como orquestrador, recebendo requisições e delegando para o `core`.

### 2. `core/`
Contém toda a regra de negócio e integrações externas.
- **`store.py`**: Gerencia a conexão com o `agent.db`, realizando operações CRUD para sessões, mensagens e logs de uso.
- **`provider_openai.py`**: Encapsula as chamadas para a API da OpenAI (ChatCompletion, Audio Transcription, Audio Speech).
- **`core_openai.py`**: Controla o fluxo da conversa. Recebe a entrada do usuário, decide se usa o modo streaming, gerencia o histórico de mensagens e coordena a resposta (texto ou áudio).

### 3. `web/`
Frontend simples e desacoplado.
- **`app.js`**: Gerencia o estado da aplicação no navegador, incluindo a captura de áudio do microfone, detecção de silêncio (VAD) e renderização das mensagens e menus dinâmicos enviados pelo backend.

### 4. Raiz e Testes
- **`agent.db`**: Armazena o estado persistente. É criado automaticamente pelo `store.py` se não existir.
- **Testes**: Conjunto de scripts `test_*.py` para garantir a estabilidade das funcionalidades críticas (API, lógica de créditos, processamento de áudio).
