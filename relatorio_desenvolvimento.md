# Relatório de Desenvolvimento - Agente Idiomas 2

## 1. Visão Geral
O projeto **Agente Idiomas 2** consiste em um assistente conversacional inteligente focado em interação natural por voz e texto, com suporte a múltiplos idiomas (Português, Inglês, Francês). O sistema utiliza uma arquitetura moderna com backend em Python (FastAPI) e frontend leve em Vanilla JS, integrando-se à API da OpenAI para recursos de LLM, Transcrição (STT) e Síntese de Voz (TTS).

## 2. Escopo Final
O sistema entrega um agente capaz de:
- Manter conversas fluidas em múltiplos idiomas.
- Alternar dinamicamente entre modos de interação (Texto vs. Áudio).
- Detectar voz do usuário e silêncio automaticamente (VAD) para uma experiência "hands-free".
- Gerenciar memória de longo prazo através de resumos automáticos.
- Monitorar uso e custos via sistema de créditos e logs.

## 3. Implementações Realizadas

### 3.1 Backend (App Core)
- **Framework**: `FastAPI` servindo endpoints REST e Streaming (SSE).
- **Endpoints Principais**:
  - `POST /v1/message`: Processamento síncrono de mensagens.
  - `POST /v1/stream`: Streaming de resposta (Server-Sent Events) para baixa latência.
  - `POST /v1/settings`: Gerenciamento de preferências de sessão.
  - `GET /v1/credits`: Consulta de saldo de créditos.

### 3.2 Inteligência Artificial (Core AI)
- **Integração OpenAI**:
  - **LLM**: `gpt-4o-mini` para geração de texto com prompts de sistema otimizados para concisão.
  - **STT (Speech-to-Text)**: `whisper-1` para transcrição de áudio do usuário.
  - **TTS (Text-to-Speech)**: `tts-1` para geração de voz do agente.
- **Streaming de Áudio Inteligente**: Implementação de buffer de sentenças para gerar e tocar áudio enquanto o texto ainda está sendo gerado, reduzindo drasticamente a latência percebida.
- **Detecção de Idioma**: Combinação de detecção via Regex (palavras-chave) e preferência explícita do usuário.

### 3.3 Gestão de Dados (Store)
- **Banco de Dados**: SQLite (`agent.db`).
- **Tabelas Implementadas**:
  - `sessions`: Persistência de configurações (idioma, modo de saída).
  - `messages`: Histórico completo de chat.
  - `summaries`: Resumos compactados da conversa (atualizados a cada 20 mensagens) para manter contexto sem estourar janelas de token.
  - `credits` & `usage_logs`: Sistema de contabilidade de tokens e custos por interação.

### 3.4 Frontend (Web Client)
- **Tecnologias**: HTML5, CSS3, Vanilla JavaScript (sem frameworks pesados).
- **Interface**:
  - Abas separadas para interações de Texto e Áudio.
  - **Menu Dinâmico**: O backend pode renderizar menus de opções (ex: escolha de idioma) diretamente no chat.
- **Áudio Avançado**:
  - **Voice Activity Detection (VAD)**: Algoritmo no frontend que detecta silêncio para encerrar a gravação automaticamente, simulando uma conversa natural.
  - Visualização de onda sonora em tempo real.
  - Player de áudio com fila de reprodução para chunks recebidos via stream.

### 3.5 Qualidade e Testes
- **Testes Unitários**: Cobertura de testes para a lógica de backend (`test_backend_logic.py`), provedores (`test_provider.py`) e componentes de API.

## 4. Próximos Passos Sugeridos (Futuro)
- Implementação de autenticação de usuários (atualmente baseado em `session_id`).
- Integração de gateway de pagamento para recarga de créditos.
- Expansão para mais idiomas e personas de voz.
