# 🧪 Teste da Funcionalidade de Validação

## 🔍 Como Testar o Botão "Validar Números"

### **1. Verificar se o Servidor está Rodando**
```bash
# Verificar se a porta 3001 está ativa
netstat -an | findstr :3001
```

### **2. Testar a API Diretamente**
Abra o arquivo `test-validation.html` no navegador e clique em "Testar Validação"

### **3. Testar no Frontend**

#### **Passo a Passo:**
1. **Acesse**: http://localhost:5173
2. **Adicione contatos**:
   - Importe o CSV ou adicione manualmente
   - Exemplo: `67981566794`
3. **Clique em "Validar Números"**
4. **Verifique o console** (F12) para logs
5. **Aguarde o resultado**

### **4. Verificar Logs**

#### **No Console do Navegador (F12):**
```
Iniciando validação de números...
Contatos para validar: [...]
Fazendo requisição para validar números...
Resposta recebida: Response {...}
Dados da resposta: {...}
```

#### **No Terminal do Servidor:**
```
Recebida requisição de validação: {...}
Validando X contatos
Validando contato: {...}
Iniciando validação para: {...}
Número após remoção de caracteres especiais: ...
```

### **5. Possíveis Problemas e Soluções**

#### **Problema: Botão não responde**
- **Solução**: Verifique se há contatos na lista
- **Verificação**: O botão fica desabilitado se não há contatos

#### **Problema: Erro "Failed to fetch"**
- **Solução**: Verifique se o servidor está rodando na porta 3001
- **Comando**: `npm start` (não apenas `npm run dev`)

#### **Problema: Validação não aparece**
- **Solução**: Verifique o console do navegador para erros
- **Verificação**: Deve aparecer "Validação concluída!" na tela

#### **Problema: WhatsApp não conectado**
- **Solução**: Conecte o WhatsApp primeiro
- **Nota**: A validação funciona mesmo sem WhatsApp, mas não verifica se o número está registrado

### **6. Teste com Diferentes Números**

#### **Números Válidos:**
- `67981566794` → ✅ Válido
- `981566794` → ✅ Válido (adiciona 67)
- `67981566794` → ✅ Válido (formato correto)

#### **Números Inválidos:**
- `123` → ❌ Muito curto
- `67981566794` → ❌ Duplicado (se já existir)
- `67981566794` → ❌ Começa com 3 (se aplicável)

### **7. Verificar Resultados**

#### **Interface Visual:**
- **Chips de Status**: Verde (válido) / Vermelho (inválido)
- **Resumo**: Total, Válidos, Inválidos
- **Lista de Números Inválidos**: Expandível com detalhes

#### **Console do Navegador:**
```javascript
// Deve mostrar algo como:
{
  "success": true,
  "validationResults": [...],
  "summary": {
    "total": 2,
    "valid": 1,
    "invalid": 1
  }
}
```

### **8. Debug Avançado**

#### **Se ainda não funcionar:**
1. **Abra o DevTools** (F12)
2. **Vá na aba Network**
3. **Clique em "Validar Números"**
4. **Verifique se a requisição aparece**
5. **Clique na requisição para ver detalhes**

#### **Verificar CORS:**
- Se houver erro de CORS, verifique se o servidor está configurado corretamente
- O servidor deve ter `app.use(cors());`

---

**✅ Se tudo estiver funcionando, você verá:**
- Botão com loading durante a validação
- Mensagem de sucesso após validação
- Resultados visuais na interface
- Logs detalhados no console 