import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkDatabase() {
  try {
    const db = await open({
      filename: path.join(__dirname, 'attendance.db'),
      driver: sqlite3.Database
    });

    console.log('Verificando estrutura do banco de dados...');

    // Verificar colunas da tabela conversations
    const conversationsColumns = await db.all('PRAGMA table_info(conversations);');
    console.log('\nColunas da tabela conversations:');
    conversationsColumns.forEach(col => console.log(`- ${col.name} (${col.type})`));

    // Verificar algumas conversas
    const conversations = await db.all('SELECT * FROM conversations LIMIT 5');
    console.log('\nPrimeiras 5 conversas:');
    conversations.forEach(conv => {
      console.log(`ID: ${conv.id}, Customer ID: ${conv.customer_id}, Chat ID: ${conv.chat_id}, Status: ${conv.status}`);
    });

    // Verificar tabelas
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table';");
    console.log('Tabelas encontradas:', tables.map(t => t.name));

    // Verificar clientes
    const customers = await db.all('SELECT * FROM customers LIMIT 5;');
    console.log('\nClientes (primeiros 5):', customers.length);
    customers.forEach(c => console.log(`- ${c.phone} (${c.name || 'sem nome'})`));

    // Verificar mensagens
    const messages = await db.all('SELECT * FROM messages LIMIT 5;');
    console.log('\nMensagens (primeiras 5):', messages.length);
    messages.forEach(m => console.log(`- ID: ${m.id}, Conversa: ${m.conversation_id}, Direção: ${m.direction}, Conteúdo: ${m.content?.substring(0, 50)}...`));

    // Estatísticas
    console.log('\n=== ESTATÍSTICAS ===');
    console.log(`Total de conversas: ${conversations.length}`);
    console.log(`Conversas abertas: ${conversations.filter(c => c.status === 'open').length}`);
    console.log(`Total de clientes: ${customers.length}`);
    console.log(`Total de mensagens: ${messages.length}`);

    // Verificar conversas duplicadas por chat_id
    console.log('\n=== VERIFICANDO DUPLICATAS POR CHAT_ID ===');
    const chatIdGroups = {};
    conversations.forEach(conv => {
      if (!chatIdGroups[conv.chat_id]) {
        chatIdGroups[conv.chat_id] = [];
      }
      chatIdGroups[conv.chat_id].push(conv);
    });

    const duplicates = Object.entries(chatIdGroups).filter(([chatId, convs]) => convs.length > 1);
    if (duplicates.length > 0) {
      console.log(`\n⚠️  ENCONTRADAS ${duplicates.length} CONVERSAS DUPLICADAS:`);
      duplicates.forEach(([chatId, convs]) => {
        console.log(`\nChat ID: ${chatId}`);
        convs.forEach(conv => {
          console.log(`  - ID: ${conv.id}, Cliente: ${conv.customer_id}, Status: ${conv.status}, Criada: ${conv.created_at}`);
        });
      });
    } else {
      console.log('\n✅ Nenhuma conversa duplicada encontrada por chat_id');
    }

    // Verificar conversas por cliente
    console.log('\n=== CONVERSAS POR CLIENTE ===');
    const customerGroups = {};
    conversations.forEach(conv => {
      if (!customerGroups[conv.customer_id]) {
        customerGroups[conv.customer_id] = [];
      }
      customerGroups[conv.customer_id].push(conv);
    });

    const multipleConversations = Object.entries(customerGroups).filter(([customerId, convs]) => convs.length > 1);
    if (multipleConversations.length > 0) {
      console.log(`\n⚠️  CLIENTES COM MÚLTIPLAS CONVERSAS:`);
      multipleConversations.forEach(([customerId, convs]) => {
        const customer = customers.find(c => c.id == customerId);
        console.log(`\nCliente: ${customer?.name || customer?.phone || customerId}`);
        convs.forEach(conv => {
          console.log(`  - ID: ${conv.id}, Chat ID: ${conv.chat_id}, Status: ${conv.status}, Criada: ${conv.created_at}`);
        });
      });
    } else {
      console.log('\n✅ Nenhum cliente com múltiplas conversas');
    }

    await db.close();
  } catch (error) {
    console.error('Erro ao verificar banco:', error);
  }
}

checkDatabase().catch(console.error); 