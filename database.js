import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

// Inicializar banco de dados
export const initDatabase = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, 'attendance.db'),
      driver: sqlite3.Database
    });

    // Criar tabelas
    await db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        name TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        session_id TEXT,
        chat_id TEXT,
        chat_type TEXT DEFAULT 'private',
        chat_name TEXT,
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'normal',
        assigned_to TEXT,
        last_seen DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER,
        customer_id INTEGER,
        session_id TEXT,
        direction TEXT NOT NULL, -- 'inbound' ou 'outbound'
        message_type TEXT DEFAULT 'text', -- 'text', 'image', 'file'
        content TEXT,
        media_url TEXT,
        message_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
        FOREIGN KEY (conversation_id) REFERENCES conversations (id),
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      );

      CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        status TEXT DEFAULT 'offline', -- 'online', 'offline', 'busy'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        session_name TEXT NOT NULL,
        status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'connecting'
        last_connected DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_customer ON messages(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_id ON whatsapp_sessions(session_id);
    `);

    console.log('Banco de dados inicializado com sucesso');
    return db;
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    throw error;
  }
};

// Funções para gerenciar clientes
export const createOrUpdateCustomer = async (phone, name = null, email = null) => {
  try {
    const existing = await db.get('SELECT * FROM customers WHERE phone = ?', [phone]);
    
    if (existing) {
      await db.run(
        'UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), updated_at = CURRENT_TIMESTAMP WHERE phone = ?',
        [name, email, phone]
      );
      return existing;
    } else {
      const result = await db.run(
        'INSERT INTO customers (phone, name, email) VALUES (?, ?, ?)',
        [phone, name, email]
      );
      return { id: result.lastID, phone, name, email };
    }
  } catch (error) {
    console.error('Erro ao criar/atualizar cliente:', error);
    throw error;
  }
};

export const getCustomerByPhone = async (phone) => {
  try {
    return await db.get('SELECT * FROM customers WHERE phone = ?', [phone]);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    throw error;
  }
};

// Funções para gerenciar conversas
export const createConversation = async (customerId, sessionId, chatId, chatType = 'private', chatName = null) => {
  try {
    const result = await db.run(
      'INSERT INTO conversations (customer_id, session_id, chat_id, chat_type, chat_name) VALUES (?, ?, ?, ?, ?)',
      [customerId, sessionId, chatId, chatType, chatName]
    );
    return { id: result.lastID, customer_id: customerId, session_id: sessionId, chat_id: chatId, chat_type: chatType, chat_name: chatName };
  } catch (error) {
    console.error('Erro ao criar conversa:', error);
    throw error;
  }
};

export const getActiveConversation = async (customerId, chatId) => {
  try {
    return await db.get(
      'SELECT * FROM conversations WHERE customer_id = ? AND chat_id = ? AND status = "open" ORDER BY created_at DESC LIMIT 1',
      [customerId, chatId]
    );
  } catch (error) {
    console.error('Erro ao buscar conversa ativa:', error);
    throw error;
  }
};

export const updateConversationStatus = async (conversationId, status) => {
  try {
    await db.run(
      'UPDATE conversations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, conversationId]
    );
  } catch (error) {
    console.error('Erro ao atualizar status da conversa:', error);
    throw error;
  }
};

export const markConversationAsSeen = async (conversationId) => {
  try {
    await db.run(
      'UPDATE conversations SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );
  } catch (error) {
    console.error('Erro ao marcar conversa como visualizada:', error);
    throw error;
  }
};

// Funções para gerenciar mensagens
export const saveMessage = async (conversationId, customerId, sessionId, direction, content, messageType = 'text', mediaUrl = null, messageId = null) => {
  try {
    const result = await db.run(
      'INSERT INTO messages (conversation_id, customer_id, session_id, direction, content, message_type, media_url, message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [conversationId, customerId, sessionId, direction, content, messageType, mediaUrl, messageId]
    );
    return { id: result.lastID };
  } catch (error) {
    console.error('Erro ao salvar mensagem:', error);
    throw error;
  }
};

export const getConversationMessages = async (conversationId, limit = 50) => {
  try {
    return await db.all(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ?',
      [conversationId, limit]
    );
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    throw error;
  }
};

export const getCustomerHistory = async (customerId, limit = 100) => {
  try {
    return await db.all(
      `SELECT m.*, c.status as conversation_status 
       FROM messages m 
       LEFT JOIN conversations c ON m.conversation_id = c.id 
       WHERE m.customer_id = ? 
       ORDER BY m.timestamp DESC 
       LIMIT ?`,
      [customerId, limit]
    );
  } catch (error) {
    console.error('Erro ao buscar histórico do cliente:', error);
    throw error;
  }
};

// Funções para dashboard
export const getDashboardStats = async () => {
  try {
    const stats = await db.get(`
      SELECT 
        COUNT(DISTINCT c.id) as total_conversations,
        COUNT(DISTINCT CASE WHEN c.status = 'open' THEN c.id END) as open_conversations,
        COUNT(DISTINCT cu.id) as total_customers,
        COUNT(DISTINCT m.id) as total_messages
      FROM conversations c
      LEFT JOIN customers cu ON c.customer_id = cu.id
      LEFT JOIN messages m ON c.id = m.conversation_id
    `);
    
    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }
};

export const getRecentConversations = async (limit = 10) => {
  try {
    return await db.all(`
      SELECT 
        c.*,
        cu.name as customer_name,
        cu.phone as customer_phone,
        COUNT(m.id) as message_count,
        MAX(m.timestamp) as last_message_time,
        CASE 
          WHEN c.last_seen IS NULL OR c.last_seen < MAX(m.timestamp) THEN 1 
          ELSE 0 
        END as has_unread_messages
      FROM conversations c
      LEFT JOIN customers cu ON c.customer_id = cu.id
      LEFT JOIN messages m ON c.id = m.conversation_id
      GROUP BY c.id
      ORDER BY has_unread_messages DESC, MAX(m.timestamp) DESC, c.updated_at DESC
      LIMIT ?
    `, [limit]);
  } catch (error) {
    console.error('Erro ao buscar conversas recentes:', error);
    throw error;
  }
};

// Funções para gerenciar sessões WhatsApp
export const saveWhatsAppSession = async (sessionId, sessionName) => {
  try {
    const existing = await db.get('SELECT * FROM whatsapp_sessions WHERE session_id = ?', [sessionId]);
    
    if (existing) {
      await db.run(
        'UPDATE whatsapp_sessions SET session_name = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
        [sessionName, sessionId]
      );
      return existing;
    } else {
      const result = await db.run(
        'INSERT INTO whatsapp_sessions (session_id, session_name) VALUES (?, ?)',
        [sessionId, sessionName]
      );
      return { id: result.lastID, session_id: sessionId, session_name: sessionName };
    }
  } catch (error) {
    console.error('Erro ao salvar sessão WhatsApp:', error);
    throw error;
  }
};

export const updateSessionStatus = async (sessionId, status) => {
  try {
    const lastConnected = status === 'connected' ? 'CURRENT_TIMESTAMP' : 'last_connected';
    await db.run(
      `UPDATE whatsapp_sessions SET status = ?, last_connected = ${lastConnected}, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?`,
      [status, sessionId]
    );
  } catch (error) {
    console.error('Erro ao atualizar status da sessão:', error);
    throw error;
  }
};

export const getAllSessions = async () => {
  try {
    return await db.all(
      'SELECT * FROM whatsapp_sessions ORDER BY last_connected DESC, created_at DESC'
    );
  } catch (error) {
    console.error('Erro ao buscar sessões:', error);
    throw error;
  }
};

export const getSessionById = async (sessionId) => {
  try {
    return await db.get('SELECT * FROM whatsapp_sessions WHERE session_id = ?', [sessionId]);
  } catch (error) {
    console.error('Erro ao buscar sessão:', error);
    throw error;
  }
};

export const deleteSession = async (sessionId) => {
  try {
    await db.run('DELETE FROM whatsapp_sessions WHERE session_id = ?', [sessionId]);
  } catch (error) {
    console.error('Erro ao deletar sessão:', error);
    throw error;
  }
};

export default db; 