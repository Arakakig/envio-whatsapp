// Script para testar o fuso horário de Campo Grande
console.log('🕐 Testando fuso horário de Campo Grande...\n');

// Horário atual em UTC
const now = new Date();
console.log('Horário UTC:', now.toISOString());

// Horário em Campo Grande (GMT-4)
const campoGrandeTime = new Date(now.getTime() - (4 * 60 * 60 * 1000));
console.log('Horário Campo Grande (calculado):', campoGrandeTime.toISOString());

// Usando timezone do JavaScript
const campoGrandeLocal = now.toLocaleString('pt-BR', {
  timeZone: 'America/Campo_Grande',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});
console.log('Horário Campo Grande (timezone):', campoGrandeLocal);

// Comparação com Brasília
const brasiliaTime = now.toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});
console.log('Horário Brasília (timezone):', brasiliaTime);

console.log('\n✅ Teste concluído!');
console.log('📝 Campo Grande deve estar 1 hora atrás de Brasília'); 