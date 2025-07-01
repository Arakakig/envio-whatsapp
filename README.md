# Disparador de Mensagens WhatsApp

Um aplicativo web para enviar mensagens em massa para múltiplos números do WhatsApp usando a biblioteca `whatsapp-web.js` e interface Material-UI.

## 🚀 Funcionalidades

- **Conexão WhatsApp**: Conecte-se ao WhatsApp via QR Code
- **Envio em Massa**: Envie mensagens para múltiplos números simultaneamente
- **Interface Moderna**: Interface responsiva com Material-UI
- **Tabela de Contatos**: Visualize e gerencie seus contatos em uma tabela interativa
- **Status de Envio**: Acompanhe o status de cada mensagem enviada
- **Envio Individual**: Envie mensagens para contatos específicos
- **Modal QR Code**: Interface para escanear o QR Code do WhatsApp
- **Importação CSV**: Importe contatos de arquivo CSV
- **Personalização**: Use `{nome_cliente}` para personalizar mensagens

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- NPM ou Yarn
- Navegador moderno
- WhatsApp Web funcionando

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd envio-whatsapp
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o projeto (frontend + backend):
```bash
npm start
```

4. Abra o navegador em `http://localhost:5174`

## 📱 Como Usar

### 1. Conectar ao WhatsApp
- O backend iniciará automaticamente e tentará conectar ao WhatsApp
- Se não estiver conectado, clique em "Ver QR Code" para abrir o modal
- Escaneie o QR Code com seu WhatsApp (WhatsApp > Dispositivos Vinculados > Vincular um Dispositivo)
- Aguarde a confirmação de conexão

### 2. Configurar Mensagem
- Digite sua mensagem no campo "Mensagem"
- Use `{nome_cliente}` para personalizar a mensagem com o nome da pessoa
- Exemplo: "Olá {nome_cliente}, tudo bem?" será enviado como "Olá Guilherme Arakaki, tudo bem?"

### 3. Importar Contatos

#### Opção A: Importar CSV
- Clique em "Escolher Arquivo CSV"
- Selecione um arquivo no formato: `Nome, Telefone`
- Exemplo de conteúdo:
```
Guilherme Arakaki,67981566794
Gabriela Arakaki,67981803862
```

#### Opção B: Adicionar Manualmente
- Digite o número de telefone no formato: `5511999999999` (código do país + DDD + número)
- Clique em "Adicionar" para incluir na lista

### 4. Enviar Mensagens
- **Envio em Massa**: Clique em "Enviar para X contato(s)" para enviar para todos
- **Envio Individual**: Use a tabela de contatos para enviar mensagens individuais
- Acompanhe o status de cada envio na tabela

## 🎨 Tecnologias Utilizadas

- **React 19**: Framework JavaScript para interface
- **Material-UI**: Biblioteca de componentes React
- **whatsapp-web.js**: Biblioteca para integração com WhatsApp
- **Express.js**: Servidor backend
- **Vite**: Build tool e dev server
- **QRCode**: Geração de QR Codes
- **PapaParse**: Processamento de arquivos CSV

## 📊 Estrutura do Projeto

```
envio-whatsapp/
├── src/
│   ├── App.jsx          # Componente principal (frontend)
│   ├── main.jsx         # Ponto de entrada
│   ├── index.css        # Estilos globais
│   └── assets/          # Recursos estáticos
├── server.js            # Servidor backend
├── public/              # Arquivos públicos
├── package.json         # Dependências
├── exemplo-contatos.csv # Arquivo CSV de exemplo
└── README.md           # Documentação
```

## 🔧 Scripts Disponíveis

- `npm start`: Executa frontend e backend simultaneamente
- `npm run dev`: Executa apenas o frontend
- `npm run server`: Executa apenas o backend
- `npm run build`: Gera build de produção

## ⚠️ Importante

- **Uso Responsável**: Use este aplicativo de forma responsável e respeitando as políticas do WhatsApp
- **Limitações**: O WhatsApp pode limitar envios em massa para evitar spam
- **Autenticação**: Mantenha seu WhatsApp conectado para que o aplicativo funcione
- **Números Válidos**: Certifique-se de que os números estão no formato correto e são válidos
- **Backend Necessário**: O aplicativo precisa do servidor backend rodando para funcionar

## 🔧 Configurações Avançadas

### Variáveis de Ambiente
Você pode configurar variáveis de ambiente para personalizar o comportamento:

```env
PORT=3001
WHATSAPP_SESSION_PATH=./session
WHATSAPP_HEADLESS=true
```

### Personalização do Tema
O tema pode ser personalizado editando o arquivo `src/main.jsx`:

```javascript
const theme = createTheme({
  palette: {
    primary: {
      main: '#25D366', // Cor personalizada
    },
    // ... outras configurações
  },
})
```

## 🐛 Solução de Problemas

### Erro de Conexão
- Verifique se o servidor backend está rodando na porta 3001
- Verifique se o WhatsApp Web está funcionando
- Tente desconectar e reconectar o dispositivo
- Limpe o cache do navegador

### Erro de Envio
- Verifique se o número está no formato correto
- Certifique-se de que o número existe no WhatsApp
- Aguarde alguns segundos entre envios

### Problemas de Performance
- Reduza o número de contatos por envio
- Feche outras abas do navegador
- Reinicie o aplicativo se necessário

### Erro "process is not defined"
- Certifique-se de que está executando `npm start` (não apenas `npm run dev`)
- O backend é necessário para o funcionamento correto

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um fork do projeto
2. Criar uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abrir um Pull Request

## 📞 Suporte

Se você encontrar algum problema ou tiver dúvidas, abra uma issue no repositório.

---

**Desenvolvido com ❤️ usando React, Material-UI e Express.js**
