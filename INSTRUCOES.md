# 🚀 Instruções Rápidas - Disparador WhatsApp

## ✅ Status Atual
- ✅ Backend (servidor) rodando na porta 3001
- ✅ Frontend (interface) rodando na porta 5173
- ✅ Erro "process is not defined" RESOLVIDO
- ✅ Erro "Failed to fetch" RESOLVIDO
- ✅ Validação de números implementada
- ✅ Verificação de números no WhatsApp
- ✅ Tratamento automático de números

## 🌐 Acesse o Aplicativo
Abra seu navegador e acesse: **http://localhost:5173**

## 📱 Como Conectar o WhatsApp

### 1. **Aguarde o QR Code**
- O backend está gerando automaticamente o QR Code
- Se não aparecer, clique em "Ver QR Code"

### 2. **Escaneie com seu WhatsApp**
- Abra o WhatsApp no seu celular
- Vá em **Configurações** (⚙️)
- Clique em **Dispositivos Vinculados**
- Clique em **Vincular um Dispositivo**
- Escaneie o QR Code que aparece na tela

### 3. **Aguarde a Conexão**
- O status mudará de "Desconectado" para "Conectado"
- O QR Code desaparecerá quando conectado

## 📄 Como Usar o CSV

### 1. **Importar Contatos**
- Clique em "Escolher Arquivo CSV"
- Selecione o arquivo `teste-numeros.csv` (novo arquivo de teste)
- Os contatos aparecerão na lista

### 2. **Validar Números (NOVO!)**
- Clique em "Validar Números" para verificar se os números são válidos
- O sistema verificará e tratará automaticamente:
  - Se o número existe
  - Se está registrado no WhatsApp
  - Se não é duplicado
  - Se tem formato correto

### 3. **Digitar Mensagem**
- Use `{nome_cliente}` para personalizar
- Exemplo: "Olá {nome_cliente}, tudo bem?"

### 4. **Enviar**
- Clique em "Enviar para X contato(s)"
- Acompanhe o status na tabela

## 🔍 Tratamento Automático de Números

### **Processo de Formatação:**
1. **Remove caracteres especiais**: `(67) 98156-6794` → `67981566794`
2. **Adiciona DDD 67**: `981566794` → `67981566794`
3. **Remove 9 inicial**: `679981566794` → `67981566794`
4. **Adiciona código do Brasil**: `67981566794` → `5567981566794@c.us`

### **Exemplos de Tratamento:**
- `981566794` → ✅ `5567981566794@c.us` (adiciona 67)
- `679981566794` → ✅ `5567981566794@c.us` (remove 9)
- `67981566794` → ✅ `5567981566794@c.us` (formato correto)
- `123` → ❌ Muito curto (menos de 8 dígitos)
- `33055669` → ❌ Começa com 3 (inválido)

## 🎨 Interface Melhorada

### **Novos Elementos:**
- **Botão "Validar Números"**: Verifica todos os contatos
- **Resultados de Validação**: Mostra total, válidos e inválidos
- **Coluna "Validação"**: Status de cada número na tabela
- **Números Inválidos**: Lista expansível com detalhes
- **Chips de Status**: Verde (válido) / Vermelho (inválido)

### **Feedback Visual:**
- ✅ **Verde**: Número válido e pronto para envio
- ❌ **Vermelho**: Número inválido com motivo
- ⚠️ **Amarelo**: Enviando...
- 🔄 **Azul**: Pendente

## 🔧 Se Houver Problemas

### Erro "Failed to fetch"
- Certifique-se de que executou `npm start` (não apenas `npm run dev`)
- Verifique se ambos os servidores estão rodando:
  - Backend: porta 3001
  - Frontend: porta 5173

### QR Code não aparece
- Clique em "Atualizar" no painel de status
- Aguarde alguns segundos
- Clique em "Ver QR Code"

### WhatsApp não conecta
- Verifique se o WhatsApp Web está funcionando
- Tente desconectar e reconectar
- Reinicie o aplicativo se necessário

### Validação não funciona
- Certifique-se de que o WhatsApp está conectado
- Verifique se os números estão no formato correto
- Aguarde a verificação completa

## 📊 Exemplo de Uso Completo

1. **Conectar WhatsApp** (escaneie QR Code)
2. **Importar CSV** (selecione `teste-numeros.csv`)
3. **Validar Números** (clique no botão)
4. **Verificar Resultados** (veja números inválidos)
5. **Digitar Mensagem** (use {nome_cliente})
6. **Enviar** (apenas números válidos serão enviados)

## 📞 Suporte
Se ainda houver problemas, verifique:
1. Se o Node.js está atualizado
2. Se todas as dependências foram instaladas
3. Se não há outros processos usando as portas 3001 ou 5173
4. Se o WhatsApp está conectado para validação

---
**✅ Projeto funcionando com tratamento automático de números!** 