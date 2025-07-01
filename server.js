import express from 'express';
import cors from 'cors';
import pkg from 'whatsapp-web.js';
const { Client, MessageMedia, LocalAuth } = pkg;
import qrcode from 'qrcode';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const PORT = 3001;

// Configuração do __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'), false);
    }
  }
});

// Criar pasta uploads se não existir
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Variáveis globais para múltiplas sessões do WhatsApp
let sessions = new Map(); // Map para armazenar múltiplas sessões
let currentSessionId = null; // Sessão ativa atual

// Criar nova sessão do WhatsApp
const createWhatsAppSession = async (sessionId, sessionName) => {
  try {
    console.log(`Criando nova sessão: ${sessionId} - ${sessionName}`);
    
    const client = new Client({
      authStrategy: new LocalAuth({ 
        clientId: sessionId,
        dataPath: `./.wwebjs_auth/${sessionId}`
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });

    const session = {
      id: sessionId,
      name: sessionName,
      client: client,
      qrCode: null,
      isConnected: false,
      isInitializing: true
    };

    client.on('qr', async (qr) => {
      try {
        session.qrCode = await qrcode.toDataURL(qr);
        console.log(`QR Code gerado para sessão: ${sessionName}`);
      } catch (err) {
        console.error(`Erro ao gerar QR Code para sessão ${sessionName}:`, err);
      }
    });

    client.on('ready', () => {
      session.isConnected = true;
      session.qrCode = null;
      session.isInitializing = false;
      console.log(`WhatsApp conectado na sessão: ${sessionName}`);
    });

    client.on('disconnected', () => {
      session.isConnected = false;
      session.isInitializing = false;
      console.log(`WhatsApp desconectado na sessão: ${sessionName}`);
    });

    client.on('auth_failure', () => {
      session.isInitializing = false;
      console.log(`Falha na autenticação do WhatsApp na sessão: ${sessionName}`);
    });

    await client.initialize();
    sessions.set(sessionId, session);
    
    // Definir como sessão atual se for a primeira
    if (!currentSessionId) {
      currentSessionId = sessionId;
    }
    
    return session;
  } catch (err) {
    console.error(`Erro ao inicializar sessão ${sessionId}:`, err);
    throw err;
  }
};

// Obter sessão atual
const getCurrentSession = () => {
  return sessions.get(currentSessionId);
};

// Obter cliente atual
const getCurrentClient = () => {
  const session = getCurrentSession();
  return session ? session.client : null;
};

// Verificar se há sessão conectada
const isAnySessionConnected = () => {
  for (const session of sessions.values()) {
    if (session.isConnected) return true;
  }
  return false;
};

// Função para validar e formatar número de telefone
const validateAndFormatPhone = async (element) => {
  let shouldSend = true;
  let numberUser = '';
  const invalidNumbers = [];

  try {
    console.log('Iniciando validação para:', element);
    
    //---------------------------------------Verifica se o número é válido---------------------------------------
    // Verificar se o elemento tem phone ou number
    const phoneNumber = element.phone || element.number;
    
    if (!element || !phoneNumber || phoneNumber === '' || phoneNumber === undefined || phoneNumber === null) {
      console.log('Número inválido:', element);
      return { 
        shouldSend: false, 
        numberUser: '', 
        invalidNumbers: [{ name: element?.name, number: phoneNumber, reason: 'Número não existe ou é inválido' }] 
      };
    }

    //---------------------------------------Remove caracteres especiais e atualiza o ddd------------------------
    numberUser = phoneNumber.replace(/\D/g, '');
    console.log('Número após remoção de caracteres especiais:', numberUser);
    
    if (numberUser.length < 8) {
      shouldSend = false;
      invalidNumbers.push({ 
        name: element?.name, 
        number: phoneNumber, 
        reason: 'Número muito curto (menos de 8 dígitos)' 
      });
    }
    
    //---------------------------------------Se não tiver DDD, adiciona 67----------------------------------------
    if (numberUser.length < 10) {
      numberUser = "67" + numberUser;
      console.log('Adicionado DDD 67:', numberUser);
    }
    
    //---------------------------------------Se tiver o 9 inicial de todos os números, retira----------------------------------------
    if (numberUser.length === 11 && numberUser[2] === '9') {
      numberUser = numberUser.slice(0, 2) + numberUser.slice(3);
      console.log('Removido 9 inicial:', numberUser);
    }
    
    // Verificação adicional para números que começam com 3
    if (numberUser[2] === '3') {
      shouldSend = false;
      invalidNumbers.push({ 
        name: element?.name, 
        number: phoneNumber, 
        reason: 'Número começa com 3 (inválido)' 
      });
    }

    //---------------------------------------Adiciona o 55 do Brasil----------------------------------------
    const numeroAux = `55${numberUser}@c.us`;
    console.log('Número formatado para WhatsApp:', numeroAux);

    //---------------------------------------Verifica se o número é valido no WhatsApp (APENAS se passou por todas as validações)----------------------------------------
    if (shouldSend) {
      const currentClient = getCurrentClient();
      const currentSession = getCurrentSession();
      
      if (currentClient && currentSession && currentSession.isConnected) {
        try {
          console.log('Verificando se número está registrado no WhatsApp...');
          const isTrue = await currentClient.isRegisteredUser(numeroAux);
          console.log('Resultado da verificação WhatsApp:', isTrue);
          
          if (!isTrue) {
            invalidNumbers.push({ 
              name: element?.name, 
              number: phoneNumber, 
              reason: 'Número não registrado no WhatsApp' 
            });
            shouldSend = false;
          }
        } catch (error) {
          console.error('Erro ao verificar número no WhatsApp:', error);
          // Se não conseguir verificar, continua com o envio
        }
      } else {
        console.log('Nenhuma sessão WhatsApp conectada para validação');
      }
    }

    console.log('Validação final - shouldSend:', shouldSend, 'invalidNumbers:', invalidNumbers);

    return { shouldSend, numberUser, invalidNumbers };

  } catch (error) {
    console.error('Erro na validação do número:', error);
    return { 
      shouldSend: false, 
      numberUser: '', 
      invalidNumbers: [{ name: element?.name, number: element?.phone || element?.number, reason: 'Erro na validação: ' + error.message }] 
    };
  }
};

// Rotas da API

// Listar todas as sessões
app.get('/api/sessions', (req, res) => {
  const sessionsList = Array.from(sessions.values()).map(session => ({
    id: session.id,
    name: session.name,
    isConnected: session.isConnected,
    isInitializing: session.isInitializing,
    isCurrent: session.id === currentSessionId
  }));
  
  res.json({
    sessions: sessionsList,
    currentSessionId,
    hasAnyConnected: isAnySessionConnected()
  });
});

// Criar nova sessão
app.post('/api/sessions', async (req, res) => {
  try {
    const { sessionId, sessionName } = req.body;
    
    if (!sessionId || !sessionName) {
      return res.status(400).json({ error: 'ID e nome da sessão são obrigatórios' });
    }
    
    if (sessions.has(sessionId)) {
      return res.status(400).json({ error: 'Sessão com este ID já existe' });
    }
    
    await createWhatsAppSession(sessionId, sessionName);
    
    res.json({ 
      success: true, 
      message: 'Sessão criada com sucesso',
      sessionId,
      sessionName
    });
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alterar sessão atual
app.post('/api/sessions/current', (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'ID da sessão é obrigatório' });
    }
    
    if (!sessions.has(sessionId)) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    
    currentSessionId = sessionId;
    
    res.json({ 
      success: true, 
      message: 'Sessão atual alterada',
      currentSessionId
    });
  } catch (error) {
    console.error('Erro ao alterar sessão atual:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remover sessão
app.delete('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessions.has(sessionId)) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    
    const session = sessions.get(sessionId);
    
    // Se for a sessão atual, definir outra como atual
    if (sessionId === currentSessionId) {
      const otherSessions = Array.from(sessions.keys()).filter(id => id !== sessionId);
      currentSessionId = otherSessions.length > 0 ? otherSessions[0] : null;
    }
    
    // Desconectar cliente
    if (session.client) {
      await session.client.destroy();
    }
    
    sessions.delete(sessionId);
    
    res.json({ 
      success: true, 
      message: 'Sessão removida com sucesso',
      currentSessionId
    });
  } catch (error) {
    console.error('Erro ao remover sessão:', error);
    res.status(500).json({ error: error.message });
  }
});

// Status da conexão atual
app.get('/api/status', (req, res) => {
  const currentSession = getCurrentSession();
  
  res.json({
    isConnected: currentSession ? currentSession.isConnected : false,
    hasQRCode: currentSession ? !!currentSession.qrCode : false,
    currentSessionId,
    currentSessionName: currentSession ? currentSession.name : null,
    hasAnyConnected: isAnySessionConnected()
  });
});

// Obter QR Code da sessão atual
app.get('/api/qr', (req, res) => {
  const currentSession = getCurrentSession();
  
  if (currentSession && currentSession.qrCode) {
    res.json({ qrCode: currentSession.qrCode });
  } else {
    res.status(404).json({ error: 'QR Code não disponível' });
  }
});

// Enviar mensagem
app.post('/api/send-message', upload.single('image'), async (req, res) => {
  try {
    const { phone, message } = req.body;

    const currentClient = getCurrentClient();
    const currentSession = getCurrentSession();

    if (!currentClient || !currentSession || !currentSession.isConnected) {
      return res.status(400).json({ error: 'WhatsApp não está conectado' });
    }

    if (!phone || !message) {
      return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
    }

    // Validar e formatar o número
    const validation = await validateAndFormatPhone({ phone: phone });
    
    if (!validation.shouldSend) {
      return res.status(400).json({ 
        error: 'Número inválido', 
        details: validation.invalidNumbers 
      });
    }

    const chatId = `55${validation.numberUser}@c.us`;
    
    // Adicionar ID aleatório à mensagem
    const randomId = generateRandomId();
    const messageWithId = `${message}\n\nid: ${randomId}`;
    
    if (req.file) {
      // Enviar imagem com legenda
      const media = MessageMedia.fromFilePath(req.file.path);
      await currentClient.sendMessage(chatId, media, { caption: messageWithId });
      
      // Limpar arquivo após envio
      fs.unlinkSync(req.file.path);
    } else {
      // Enviar apenas texto
      await currentClient.sendMessage(chatId, messageWithId);
    }
    
    res.json({ 
      success: true, 
      message: 'Mensagem enviada com sucesso',
      sessionName: currentSession.name
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: error.message });
  }
});

// Função para gerar número aleatório entre min e max
const numberAleatorio = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Função para gerar ID aleatório para mensagens
const generateRandomId = () => {
  return Math.floor(Math.random() * 1000) + 1;
};

// Enviar mensagens em massa
app.post('/api/send-bulk-messages', upload.single('image'), async (req, res) => {
  try {
    const contacts = JSON.parse(req.body.contacts);
    const message = req.body.message;

    const currentClient = getCurrentClient();
    const currentSession = getCurrentSession();

    if (!currentClient || !currentSession || !currentSession.isConnected) {
      return res.status(400).json({ error: 'WhatsApp não está conectado' });
    }

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Lista de contatos é obrigatória' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    const results = [];
    const invalidNumbers = [];
    const phoneNumbers = []; // Array para controle de duplicatas
    let messagesSent = 0; // Contador de mensagens enviadas com sucesso

    for (const contact of contacts) {
      try {
        // Validar e formatar o número
        const validation = await validateAndFormatPhone(contact);
        
        if (!validation.shouldSend) {
          invalidNumbers.push(...validation.invalidNumbers);
          results.push({
            phone: contact.phone,
            name: contact.name,
            status: 'error',
            error: validation.invalidNumbers[0]?.reason || 'Número inválido'
          });
          continue;
        }

        // Verificar duplicatas
        if (phoneNumbers.includes(validation.numberUser)) {
          results.push({
            phone: contact.phone,
            name: contact.name,
            status: 'error',
            error: 'Número duplicado'
          });
          continue;
        }

        // Adicionar à lista de números processados
        phoneNumbers.push(validation.numberUser);

        const chatId = `55${validation.numberUser}@c.us`;
        const personalizedMessage = message.replace(/\{nome_cliente\}/g, contact.name || '');
        
        // Adicionar ID aleatório à mensagem
        const randomId = generateRandomId();
        const messageWithId = `${personalizedMessage}\n\nid: ${randomId}`;
        
        if (req.file) {
          // Enviar imagem com legenda
          const media = MessageMedia.fromFilePath(req.file.path);
          await currentClient.sendMessage(chatId, media, { caption: messageWithId });
        } else {
          // Enviar apenas texto
          await currentClient.sendMessage(chatId, messageWithId);
        }
        
        messagesSent++;
        
        results.push({
          phone: contact.phone,
          name: contact.name,
          status: 'success'
        });

        // Timeout aleatório entre mensagens (15-30 segundos)
        const timeoutMs = numberAleatorio(15000, 30000);
        console.log(`Aguardando ${timeoutMs/1000} segundos antes da próxima mensagem...`);
        await new Promise(resolve => setTimeout(resolve, timeoutMs));

        // Pausa prolongada a cada 50 mensagens enviadas (10-15 minutos)
        if (messagesSent % 50 === 0) {
          const pauseMs = numberAleatorio(600000, 900000); // 10-15 minutos
          console.log(`Pausa prolongada de ${pauseMs/60000} minutos após ${messagesSent} mensagens enviadas...`);
          await new Promise(resolve => setTimeout(resolve, pauseMs));
        }
      } catch (error) {
        results.push({
          phone: contact.phone,
          name: contact.name,
          status: 'error',
          error: error.message
        });
      }
    }

    // Limpar arquivo de imagem se existir
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (error) {
        console.error('Erro ao limpar arquivo:', error);
      }
    }

    res.json({ 
      success: true, 
      results,
      invalidNumbers,
      total: contacts.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length
    });
  } catch (error) {
    console.error('Erro ao enviar mensagens em massa:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para validar números (sem enviar mensagem)
app.post('/api/validate-numbers', async (req, res) => {
  try {
    console.log('Recebida requisição de validação:', req.body);
    
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts)) {
      console.log('Erro: Lista de contatos inválida');
      return res.status(400).json({ error: 'Lista de contatos é obrigatória' });
    }

    console.log('Validando', contacts.length, 'contatos');

    const validationResults = [];
    const phoneNumbers = []; // Array para controle de duplicatas

    for (const contact of contacts) {
      console.log('Validando contato:', contact);
      
      const validation = await validateAndFormatPhone(contact);
      console.log('Resultado da validação:', validation);
      
      // Verificar duplicatas
      if (phoneNumbers.includes(validation.numberUser)) {
        validation.shouldSend = false;
        validation.invalidNumbers.push({
          name: contact?.name,
          number: contact.number,
          reason: 'Número duplicado'
        });
      }

      if (validation.shouldSend) {
        phoneNumbers.push(validation.numberUser);
      }

      validationResults.push({
        original: contact,
        validated: {
          shouldSend: validation.shouldSend,
          formattedNumber: validation.numberUser,
          chatId: validation.shouldSend ? `55${validation.numberUser}@c.us` : null,
          errors: validation.invalidNumbers
        }
      });
    }

    const response = {
      success: true,
      validationResults,
      summary: {
        total: contacts.length,
        valid: validationResults.filter(r => r.validated.shouldSend).length,
        invalid: validationResults.filter(r => !r.validated.shouldSend).length
      }
    };

    console.log('Resposta de validação:', response);
    res.json(response);
  } catch (error) {
    console.error('Erro ao validar números:', error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
  console.log(`API disponível em: http://localhost:${PORT}/api`);
  console.log(`\nPara criar uma sessão WhatsApp, use: POST /api/sessions`);
}); 