import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function ensureColumns(db) {
  const columns = await db.all("PRAGMA table_info(conversations);");
  const colNames = columns.map(c => c.name);
  if (!colNames.includes('chat_id')) {
    await db.run('ALTER TABLE conversations ADD COLUMN chat_id TEXT;');
    console.log('Coluna chat_id adicionada.');
  }
  if (!colNames.includes('chat_type')) {
    await db.run("ALTER TABLE conversations ADD COLUMN chat_type TEXT DEFAULT 'private';");
    console.log('Coluna chat_type adicionada.');
  }
  if (!colNames.includes('chat_name')) {
    await db.run('ALTER TABLE conversations ADD COLUMN chat_name TEXT;');
    console.log('Coluna chat_name adicionada.');
  }
  if (!colNames.includes('last_seen')) {
    await db.run('ALTER TABLE conversations ADD COLUMN last_seen DATETIME;');
    console.log('Coluna last_seen adicionada.');
  }
}

async function fixConversations() {
  const db = await open({
    filename: './attendance.db',
    driver: sqlite3.Database
  });

  await ensureColumns(db);

  const conversations = await db.all('SELECT id, chat_id, chat_type, chat_name FROM conversations');
  console.log(`Total de conversas encontradas: ${conversations.length}`);
  let updated = 0;

  for (const conv of conversations) {
    let chatType = conv.chat_type;
    let chatName = conv.chat_name;
    if (!chatType || chatType === 'undefined' || chatType === '') {
      if (conv.chat_id?.endsWith('@c.us')) chatType = 'private';
      else if (conv.chat_id?.endsWith('@g.us')) chatType = 'group';
      else chatType = 'private';
    }
    if (!chatName || chatName === 'undefined' || chatName === '') {
      chatName = conv.chat_id || 'Desconhecido';
    }
    if (chatType !== conv.chat_type || chatName !== conv.chat_name) {
      await db.run('UPDATE conversations SET chat_type = ?, chat_name = ? WHERE id = ?', [chatType, chatName, conv.id]);
      console.log(`Atualizado: ID ${conv.id} | chat_type: ${conv.chat_type} -> ${chatType} | chat_name: ${conv.chat_name} -> ${chatName}`);
      updated++;
    }
  }

  if (updated === 0) {
    console.log('Nenhuma conversa precisou ser atualizada.');
  }
  console.log(`Conversas atualizadas: ${updated}`);
  await db.close();
}

fixConversations(); 