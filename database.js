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

    // Configurar fuso horário para GMT-4 (horário de Campo Grande)
    await db.run("PRAGMA timezone = '-04:00'");

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
        customer_id INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        chat_id TEXT,
        chat_type TEXT DEFAULT 'private',
        chat_name TEXT,
        status TEXT DEFAULT 'open', -- 'open', 'closed', 'pending'
        assigned_agent_id INTEGER, -- ID do agente responsável pela conversa
        last_seen DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (assigned_agent_id) REFERENCES users(id)
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

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'user', -- 'admin', 'user', 'agent'
        is_active BOOLEAN DEFAULT 1,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customer_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        note TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS internal_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_customer ON messages(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_id ON whatsapp_sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);
      CREATE INDEX IF NOT EXISTS idx_internal_messages_sender ON internal_messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_internal_messages_receiver ON internal_messages(receiver_id);
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
    // Primeiro, buscar por customer_id (que é baseado no número de telefone)
    // Isso garante que não criemos múltiplas conversas para o mesmo número
    return await db.get(
      'SELECT * FROM conversations WHERE customer_id = ? AND status = "open" ORDER BY created_at DESC LIMIT 1',
      [customerId]
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
    // Usar o mesmo fuso horário das mensagens (UTC)
    const now = new Date();
    const utcTimestamp = now.toISOString();
    
    await db.run(
      'UPDATE conversations SET last_seen = ? WHERE id = ?',
      [utcTimestamp, conversationId]
    );
    
    console.log(`[DB] Conversa ${conversationId} marcada como lida em: ${utcTimestamp}`);
  } catch (error) {
    console.error('Erro ao marcar conversa como visualizada:', error);
    throw error;
  }
};

// Função para unificar conversas duplicadas
export const mergeDuplicateConversations = async () => {
  try {
    console.log('🔧 Iniciando unificação de conversas duplicadas...');
    
    // Buscar todas as conversas agrupadas por customer_id
    const duplicateGroups = await db.all(`
      SELECT customer_id, COUNT(*) as count, GROUP_CONCAT(id) as conversation_ids
      FROM conversations 
      WHERE status = 'open'
      GROUP BY customer_id 
      HAVING COUNT(*) > 1
    `);
    
    console.log(`📊 Encontradas ${duplicateGroups.length} conversas duplicadas`);
    
    for (const group of duplicateGroups) {
      const conversationIds = group.conversation_ids.split(',').map(id => parseInt(id.trim()));
      const keepId = Math.min(...conversationIds); // Manter a conversa mais antiga
      const deleteIds = conversationIds.filter(id => id !== keepId);
      
      console.log(`🔄 Unificando conversas do cliente ${group.customer_id}: manter ${keepId}, remover ${deleteIds.join(', ')}`);
      
      // Mover todas as mensagens para a conversa principal
      for (const deleteId of deleteIds) {
        await db.run(
          'UPDATE messages SET conversation_id = ? WHERE conversation_id = ?',
          [keepId, deleteId]
        );
        
        // Deletar a conversa duplicada
        await db.run('DELETE FROM conversations WHERE id = ?', [deleteId]);
      }
    }
    
    console.log('✅ Unificação de conversas concluída!');
    return duplicateGroups.length;
  } catch (error) {
    console.error('❌ Erro ao unificar conversas:', error);
    throw error;
  }
};

// Funções para gerenciar mensagens
export const saveMessage = async (conversationId, customerId, sessionId, direction, content, messageType = 'text', mediaUrl = null, messageId = null) => {
  try {
    // Criar timestamp no fuso horário local (GMT-4 - Campo Grande)
    const now = new Date();
    const localTimestamp = new Date(now.getTime() - (4 * 60 * 60 * 1000)).toISOString();
    
    const result = await db.run(
      'INSERT INTO messages (conversation_id, customer_id, session_id, direction, content, message_type, media_url, message_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [conversationId, customerId, sessionId, direction, content, messageType, mediaUrl, messageId, localTimestamp]
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
    console.log('[DB] Buscando estatísticas do dashboard...');
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
    
    console.log('[DB] Estatísticas obtidas:', stats);
    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }
};

export const getRecentConversations = async (limit = 10, agentId = null) => {
  try {
    console.log('[DB] Buscando conversas recentes, limite:', limit);
    let query = `
      SELECT 
        c.*,
        cu.name as customer_name,
        cu.phone as customer_phone,
        u.full_name as agent_name,
        u.username as agent_username,
        COUNT(m.id) as message_count,
        MAX(m.timestamp) as last_message_time,
        CASE 
          WHEN c.last_seen IS NULL OR c.last_seen < MAX(m.timestamp) THEN 1 
          ELSE 0 
        END as has_unread_messages
      FROM conversations c
      LEFT JOIN customers cu ON c.customer_id = cu.id
      LEFT JOIN users u ON c.assigned_agent_id = u.id
      LEFT JOIN messages m ON c.id = m.conversation_id
    `;
    
    const params = [];
    
    if (agentId) {
      query += ' WHERE c.assigned_agent_id = ?';
      params.push(agentId);
    }
    
    query += ' GROUP BY c.id ORDER BY has_unread_messages DESC, MAX(m.timestamp) DESC, c.updated_at DESC LIMIT ?';
    params.push(limit);
    
    console.log('[DB] Executando query de conversas...');
    const result = await db.all(query, params);
    console.log('[DB] Conversas encontradas:', result.length);
    
    return result;
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

// ==================== FUNÇÕES DE AUTENTICAÇÃO ====================

// Criar usuário
export const createUser = async (username, email, password, fullName, role = 'user', sector = null) => {
  try {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 10);
    
    const result = await db.run(
      'INSERT INTO users (username, email, password_hash, full_name, role, sector) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, passwordHash, fullName, role, sector]
    );
    
    return { id: result.lastID, username, email, full_name: fullName, role, sector };
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    throw error;
  }
};

// Buscar usuário por username
export const getUserByUsername = async (username) => {
  try {
    return await db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
  } catch (error) {
    console.error('Erro ao buscar usuário por username:', error);
    throw error;
  }
};

// Buscar usuário por email
export const getUserByEmail = async (email) => {
  try {
    return await db.get('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
  } catch (error) {
    console.error('Erro ao buscar usuário por email:', error);
    throw error;
  }
};

// Buscar usuário por ID
export const getUserById = async (userId, includeInactive = false) => {
  try {
    const query = includeInactive 
      ? 'SELECT id, username, email, full_name, role, sector, is_active, last_login, created_at FROM users WHERE id = ?'
      : 'SELECT id, username, email, full_name, role, sector, is_active, last_login, created_at FROM users WHERE id = ? AND is_active = 1';
    
    return await db.get(query, [userId]);
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error);
    throw error;
  }
};

// Atualizar último login
export const updateLastLogin = async (userId) => {
  try {
    await db.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  } catch (error) {
    console.error('Erro ao atualizar último login:', error);
    throw error;
  }
};

// Listar todos os usuários (apenas para admins)
export const getAllUsers = async () => {
  try {
    return await db.all('SELECT id, username, email, full_name, role, sector, is_active, last_login, created_at FROM users ORDER BY created_at DESC');
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    throw error;
  }
};

// Atualizar usuário
export const updateUser = async (userId, updates) => {
  try {
    const { username, email, full_name, role, sector, is_active, password } = updates;
    
    // Construir query dinamicamente baseada nos campos fornecidos
    const fields = [];
    const values = [];
    
    if (username !== undefined) {
      fields.push('username = ?');
      values.push(username);
    }
    
    if (email !== undefined) {
      fields.push('email = ?');
      values.push(email);
    }
    
    if (full_name !== undefined) {
      fields.push('full_name = ?');
      values.push(full_name);
    }
    
    if (role !== undefined) {
      fields.push('role = ?');
      values.push(role);
    }
    
    if (sector !== undefined) {
      fields.push('sector = ?');
      values.push(sector);
    }
    
    if (is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }
    
    // Tratar senha se fornecida
    if (password !== undefined && password.trim() !== '') {
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.default.hash(password, 10);
      fields.push('password_hash = ?');
      values.push(passwordHash);
    }
    
    // Sempre adicionar updated_at
    fields.push('updated_at = CURRENT_TIMESTAMP');
    
    // Adicionar userId no final
    values.push(userId);
    
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    
    const result = await db.run(query, values);
    
    return result.changes > 0;
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    throw error;
  }
};

// Alterar senha
export const changePassword = async (userId, newPassword) => {
  try {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(newPassword, 10);
    
    const result = await db.run(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId]
    );
    
    return result.changes > 0;
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    throw error;
  }
};

// Verificar se username existe
export const usernameExists = async (username) => {
  try {
    const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    return !!user;
  } catch (error) {
    console.error('Erro ao verificar username:', error);
    throw error;
  }
};

// Verificar se email existe
export const emailExists = async (email) => {
  try {
    const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    return !!user;
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    throw error;
  }
};

// Deletar usuário
export const deleteUser = async (userId) => {
  try {
    await db.run('DELETE FROM users WHERE id = ?', [userId]);
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    throw error;
  }
};
// ==================== FUNÇÕES DE ATRIBUIÇÃO DE CONVERSAS ====================

// Atribuir conversa a um agente
export const assignConversationToAgent = async (conversationId, agentId) => {
  try {
    const result = await db.run(
      'UPDATE conversations SET assigned_agent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [agentId, conversationId]
    );
    
    return result.changes > 0;
  } catch (error) {
    console.error('Erro ao atribuir conversa:', error);
    throw error;
  }
};

// Remover atribuição de conversa
export const unassignConversation = async (conversationId) => {
  try {
    const result = await db.run(
      'UPDATE conversations SET assigned_agent_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );
    
    return result.changes > 0;
  } catch (error) {
    console.error('Erro ao remover atribuição da conversa:', error);
    throw error;
  }
};

// Buscar conversas atribuídas a um agente
export const getConversationsByAgent = async (agentId, status = null) => {
  try {
    let query = `
      SELECT 
        c.*,
        cu.name as customer_name,
        cu.phone as customer_phone,
        u.full_name as agent_name,
        COUNT(m.id) as message_count,
        MAX(m.timestamp) as last_message_time,
        CASE 
          WHEN c.last_seen IS NULL OR c.last_seen < MAX(m.timestamp) THEN 1 
          ELSE 0 
        END as has_unread_messages
      FROM conversations c
      LEFT JOIN customers cu ON c.customer_id = cu.id
      LEFT JOIN users u ON c.assigned_agent_id = u.id
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.assigned_agent_id = ?
    `;
    
    const params = [agentId];
    
    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }
    
    query += ' GROUP BY c.id ORDER BY has_unread_messages DESC, MAX(m.timestamp) DESC';
    
    return await db.all(query, params);
  } catch (error) {
    console.error('Erro ao buscar conversas do agente:', error);
    throw error;
  }
};

// Buscar conversas não atribuídas
export const getUnassignedConversations = async () => {
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
      WHERE c.assigned_agent_id IS NULL AND c.status = 'open'
      GROUP BY c.id
      ORDER BY has_unread_messages DESC, MAX(m.timestamp) DESC
    `);
  } catch (error) {
    console.error('Erro ao buscar conversas não atribuídas:', error);
    throw error;
  }
};

// Buscar agentes disponíveis (usuários com role 'agent' ou 'admin')
export const getAvailableAgents = async () => {
  try {
    return await db.all(`
      SELECT id, username, full_name, email, role, sector, is_active, last_login
      FROM users 
      WHERE (role = 'agent' OR role = 'admin') AND is_active = 1
      ORDER BY full_name
    `);
  } catch (error) {
    console.error('Erro ao buscar agentes disponíveis:', error);
    throw error;
  }
};

// Função para buscar mensagens novas desde um timestamp específico
export const getNewMessagesSince = async (sinceDate) => {
  try {
    const conversations = await db.all(`
      SELECT DISTINCT
        c.id as conversation_id,
        c.customer_id,
        c.chat_id,
        c.status,
        cust.phone as customer_phone,
        cust.name as customer_name,
        MAX(m.timestamp) as last_message_time,
        COUNT(m.id) as message_count,
        SUM(CASE WHEN m.direction = 'inbound' AND m.timestamp > c.last_seen THEN 1 ELSE 0 END) as unread_count
      FROM conversations c
      JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE m.timestamp > ?
      GROUP BY c.id, c.customer_id, c.chat_id, c.status, cust.phone, cust.name
      ORDER BY last_message_time DESC
    `, [sinceDate.toISOString()]);

    return conversations.map(conv => ({
      ...conv,
      has_unread_messages: conv.unread_count > 0
    }));
  } catch (error) {
    console.error('Erro ao buscar mensagens novas:', error);
    throw error;
  }
};

// ==================== FUNÇÕES PARA OBSERVAÇÕES DE CLIENTES ====================

// Adicionar observação a um cliente
export const addCustomerNote = async (customerId, userId, note) => {
  try {
    const result = await db.run(
      'INSERT INTO customer_notes (customer_id, user_id, note) VALUES (?, ?, ?)',
      [customerId, userId, note]
    );
    return { id: result.lastID };
  } catch (error) {
    console.error('Erro ao adicionar observação:', error);
    throw error;
  }
};

// Buscar observações de um cliente
export const getCustomerNotes = async (customerId, noteId = null) => {
  try {
    if (noteId) {
      // Buscar uma observação específica
      return await db.all(`
        SELECT cn.*, u.full_name as user_name, u.username
        FROM customer_notes cn
        JOIN users u ON cn.user_id = u.id
        WHERE cn.id = ?
        ORDER BY cn.created_at DESC
      `, [noteId]);
    } else {
      // Buscar todas as observações de um cliente
      return await db.all(`
        SELECT cn.*, u.full_name as user_name, u.username
        FROM customer_notes cn
        JOIN users u ON cn.user_id = u.id
        WHERE cn.customer_id = ?
        ORDER BY cn.created_at DESC
      `, [customerId]);
    }
  } catch (error) {
    console.error('Erro ao buscar observações:', error);
    throw error;
  }
};

// Atualizar observação
export const updateCustomerNote = async (noteId, note) => {
  try {
    const result = await db.run(
      'UPDATE customer_notes SET note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [note, noteId]
    );
    return result.changes > 0;
  } catch (error) {
    console.error('Erro ao atualizar observação:', error);
    throw error;
  }
};

// Deletar observação
export const deleteCustomerNote = async (noteId, userId) => {
  try {
    // Verificar se o usuário é o autor da observação ou admin
    const note = await db.get('SELECT * FROM customer_notes WHERE id = ?', [noteId]);
    if (!note) {
      throw new Error('Observação não encontrada');
    }
    
    const user = await getUserById(userId);
    if (note.user_id !== userId && user.role !== 'admin') {
      throw new Error('Sem permissão para deletar esta observação');
    }
    
    await db.run('DELETE FROM customer_notes WHERE id = ?', [noteId]);
    return true;
  } catch (error) {
    console.error('Erro ao deletar observação:', error);
    throw error;
  }
};

// ==================== FUNÇÕES PARA CHAT INTERNO ====================

// Enviar mensagem interna
export const sendInternalMessage = async (senderId, receiverId, message) => {
  try {
    const result = await db.run(
      'INSERT INTO internal_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [senderId, receiverId, message]
    );
    return { id: result.lastID };
  } catch (error) {
    console.error('Erro ao enviar mensagem interna:', error);
    throw error;
  }
};

// Buscar mensagens entre dois usuários
export const getInternalMessages = async (userId1, userId2, limit = 50) => {
  try {
    return await db.all(`
      SELECT im.*, 
             s.full_name as sender_name, s.username as sender_username,
             r.full_name as receiver_name, r.username as receiver_username
      FROM internal_messages im
      JOIN users s ON im.sender_id = s.id
      JOIN users r ON im.receiver_id = r.id
      WHERE (im.sender_id = ? AND im.receiver_id = ?) 
         OR (im.sender_id = ? AND im.receiver_id = ?)
      ORDER BY im.created_at DESC
      LIMIT ?
    `, [userId1, userId2, userId2, userId1, limit]);
  } catch (error) {
    console.error('Erro ao buscar mensagens internas:', error);
    throw error;
  }
};

// Buscar conversas internas de um usuário
export const getInternalConversations = async (userId) => {
  try {
    console.log('[DB] Buscando conversas internas para usuário:', userId);
    const conversations = await db.all(`
      SELECT DISTINCT
        CASE 
          WHEN im.sender_id = ? THEN im.receiver_id
          ELSE im.sender_id
        END as other_user_id,
        CASE 
          WHEN im.sender_id = ? THEN u2.full_name
          ELSE u1.full_name
        END as other_user_name,
        CASE 
          WHEN im.sender_id = ? THEN u2.username
          ELSE u1.username
        END as other_user_username,
        MAX(im.created_at) as last_message_time,
        COUNT(im.id) as message_count,
        SUM(CASE WHEN im.receiver_id = ? AND im.is_read = 0 THEN 1 ELSE 0 END) as unread_count
      FROM internal_messages im
      JOIN users u1 ON im.sender_id = u1.id
      JOIN users u2 ON im.receiver_id = u2.id
      WHERE im.sender_id = ? OR im.receiver_id = ?
      GROUP BY other_user_id, other_user_name, other_user_username
      ORDER BY last_message_time DESC
    `, [userId, userId, userId, userId, userId, userId]);
    
    console.log('[DB] Conversas internas encontradas:', conversations.length);
    return conversations;
  } catch (error) {
    console.error('Erro ao buscar conversas internas:', error);
    throw error;
  }
};

// Marcar mensagens como lidas
export const markInternalMessagesAsRead = async (senderId, receiverId) => {
  try {
    await db.run(
      'UPDATE internal_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [senderId, receiverId]
    );
    return true;
  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error);
    throw error;
  }
};

// Buscar mensagens não lidas de um usuário
export const getUnreadInternalMessages = async (userId) => {
  try {
    return await db.all(`
      SELECT im.*, u.full_name as sender_name, u.username as sender_username
      FROM internal_messages im
      JOIN users u ON im.sender_id = u.id
      WHERE im.receiver_id = ? AND im.is_read = 0
      ORDER BY im.created_at ASC
    `, [userId]);
  } catch (error) {
    console.error('Erro ao buscar mensagens não lidas:', error);
    throw error;
  }
};

export default db; 