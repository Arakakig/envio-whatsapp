import express from 'express';
import cors from 'cors';
import pkg from 'whatsapp-web.js';
const { Client, MessageMedia, LocalAuth } = pkg;
import qrcode from 'qrcode';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  initDatabase,
  createOrUpdateCustomer,
  getActiveConversation,
  createConversation,
  saveMessage,
  getConversationMessages,
  getDashboardStats,
  getRecentConversations,
  getCustomerHistory,
  markConversationAsSeen,
  mergeDuplicateConversations,
  saveWhatsAppSession,
  updateSessionStatus,
  getAllSessions,
  getSessionById,
  deleteSession,
  createUser,
  getUserByUsername,
  getUserById,
  updateLastLogin,
  getAllUsers,
  updateUser,
  deleteUser,
  changePassword,
  usernameExists,
  emailExists,
  assignConversationToAgent,
  unassignConversation,
  getConversationsByAgent,
  getUnassignedConversations,
  getAvailableAgents
} from './database.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 3001;

// Configurações JWT
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-2024';
const JWT_EXPIRES_IN = '24h';

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Criar servidor HTTP
const httpServer = createServer(app);

// Configurar Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"]
  }
});

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
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('audio/') || 
        file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens, áudios e PDFs são permitidos'), false);
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

// Middleware de tratamento de erro global
app.use((error, req, res, next) => {
  console.error('Erro global:', error);

  // Se for erro do multer
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'Arquivo muito grande. Tamanho máximo: 5MB'
    });
  }

  if (error.message && error.message.includes('Apenas imagens e áudios são permitidos')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  // Outros erros
  res.status(500).json({
    success: false,
    error: error.message || 'Erro interno do servidor'
  });
});

// Variáveis globais para múltiplas sessões do WhatsApp
let sessions = new Map(); // Map para armazenar múltiplas sessões
let currentSessionId = null; // Sessão ativa atual

// Criar nova sessão do WhatsApp
const createWhatsAppSession = async (sessionId, sessionName) => {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] INFO: Criando nova sessão: ${sessionName}`);

    // Salvar sessão no banco de dados
    await saveWhatsAppSession(sessionId, sessionName);
    await updateSessionStatus(sessionId, 'connecting');

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
        ],
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
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
        console.log(`[${new Date().toLocaleTimeString()}] INFO: QR Code gerado para sessão: ${sessionName}`);
      } catch (err) {
        console.error(`[${new Date().toLocaleTimeString()}] ERROR: Erro ao gerar QR Code para sessão ${sessionName}:`, err.message);
      }
    });

    client.on('ready', async () => {
      session.isConnected = true;
      session.qrCode = null;
      session.isInitializing = false;
      await updateSessionStatus(sessionId, 'connected');
      console.log(`[${new Date().toLocaleTimeString()}] SUCCESS: WhatsApp conectado na sessão: ${sessionName}`);
    });

    client.on('disconnected', async () => {
      session.isConnected = false;
      session.isInitializing = false;
      await updateSessionStatus(sessionId, 'disconnected');
      console.log(`[${new Date().toLocaleTimeString()}] WARNING: WhatsApp desconectado na sessão: ${sessionName}`);

      // Tentar reconexão automática após 5 segundos
      setTimeout(async () => {
        try {
          console.log(`[${new Date().toLocaleTimeString()}] INFO: Tentando reconexão automática para sessão: ${sessionName}`);
          session.isInitializing = true;
          await updateSessionStatus(sessionId, 'connecting');

          // Tentar reinicializar o cliente
          await client.initialize();

          console.log(`[${new Date().toLocaleTimeString()}] SUCCESS: Reconexão automática bem-sucedida para sessão: ${sessionName}`);
        } catch (reconnectError) {
          console.error(`[${new Date().toLocaleTimeString()}] ERROR: Falha na reconexão automática para sessão ${sessionName}:`, reconnectError.message);
          session.isInitializing = false;
          await updateSessionStatus(sessionId, 'disconnected');

          // Tentar novamente após 30 segundos
          setTimeout(async () => {
            try {
              console.log(`[${new Date().toLocaleTimeString()}] INFO: Segunda tentativa de reconexão para sessão: ${sessionName}`);
              session.isInitializing = true;
              await updateSessionStatus(sessionId, 'connecting');

              await client.initialize();

              console.log(`[${new Date().toLocaleTimeString()}] SUCCESS: Segunda reconexão automática bem-sucedida para sessão: ${sessionName}`);
            } catch (secondReconnectError) {
              console.error(`[${new Date().toLocaleTimeString()}] ERROR: Falha na segunda reconexão para sessão ${sessionName}:`, secondReconnectError.message);
              session.isInitializing = false;
              await updateSessionStatus(sessionId, 'disconnected');
            }
          }, 30000); // 30 segundos
        }
      }, 5000); // 5 segundos
    });

    client.on('auth_failure', async () => {
      session.isInitializing = false;
      await updateSessionStatus(sessionId, 'disconnected');
      console.error(`[${new Date().toLocaleTimeString()}] ERROR: Falha na autenticação do WhatsApp na sessão: ${sessionName}`);
    });

    // Evento de mensagem recebida
    client.on('message', async (message) => {
      try {
        const chatId = message.from;
        const messageText = message.body || '';
        const isGroup = message.from.endsWith('@g.us');
        const isStatus = message.from === 'status@broadcast';

        // Ignorar mensagens de status
        if (isStatus) {
          return;
        }

        // Buscar ou criar cliente
        const customer = await createOrUpdateCustomer(chatId);

        // Buscar conversa ativa
        let conversation = await getActiveConversation(customer.id, chatId);
        if (!conversation) {
          conversation = await createConversation(customer.id, session.id, chatId);
        }

        // Salvar mensagem recebida (texto ou mídia)
        let savedMessage;
        if (message.hasMedia) {
          try {
            const media = await message.downloadMedia();
            if (media && media.mimetype && media.data) {
              console.log(`[DEBUG] Mídia recebida - mimetype: ${media.mimetype}, filename: ${media.filename || 'sem nome'}`);
              
              // Determinar tipo de mídia e extensão
              let mediaType = 'file';
              let filePrefix = 'file';
              let ext = 'bin';
              
              // Verificar se é PDF por mimetype ou extensão do arquivo
              if (media.mimetype === 'application/pdf' || 
                  (media.filename && media.filename.toLowerCase().endsWith('.pdf'))) {
                mediaType = 'pdf';
                filePrefix = 'pdf';
                ext = 'pdf';
                console.log(`[DEBUG] Detectado como PDF`);
              } else if (media.mimetype.startsWith('image/')) {
                mediaType = 'image';
                filePrefix = 'image';
                ext = media.mimetype.split('/')[1] || 'jpg';
                console.log(`[DEBUG] Detectado como imagem`);
              } else if (media.mimetype.startsWith('audio/')) {
                mediaType = 'audio';
                filePrefix = 'audio';
                ext = media.mimetype.split('/')[1] || 'bin';
                console.log(`[DEBUG] Detectado como áudio`);
              } else if (media.mimetype.startsWith('video/')) {
                mediaType = 'video';
                filePrefix = 'video';
                ext = media.mimetype.split('/')[1] || 'bin';
                console.log(`[DEBUG] Detectado como vídeo`);
              } else {
                // Outros tipos de arquivo
                ext = media.mimetype.split('/')[1] || 'bin';
                console.log(`[DEBUG] Detectado como arquivo genérico`);
              }
              
              // Gerar nome de arquivo único
              const filename = `${filePrefix}-${Date.now()}-${Math.floor(Math.random()*1e9)}.${ext}`;
              const uploadPath = path.join(__dirname, 'uploads', filename);
              
              // Salvar arquivo
              fs.writeFileSync(uploadPath, Buffer.from(media.data, 'base64'));
              
              // Salvar no banco
              savedMessage = await saveMessage(
                conversation.id,
                customer.id,
                session.id,
                'inbound',
                '', // Sem texto
                mediaType,
                `/uploads/${filename}`,
                null
              );
              
              // Emitir para o frontend
              io.emit('chatwood', {
                type: 'message',
                conversationId: conversation.id,
                message: '',
                mediaType: mediaType,
                mediaUrl: `/uploads/${filename}`,
                fileName: filename,
                from: chatId,
                timestamp: new Date(new Date().getTime() - (4 * 60 * 60 * 1000)).toISOString()
              });
              
              // Notificação será emitida pelo frontend quando detectar nova mensagem
              
              console.log(`[${new Date().toLocaleTimeString()}] INFO: ${mediaType} recebido de ${chatId}: ${filename}`);
            }
          } catch (mediaError) {
            console.error('Erro ao salvar mídia recebida:', mediaError.message);
          }
        } else {
          // Salvar mensagem de texto
          savedMessage = await saveMessage(conversation.id, customer.id, session.id, 'inbound', messageText, 'text', null, null);
          // Emitir para o frontend
          io.emit('chatwood', {
            type: 'message',
            conversationId: conversation.id,
            message: messageText,
            from: chatId,
            timestamp: new Date(new Date().getTime() - (4 * 60 * 60 * 1000)).toISOString()
          });
          
          // Notificação será emitida pelo frontend quando detectar nova mensagem
          console.log(`[${new Date().toLocaleTimeString()}] INFO: Mensagem recebida de ${chatId}: ${messageText}`);
        }
      } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] ERROR: Erro ao processar mensagem:`, error.message);
      }
    });

    await client.initialize();
    sessions.set(sessionId, session);

    // Definir como sessão atual se for a primeira
    if (!currentSessionId) {
      currentSessionId = sessionId;
    }


    console.log(`[${new Date().toLocaleTimeString()}] SUCCESS: Sessão criada com sucesso: ${sessionName}`);
    return session;
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] ERROR: Erro ao inicializar sessão ${sessionName}:`, err.message);
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

// Função para verificar se o cliente está pronto para envio
function isClientReady(client) {
  try {
    const hasClient = !!client;
    const isConnected = client?.isConnected;
    const hasPupPage = !!client?.pupPage;
    const pupPageNotClosed = client?.pupPage && !client.pupPage.isClosed();
    const hasPupBrowser = !!client?.pupBrowser;
    const pupBrowserConnected = client?.pupBrowser && client.pupBrowser.isConnected !== false;

    console.log(`[DEBUG] isClientReady detalhes:`);
    console.log(`[DEBUG] - hasClient: ${hasClient}`);
    console.log(`[DEBUG] - isConnected: ${isConnected}`);
    console.log(`[DEBUG] - hasPupPage: ${hasPupPage}`);
    console.log(`[DEBUG] - pupPageNotClosed: ${pupPageNotClosed}`);
    console.log(`[DEBUG] - hasPupBrowser: ${hasPupBrowser}`);
    console.log(`[DEBUG] - pupBrowserConnected: ${pupBrowserConnected}`);

    return hasClient && isConnected && hasPupPage && pupPageNotClosed && hasPupBrowser && pupBrowserConnected;
  } catch (error) {
    console.error('Erro ao verificar prontidão do cliente:', error.message);
    return false;
  }
}

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

    //---------------------------------------Verifica se o número é válido---------------------------------------
    // Verificar se o elemento tem phone ou number
    const phoneNumber = element.phone || element.number;

    if (!element || !phoneNumber || phoneNumber === '' || phoneNumber === undefined || phoneNumber === null) {
      return {
        shouldSend: false,
        numberUser: '',
        invalidNumbers: [{ name: element?.name, number: phoneNumber, reason: 'Número não existe ou é inválido' }]
      };
    }

    //---------------------------------------Remove caracteres especiais e atualiza o ddd------------------------
    numberUser = phoneNumber.replace(/\D/g, '');

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
    }

    //---------------------------------------Se tiver o 9 inicial de todos os números, retira----------------------------------------
    if (numberUser.length === 11 && numberUser[2] === '9') {
      numberUser = numberUser.slice(0, 2) + numberUser.slice(3);
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
app.get('/api/sessions', async (req, res) => {
  try {
    // Buscar sessões salvas no banco
    const savedSessions = await getAllSessions();

    // Mapear sessões ativas em memória
    const activeSessions = Array.from(sessions.values()).map(session => ({
      id: session.id,
      name: session.name,
      isConnected: session.isConnected,
      isInitializing: session.isInitializing,
      isCurrent: session.id === currentSessionId,
      isLoaded: true, // Sessão carregada em memória
      lastConnection: session.lastConnection || null
    }));

    // Combinar sessões salvas com ativas
    const allSessions = savedSessions.map(dbSession => {
      const activeSession = activeSessions.find(s => s.id === dbSession.session_id);

      if (activeSession) {
        // Sessão está carregada em memória
        return {
          ...activeSession,
          savedAt: dbSession.created_at,
          lastConnection: activeSession.lastConnection || dbSession.last_connection
        };
      } else {
        // Sessão salva mas não carregada
        return {
          id: dbSession.session_id,
          name: dbSession.session_name,
          isConnected: false,
          isInitializing: false,
          isCurrent: false,
          isLoaded: false, // Sessão salva mas não carregada
          savedAt: dbSession.created_at,
          lastConnection: dbSession.last_connection
        };
      }
    });

    res.json({
      sessions: allSessions,
      currentSessionId,
      hasAnyConnected: isAnySessionConnected(),
      totalSaved: savedSessions.length,
      totalLoaded: activeSessions.length
    });
  } catch (error) {
    console.error('Erro ao listar sessões:', error);
    res.status(500).json({ error: error.message });
  }
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

    // Desconectar se estiver ativa
    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId);

      if (session.client) {
        await session.client.destroy();
      }
      sessions.delete(sessionId);

      if (currentSessionId === sessionId) {
        currentSessionId = null;
      }
    }

    // Remover do banco
    await deleteSession(sessionId);

    res.json({
      success: true,
      message: 'Sessão removida com sucesso'
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
    console.log(phone, message)

    const chatId = `55${validation.numberUser}@c.us`;

    // Adicionar ID aleatório à mensagem
    const randomId = generateRandomId();
    const messageWithId = `${message}\n\nid: ${randomId}`;

    if (req.file) {
      // Enviar imagem com legenda
      const media = MessageMedia.fromFilePath(req.file.path);
      await currentClient.sendMessage(chatId, media, { caption: messageWithId });

      // Limpar arquivo após envio
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Erro ao deletar arquivo:', unlinkError.message);
        }
      }
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
          console.log(`[${new Date().toLocaleTimeString()}] SUCCESS: Mensagem com imagem enviada para ${contact.name}`);
        } else {
          // Enviar apenas texto
          await currentClient.sendMessage(chatId, messageWithId);
          console.log(`[${new Date().toLocaleTimeString()}] SUCCESS: Mensagem enviada para ${contact.name}`);
        }

        messagesSent++;

        results.push({
          phone: contact.phone,
          name: contact.name,
          status: 'success'
        });

        // Timeout aleatório entre mensagens (15-30 segundos)
        const timeoutMs = numberAleatorio(15000, 30000);
        console.log(`[${new Date().toLocaleTimeString()}] INFO: Aguardando ${timeoutMs / 1000} segundos antes da próxima mensagem...`);
        await new Promise(resolve => setTimeout(resolve, timeoutMs));

        // Pausa prolongada a cada 50 mensagens enviadas (10-15 minutos)
        if (messagesSent % 50 === 0) {
          const pauseMs = numberAleatorio(600000, 900000); // 10-15 minutos
          console.log(`[${new Date().toLocaleTimeString()}] WARNING: Pausa prolongada de ${pauseMs / 60000} minutos após ${messagesSent} mensagens enviadas...`);
          await new Promise(resolve => setTimeout(resolve, pauseMs));
        }
      } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] ERROR: Erro ao enviar mensagem para ${contact.name}:`, error.message);

        results.push({
          phone: contact.phone,
          name: contact.name,
          status: 'error',
          error: error.message
        });
      }
    }

    // Limpar arquivo de imagem se existir
    if (req.file && req.file.path) {
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

// ==================== ROTAS DE TESTE ====================

// Rota de teste para verificar se o servidor está funcionando
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando corretamente',
    timestamp: new Date().toISOString()
  });
});

// Rota para unificar conversas duplicadas
app.post('/api/admin/merge-conversations', async (req, res) => {
  try {
    const mergedCount = await mergeDuplicateConversations();
    res.json({
      success: true,
      message: `Unificação concluída. ${mergedCount} grupos de conversas duplicadas foram unificados.`,
      mergedCount
    });
  } catch (error) {
    console.error('Erro ao unificar conversas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS DE ATENDIMENTO ====================

// Dashboard - Estatísticas
app.get('/api/attendance/dashboard', async (req, res) => {
  try {
    console.log('[DASHBOARD] Iniciando busca de dados...');
    
    console.log('[DASHBOARD] Buscando estatísticas...');
    const stats = await getDashboardStats();
    console.log('[DASHBOARD] Estatísticas obtidas:', stats);
    
    console.log('[DASHBOARD] Buscando conversas recentes...');
    let recentConversations = await getRecentConversations(50);
    console.log('[DASHBOARD] Conversas encontradas:', recentConversations.length);

    // Determinar o tipo de chat baseado no customer_phone e chat_id
    console.log('[DASHBOARD] Processando tipos de chat...');
    recentConversations = recentConversations.map(conv => {
      const phone = conv.customer_phone || '';
      const chatId = conv.chat_id || '';

      let chatType = 'private';

      // Identificar grupos
      if (phone.includes('@g.us') || chatId.includes('@g.us')) {
        chatType = 'group';
      }

      // Conversas privadas (números individuais)
      else if (phone.includes('@c.us') || chatId.includes('@c.us') || phone.match(/^\d+$/)) {
        chatType = 'private';
      }

      return {
        ...conv,
        chat_type: chatType
      };
    });

    // Buscar fotos de perfil e nomes dos contatos (de forma mais robusta)
    console.log('[DASHBOARD] Verificando cliente atual...');
    const currentClient = getCurrentClient();
    if (currentClient) {
      console.log('[DASHBOARD] Cliente conectado, buscando fotos de perfil...');
      
      // Processar conversas uma por vez para evitar travamentos
      const conversationsWithProfile = [];
      for (const conv of recentConversations) {
        try {
          let profilePicture = null;
          let contactName = conv.customer_name || null;
          
          // Buscar foto e nome apenas para conversas privadas
          if (conv.chat_type === 'private' && conv.customer_phone) {
            try {
              // Usar timeout para evitar travamentos
              const contactInfo = await Promise.race([
                getContactInfo(currentClient, conv.customer_phone),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
              ]);
              
              profilePicture = contactInfo.profilePicture;
              contactName = contactInfo.contactName || contactName;
            } catch (picError) {
              console.log(`[DASHBOARD] Erro ao buscar foto para ${conv.customer_phone}:`, picError.message);
              profilePicture = null;
            }
          }

          conversationsWithProfile.push({
            ...conv,
            profilePicture,
            contactName
          });
        } catch (error) {
          console.log(`[DASHBOARD] Erro ao processar conversa ${conv.id}:`, error.message);
          conversationsWithProfile.push({
            ...conv,
            profilePicture: null,
            contactName: conv.customer_name || null
          });
        }
      }

      recentConversations = conversationsWithProfile;
      console.log('[DASHBOARD] Fotos de perfil processadas');
    } else {
      console.log('[DASHBOARD] Cliente não conectado, pulando fotos de perfil');
      // Adicionar campos vazios para manter compatibilidade
      recentConversations = recentConversations.map(conv => ({
        ...conv,
        profilePicture: null,
        contactName: conv.customer_name || null
      }));
    }

    console.log('[DASHBOARD] Enviando resposta...');
    res.json({
      success: true,
      stats,
      recentConversations
    });
    console.log('[DASHBOARD] Resposta enviada com sucesso');
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar conversas recentes (apenas mensagens individuais)
app.get('/api/attendance/conversations', async (req, res) => {
  try {
    const { limit = 20, status } = req.query;
    let conversations = await getRecentConversations(parseInt(limit));

    // Filtrar apenas conversas individuais (remover status, grupos)
    conversations = conversations.filter(conv => {
      const phone = conv.customer_phone || '';
      const chatId = conv.chat_id || '';

      // Remover status
      if (phone === 'status@broadcast') {
        return false;
      }

      // Remover grupos (@g.us)
      if (phone.includes('@g.us') || chatId.includes('@g.us')) {
        return false;
      }

      // Manter apenas números individuais (@c.us)
      return phone.includes('@c.us') || chatId.includes('@c.us') ||
        (phone.match(/^\d+$/) && phone.length >= 8);
    });

    console.log('[API] Conversas individuais encontradas:', conversations.length);
    conversations.forEach((conv, index) => {
      console.log(`[API] Conversa ${index + 1}:`, {
        id: conv.id,
        customer_phone: conv.customer_phone,
        chat_id: conv.chat_id,
        status: conv.status,
        message_count: conv.message_count
      });
    });

    if (status) {
      conversations = conversations.filter(c => c.status === status);
    }

    // Adicionar foto de perfil para cada conversa
    const conversationsWithProfile = await Promise.all(conversations.map(async (conv) => {
      try {
        let profilePicture = null;
        const currentClient = getCurrentClient();

        if (currentClient && currentClient.isConnected) {
          const chatId = conv.chat_id || `55${conv.customer_phone.replace(/\D/g, '')}@c.us`;

          try {
            // Usar a nova função para obter foto de perfil
            profilePicture = await getContactProfilePicture(currentClient, chatId);
            console.log(`[API] Foto de perfil encontrada para ${chatId}:`, !!profilePicture);
          } catch (picError) {
            console.log(`[API] Sem foto de perfil para ${chatId}:`, picError.message);
            // Sem foto de perfil, usar avatar padrão
            profilePicture = null;
          }
        }

        return {
          ...conv,
          profilePicture
        };
      } catch (error) {
        console.error(`[API] Erro ao buscar foto de perfil para conversa ${conv.id}:`, error.message);
        return {
          ...conv,
          profilePicture: null
        };
      }
    }));

    res.json({
      success: true,
      conversations: conversationsWithProfile
    });
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar mensagens de uma conversa
app.get('/api/attendance/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50 } = req.query;

    const messages = await getConversationMessages(parseInt(conversationId), parseInt(limit));

    res.json({
      success: true,
      messages: messages.reverse() // Ordem cronológica
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: error.message });
  }
});

// Marcar conversa como visualizada
app.post('/api/attendance/conversations/:conversationId/seen', async (req, res) => {
  try {
    const { conversationId } = req.params;

    await markConversationAsSeen(parseInt(conversationId));

    res.json({
      success: true,
      message: 'Conversa marcada como visualizada'
    });
  } catch (error) {
    console.error('Erro ao marcar conversa como visualizada:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar histórico de um cliente
app.get('/api/attendance/customers/:phone/history', async (req, res) => {
  try {
    const { phone } = req.params;
    const { limit = 100 } = req.query;

    const customer = await getCustomerByPhone(phone);
    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const history = await getCustomerHistory(customer.id, parseInt(limit));

    res.json({
      success: true,
      customer,
      history
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: error.message });
  }
});

// APIs para gerenciar sessões persistentes
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await getAllSessions();

    // Adicionar status atual das sessões em memória
    const sessionsWithStatus = sessions.map(dbSession => {
      const memorySession = sessions.get(dbSession.session_id);
      return {
        ...dbSession,
        isConnected: memorySession?.isConnected || false,
        isInitializing: memorySession?.isInitializing || false,
        qrCode: memorySession?.qrCode || null
      };
    });

    res.json({
      success: true,
      sessions: sessionsWithStatus
    });
  } catch (error) {
    console.error('Erro ao buscar sessões:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sessions/:sessionId/load', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verificar se a sessão existe no banco
    const dbSession = await getSessionById(sessionId);
    if (!dbSession) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    // Verificar se já está carregada em memória
    if (sessions.has(sessionId)) {
      const existingSession = sessions.get(sessionId);
      if (existingSession.isConnected) {
        currentSessionId = sessionId;
        return res.json({
          success: true,
          message: 'Sessão já está conectada e ativa',
          session: {
            id: sessionId,
            name: dbSession.session_name,
            isConnected: true
          }
        });
      }
    }

    // Carregar sessão existente
    await createWhatsAppSession(sessionId, dbSession.session_name);
    currentSessionId = sessionId;

    console.log(`[${new Date().toLocaleTimeString()}] SUCCESS: Sessão carregada: ${dbSession.session_name}`);

    res.json({
      success: true,
      message: 'Sessão carregada com sucesso',
      session: {
        id: sessionId,
        name: dbSession.session_name
      }
    });
  } catch (error) {
    console.error('Erro ao carregar sessão:', error);
    console.error(`[${new Date().toLocaleTimeString()}] ERROR: Erro ao carregar sessão: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Desconectar se estiver ativa
    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId);

      // Limpar intervalo de verificação de conexão
      if (session.connectionCheckInterval) {
        clearInterval(session.connectionCheckInterval);
        console.log(`[${new Date().toLocaleTimeString()}] INFO: Intervalo de verificação de conexão limpo para sessão: ${session.name}`);
      }

      if (session.client) {
        await session.client.destroy();
      }
      sessions.delete(sessionId);

      if (currentSessionId === sessionId) {
        currentSessionId = null;
      }
    }

    // Remover do banco
    await deleteSession(sessionId);

    res.json({
      success: true,
      message: 'Sessão removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover sessão:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enviar mensagem de atendimento
app.post('/api/attendance/send-message', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), async (req, res) => {
  try {
    const { conversationId, message, customerPhone, chatId } = req.body;
    const currentClient = getCurrentClient();
    const currentSession = getCurrentSession();

    if (!currentClient || !currentSession || !currentSession.isConnected) {
      console.log(`[DEBUG] WhatsApp não está conectado - retornando erro`);
      return res.status(400).json({ error: 'WhatsApp não está conectado' });
    }



    // Buscar ou criar cliente
    let customer = await createOrUpdateCustomer(customerPhone);
    let conversation = await getActiveConversation(customer.id, currentSession.id);

    if (!conversation) {
      conversation = await createConversation(customer.id, currentSession.id);
    }

    // Gerar ID único para a mensagem
    const messageWithId = `${message}`;
    // Definir chat ID
    let toChatId = customerPhone;

    // Enviar mensagem com mídia se houver
    let mediaType = 'text';
    let mediaPath = null;
    let media = null;

    if (req.files && (req.files.image || req.files.audio || req.files.pdf)) {
      if (req.files.image) {
        const imageFile = req.files.image[0];
        mediaPath = imageFile.path;
        media = MessageMedia.fromFilePath(mediaPath);
        mediaType = 'image';
        await currentClient.sendMessage(toChatId, media, { caption: messageWithId });
      } else if (req.files.audio) {
        const audioFile = req.files.audio[0];
        mediaPath = audioFile.path;
        media = MessageMedia.fromFilePath(mediaPath);
        mediaType = 'audio';

        // Enviar áudio sem configurações extras que podem causar problemas
        await currentClient.sendMessage(toChatId, media, { sendAudioAsVoice: true });
      } else if (req.files.pdf) {
        const pdfFile = req.files.pdf[0];
        mediaPath = pdfFile.path;
        media = MessageMedia.fromFilePath(mediaPath);
        mediaType = 'pdf';
        await currentClient.sendMessage(toChatId, media, { caption: messageWithId });
      }

      // Salvar no banco
      await saveMessage(
        conversation.id,
        customer.id,
        currentSession.id,
        'outbound',
        messageWithId,
        mediaType,
        mediaPath,
      );

      // Limpar arquivo
      if (mediaPath) {
        try {
          fs.unlinkSync(mediaPath);
        } catch (unlinkError) {
          console.error('Erro ao deletar arquivo:', unlinkError.message);
        }
      }
    } else {
      try {
        await currentClient.sendMessage(toChatId, messageWithId);
      } catch (sendError) {
        console.log(`[DEBUG] Erro ao enviar mensagem: ${sendError}`);
      }
      // Salvar no banco
      await saveMessage(
        conversation.id,
        customer.id,
        currentSession.id,
        'outbound',
        messageWithId,
        'text',
        null,
      );
    }

    // Emitir evento para atualizar interface
    io.to(`conversation-${conversation.id}`).emit('new-message', {
      conversationId: conversation.id,
      direction: 'outbound',
      content: messageWithId,
      timestamp: new Date(new Date().getTime() - (4 * 60 * 60 * 1000)).toISOString()
    });


    res.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      conversationId: conversation.id
    });
  } catch (error) {
  console.error('Erro ao enviar mensagem de atendimento:', error);

  // Garantir que sempre retornamos um JSON válido
  let errorMessage = 'Erro desconhecido ao enviar mensagem';

  if (error.message) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error.toString) {
    errorMessage = error.toString();
  }

  // Melhorar mensagens de erro específicas
  if (errorMessage.includes('Evaluation failed')) {
    errorMessage = 'WhatsApp Web não está respondendo. Verifique a conexão e tente novamente.';
  } else if (errorMessage.includes('WhatsApp Web não está disponível')) {
    errorMessage = 'WhatsApp Web foi desconectado. Reconecte e tente novamente.';
  } else if (errorMessage.includes('Falha ao enviar mensagem após')) {
    errorMessage = 'Não foi possível enviar a mensagem após várias tentativas. Tente novamente em alguns segundos.';
  } else if (errorMessage.includes('Target closed')) {
    errorMessage = 'Conexão com WhatsApp Web foi perdida. Reconecte e tente novamente.';
  } else if (errorMessage.includes('Protocol error')) {
    errorMessage = 'Erro de comunicação com WhatsApp Web. Tente novamente.';
  } else if (errorMessage.includes('Session closed')) {
    errorMessage = 'Sessão do WhatsApp foi fechada. Reconecte e tente novamente.';
  } else if (errorMessage.includes('Navigation timeout')) {
    errorMessage = 'Timeout na navegação do WhatsApp Web. Verifique sua conexão.';
  }

  // Log detalhado para debugging
  console.error(`[${new Date().toLocaleTimeString()}] ERROR: Erro ao enviar mensagem: ${errorMessage}`);

  res.status(500).json({
    success: false,
    error: errorMessage
  });
}
});

// Chatwood - logs em tempo real
io.on('connection', (socket) => {
  console.log(`[SOCKET.IO] Cliente conectado: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[SOCKET.IO] Cliente desconectado: ${socket.id}`);
  });
  
  socket.on('test-notification', (data) => {
    console.log(`[SOCKET.IO] Evento de teste recebido de ${socket.id}:`, data);
    // Responder com uma notificação de teste
    const testNotification = {
      type: 'new-message',
      conversationId: 999,
      from: 'TESTE',
      message: 'Notificação de teste do servidor',
      timestamp: new Date().toISOString()
    };
    console.log(`[SOCKET.IO] Enviando notificação de teste para ${socket.id}`);
    socket.emit('new-notification', testNotification);
  });
  
  socket.on('new-notification', (notificationData) => {
    console.log(`[SOCKET.IO] Notificação recebida de ${socket.id}:`, notificationData);
    // Reemitir para todos os clientes (incluindo o NotificationSystem)
    console.log(`[SOCKET.IO] Reemitindo notificação para todos os sockets:`, io.sockets.sockets.size);
    io.sockets.emit('new-notification', notificationData);
  });
});

// Carregar todas as sessões salvas do banco de dados
const loadSavedSessions = async () => {
  try {
    console.log('[SESSÕES] Carregando sessões salvas do banco de dados...');
    const savedSessions = await getAllSessions();

    if (savedSessions.length === 0) {
      console.log('[SESSÕES] Nenhuma sessão salva encontrada');
      console.log(`[${new Date().toLocaleTimeString()}] INFO: Nenhuma sessão salva encontrada`);
      return;
    }

    console.log(`[SESSÕES] Encontradas ${savedSessions.length} sessões salvas`);
    console.log(`[${new Date().toLocaleTimeString()}] INFO: Carregando ${savedSessions.length} sessões salvas`);

    for (const dbSession of savedSessions) {
      try {
        console.log(`[SESSÕES] Carregando sessão: ${dbSession.session_name} (${dbSession.session_id})`);
        console.log(`[${new Date().toLocaleTimeString()}] INFO: Carregando sessão: ${dbSession.session_name}`);

        // Criar a sessão em memória
        await createWhatsAppSession(dbSession.session_id, dbSession.session_name);

        // Definir como sessão atual se for a primeira
        if (!currentSessionId) {
          currentSessionId = dbSession.session_id;
          console.log(`[SESSÕES] Definindo sessão atual: ${dbSession.session_name}`);
        }

        console.log(`[SESSÕES] Sessão carregada com sucesso: ${dbSession.session_name}`);
        console.log(`[${new Date().toLocaleTimeString()}] SUCCESS: Sessão carregada: ${dbSession.session_name}`);

      } catch (sessionError) {
        console.error(`[SESSÕES] Erro ao carregar sessão ${dbSession.session_name}:`, sessionError.message);
        console.error(`[${new Date().toLocaleTimeString()}] ERROR: Erro ao carregar sessão ${dbSession.session_name}: ${sessionError.message}`);
      }
    }

    console.log(`[SESSÕES] Carregamento concluído. ${sessions.size} sessões ativas`);
    console.log(`[${new Date().toLocaleTimeString()}] SUCCESS: Carregamento concluído. ${sessions.size} sessões ativas`);

  } catch (error) {
    console.error('[SESSÕES] Erro ao carregar sessões salvas:', error);
    console.error(`[${new Date().toLocaleTimeString()}] ERROR: Erro ao carregar sessões salvas: ${error.message}`);
  }
};

// Inicializar banco de dados e servidor
const startServer = async () => {
  try {
    // Inicializar banco de dados
    await initDatabase();
    console.log(`[${new Date().toLocaleTimeString()}] SYSTEM: Banco de dados inicializado com sucesso`);

    // Unificar conversas duplicadas existentes
    try {
      const mergedCount = await mergeDuplicateConversations();
      if (mergedCount > 0) {
        console.log(`[${new Date().toLocaleTimeString()}] SYSTEM: ${mergedCount} grupos de conversas duplicadas foram unificados`);
      }
    } catch (mergeError) {
      console.error(`[${new Date().toLocaleTimeString()}] WARNING: Erro ao unificar conversas:`, mergeError.message);
    }

    // Carregar sessões salvas
    await loadSavedSessions();

    // Iniciar servidor
    httpServer.listen(PORT, () => {
      console.log(`[${new Date().toLocaleTimeString()}] SYSTEM: Servidor iniciado na porta ${PORT}`);
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Acesse: http://localhost:${PORT}`);
      console.log(`API disponível em: http://localhost:${PORT}/api`);
      console.log(`Chatwood ativo em: http://localhost:${PORT}`);
      console.log(`\nSessões salvas carregadas automaticamente`);
    });
  } catch (error) {
    console.error('Erro ao inicializar servidor:', error);
    process.exit(1);
  }
};

// Reconectar sessão
app.post('/api/sessions/:sessionId/reconnect', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessions.has(sessionId)) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    const session = sessions.get(sessionId);

    if (session.isInitializing) {
      return res.status(400).json({ error: 'Sessão já está tentando conectar' });
    }

    console.log(`[${new Date().toLocaleTimeString()}] INFO: Reconexão manual solicitada para sessão: ${session.name}`);

    // Marcar como inicializando
    session.isInitializing = true;
    session.isConnected = false;
    await updateSessionStatus(sessionId, 'connecting');

    try {
      // Tentar reinicializar o cliente
      await session.client.initialize();

      console.log(`[${new Date().toLocaleTimeString()}] SUCCESS: Reconexão manual bem-sucedida para sessão: ${session.name}`);

      res.json({
        success: true,
        message: 'Sessão reconectada com sucesso',
        session: {
          id: sessionId,
          name: session.name,
          isConnected: session.isConnected
        }
      });
    } catch (reconnectError) {
      console.error(`[${new Date().toLocaleTimeString()}] ERROR: Falha na reconexão manual para sessão ${session.name}:`, reconnectError.message);
      session.isInitializing = false;
      await updateSessionStatus(sessionId, 'disconnected');

      res.status(500).json({
        success: false,
        error: `Falha na reconexão: ${reconnectError.message}`
      });
    }
  } catch (error) {
    console.error('Erro ao reconectar sessão:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS DE AUTENTICAÇÃO ====================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e senha são obrigatórios' });
    }

    // Buscar usuário
    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Atualizar último login
    await updateLastLogin(user.id);

    // Gerar token JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Retornar dados do usuário (sem senha) e token
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      sector: user.sector,
      last_login: user.last_login
    };

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Cadastro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, full_name, sector } = req.body;

    // Validações
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se username já existe
    const existingUsername = await usernameExists(username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username já está em uso' });
    }

    // Verificar se email já existe
    const existingEmail = await emailExists(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }

    // Criar usuário
    const newUser = await createUser(username, email, password, full_name, 'user', sector);

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        sector: newUser.sector
      }
    });

  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token (rota protegida)
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        sector: user.sector,
        last_login: user.last_login
      }
    });

  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar usuários (apenas admin)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar usuário (apenas admin)
app.put('/api/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Verificar se o usuário existe
    const existingUser = await getUserById(userId, true);
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se username já existe (se estiver sendo alterado)
    if (updates.username && updates.username !== existingUser.username) {
      const usernameExists = await usernameExists(updates.username);
      if (usernameExists) {
        return res.status(400).json({ error: 'Username já está em uso' });
      }
    }

    // Verificar se email já existe (se estiver sendo alterado)
    if (updates.email && updates.email !== existingUser.email) {
      const emailExists = await emailExists(updates.email);
      if (emailExists) {
        return res.status(400).json({ error: 'Email já está em uso' });
      }
    }

    // Validar senha se fornecida
    if (updates.password && updates.password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const success = await updateUser(userId, updates);
    if (!success) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir usuário (apenas admin)
app.delete('/api/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar se não está tentando excluir a si mesmo
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
    }

    // Verificar se o usuário existe e é admin
    const user = await getUserById(userId, true);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Não é possível excluir um administrador' });
    }

    // Excluir usuário (desativar)
    const success = await deleteUser(userId);
    if (!success) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      message: 'Usuário excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alterar senha
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
    }

    // Buscar usuário atual
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha atual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    // Alterar senha
    await changePassword(req.user.id, newPassword);

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE ATRIBUIÇÃO DE CONVERSAS ====================

// Buscar agentes disponíveis
app.get('/api/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await getAvailableAgents();
    res.json({
      success: true,
      agents
    });
  } catch (error) {
    console.error('Erro ao buscar agentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar conversas não atribuídas
app.get('/api/conversations/unassigned', authenticateToken, async (req, res) => {
  try {
    const conversations = await getUnassignedConversations();
    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Erro ao buscar conversas não atribuídas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar conversas de um agente específico
app.get('/api/conversations/agent/:agentId', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.query;

    const conversations = await getConversationsByAgent(agentId, status);
    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Erro ao buscar conversas do agente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atribuir conversa a um agente
app.post('/api/conversations/:conversationId/assign', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'ID do agente é obrigatório' });
    }

    // Verificar se o agente existe e é válido
    const agent = await getUserById(agentId, true);
    if (!agent || !agent.is_active) {
      return res.status(400).json({ error: 'Agente não encontrado ou inativo' });
    }

    if (agent.role !== 'agent' && agent.role !== 'admin') {
      return res.status(400).json({ error: 'Usuário não é um agente válido' });
    }

    const success = await assignConversationToAgent(conversationId, agentId);
    if (!success) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    res.json({
      success: true,
      message: 'Conversa atribuída com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atribuir conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover atribuição de conversa
app.post('/api/conversations/:conversationId/unassign', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const success = await unassignConversation(conversationId);
    if (!success) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    res.json({
      success: true,
      message: 'Atribuição removida com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover atribuição:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar rota de conversas recentes para incluir filtro por agente
app.get('/api/conversations/recent', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, agentId } = req.query;

    // Se o usuário é agente, mostrar apenas suas conversas
    // Se é admin, pode filtrar por agente específico ou ver todas
    let targetAgentId = agentId;

    if (req.user.role === 'agent') {
      targetAgentId = req.user.id;
    } else if (req.user.role === 'admin' && !agentId) {
      targetAgentId = null; // Admin vê todas as conversas
    }

    const conversations = await getRecentConversations(parseInt(limit), targetAgentId);

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Erro ao buscar conversas recentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para obter foto de perfil do contato
const getContactProfilePicture = async (client, contactId) => {
  try {
    if (!client || !client.isConnected) {
      console.log('[PROFILE PIC] Cliente não conectado');
      return null;
    }

    const contact = await client.getContactById(contactId);

    if (contact) {
      const profilePicUrl = await contact.getProfilePicUrl();

      if (profilePicUrl) {
        console.log(`[PROFILE PIC] Foto de perfil para ${contact.name || contact.number}: ${profilePicUrl}`);
        return profilePicUrl;
      } else {
        console.log(`[PROFILE PIC] Nenhuma foto de perfil encontrada para ${contact.name || contact.number}.`);
        return null;
      }
    } else {
      console.log(`[PROFILE PIC] Contato com ID ${contactId} não encontrado.`);
      return null;
    }
  } catch (error) {
    console.error(`[PROFILE PIC] Erro ao obter foto de perfil para ${contactId}:`, error.message);
    return null;
  }
};

// Função para obter informações completas do contato
const getContactInfo = async (client, contactId) => {
  try {

    const contact = await client.getContactById(contactId);
    console.log(contact)
    if (contact) {
      const profilePicUrl = await contact.getProfilePicUrl();
      const contactName = contact.pushname || contact.name || null;

      return {
        profilePicture: profilePicUrl,
        contactName
      };
    } else {
      console.log(`[CONTACT INFO] Contato com ID ${contactId} não encontrado.`);
      return { profilePicture: null, contactName: null };
    }
  } catch (error) {
    console.error(`[CONTACT INFO] Erro ao obter informações do contato ${contactId}:`, error.message);
    return { profilePicture: null, contactName: null };
  }
};

// Buscar informações de um contato específico
app.get('/api/attendance/contacts/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const currentClient = getCurrentClient();

    if (!currentClient || !currentClient.isConnected) {
      return res.status(400).json({ error: 'WhatsApp não está conectado' });
    }

    // Formatar o número do telefone
    const formattedPhone = phone.replace(/\D/g, '');
    const chatId = `55${formattedPhone}@c.us`;

    // Obter informações completas do contato
    const contactInfo = await getContactInfo(currentClient, chatId);

    res.json({
      success: true,
      contact: {
        phone: formattedPhone,
        chatId,
        profilePicture: contactInfo.profilePicture,
        contactName: contactInfo.contactName
      }
    });

  } catch (error) {
    console.error('Erro ao buscar informações do contato:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar foto de perfil de um contato específico
app.get('/api/attendance/contacts/:phone/profile-picture', async (req, res) => {
  try {
    const { phone } = req.params;
    const currentClient = getCurrentClient();

    if (!currentClient || !currentClient.isConnected) {
      return res.status(400).json({ error: 'WhatsApp não está conectado' });
    }

    // Formatar o número do telefone
    const formattedPhone = phone.replace(/\D/g, '');
    const chatId = `55${formattedPhone}@c.us`;

    // Obter apenas a foto de perfil
    const profilePicture = await getContactProfilePicture(currentClient, chatId);

    res.json({
      success: true,
      profilePicture
    });

  } catch (error) {
    console.error('Erro ao buscar foto de perfil:', error);
    res.status(500).json({ error: error.message });
  }
});

startServer(); 