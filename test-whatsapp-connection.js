import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';

async function testWhatsAppConnection() {
  console.log('🔍 Testando conexão do WhatsApp...');
  
  try {
    // Verificar se há sessões salvas
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const authDir = path.join(__dirname, '.wwebjs_auth');
    
    if (fs.existsSync(authDir)) {
      const sessions = fs.readdirSync(authDir);
      console.log(`📁 Sessões encontradas: ${sessions.length}`);
      
      for (const session of sessions) {
        console.log(`  - ${session}`);
      }
    } else {
      console.log('❌ Nenhuma sessão salva encontrada');
    }
    
    // Tentar criar uma sessão de teste
    console.log('\n🔄 Criando sessão de teste...');
    
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'test-connection',
        dataPath: `./.wwebjs_auth/test-connection`
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

    let qrGenerated = false;
    let connected = false;

    client.on('qr', async (qr) => {
      if (!qrGenerated) {
        console.log('📱 QR Code gerado - WhatsApp não está autenticado');
        qrGenerated = true;
        
        try {
          const qrDataUrl = await qrcode.toDataURL(qr);
          console.log('🔗 QR Code (primeiros 100 chars):', qrDataUrl.substring(0, 100) + '...');
        } catch (err) {
          console.log('❌ Erro ao gerar QR Code:', err.message);
        }
      }
    });

    client.on('ready', () => {
      console.log('✅ WhatsApp conectado e pronto!');
      connected = true;
      
      // Testar envio de mensagem
      testSendMessage(client);
    });

    client.on('disconnected', (reason) => {
      console.log('❌ WhatsApp desconectado:', reason);
    });

    client.on('auth_failure', (msg) => {
      console.log('❌ Falha na autenticação:', msg);
    });

    // Inicializar com timeout
    const initPromise = client.initialize();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout na inicialização')), 30000);
    });

    await Promise.race([initPromise, timeoutPromise]);
    
    if (!connected) {
      console.log('⏰ Timeout - WhatsApp não conseguiu conectar em 30 segundos');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

async function testSendMessage(client) {
  try {
    console.log('\n📤 Testando envio de mensagem...');
    
    // Número de teste (substitua por um número válido)
    const testNumber = '556733017757@c.us';
    
    console.log(`📞 Tentando enviar para: ${testNumber}`);
    
    const message = `Teste de conexão - ${new Date().toLocaleString()}`;
    
    await client.sendMessage(testNumber, message);
    console.log('✅ Mensagem enviada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.message);
  } finally {
    // Fechar cliente após teste
    setTimeout(() => {
      client.destroy();
      console.log('🔚 Cliente fechado');
    }, 5000);
  }
}

// Executar teste
testWhatsAppConnection(); 