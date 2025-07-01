# 🔧 Solução para Problemas de Frontend

## Problemas Comuns e Soluções

### 1. **Erro "hasCrash" ou "Failed to fetch"**

**Causa:** Dependências corrompidas ou incompatíveis

**Solução:**
```bash
# Opção 1: Script automático (Windows)
install-clean.bat

# Opção 2: Comandos manuais
taskkill /F /IM node.exe
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install
```

### 2. **Erro de Versão do Node.js**

**Requisitos:**
- Node.js: v18.0.0 ou superior
- npm: v8.0.0 ou superior

**Verificar versões:**
```bash
node --version
npm --version
```

### 3. **Problemas de Permissão (Windows)**

**Solução:**
```bash
# Executar PowerShell como Administrador
Set-ExecutionPolicy RemoteSigned
npm install
```

### 4. **Erro de Porta em Uso**

**Solução:**
```bash
# Verificar portas em uso
netstat -ano | findstr :5173
netstat -ano | findstr :3001

# Matar processo específico
taskkill /PID [numero_do_processo] /F
```

### 5. **Problemas com Vite/React**

**Solução:**
```bash
# Limpar cache do Vite
npm run build
npm run dev
```

## 📋 Checklist de Instalação

### ✅ Pré-requisitos
- [ ] Node.js v18+ instalado
- [ ] npm v8+ instalado
- [ ] Git instalado
- [ ] PowerShell como Administrador

### ✅ Instalação
- [ ] Clonar repositório
- [ ] Executar `install-clean.bat` ou comandos manuais
- [ ] Verificar se não há erros na instalação
- [ ] Testar `npm run build`

### ✅ Teste
- [ ] Executar `npm start`
- [ ] Acessar `http://localhost:5173`
- [ ] Verificar se o frontend carrega
- [ ] Testar conexão com backend

## 🚨 Problemas Específicos

### **Erro: "Cannot find module"**
```bash
npm install
npm run build
```

### **Erro: "Port already in use"**
```bash
taskkill /F /IM node.exe
npm start
```

### **Erro: "Permission denied"**
- Executar PowerShell como Administrador
- Verificar antivírus/firewall

### **Erro: "hasCrash"**
- Limpar cache do navegador
- Usar modo incógnito
- Verificar extensões do navegador

## 📞 Suporte

Se os problemas persistirem:

1. **Verificar logs:**
   ```bash
   npm run dev
   # Verificar erros no terminal
   ```

2. **Testar em navegador diferente:**
   - Chrome
   - Firefox
   - Edge

3. **Verificar firewall/antivírus:**
   - Permitir Node.js
   - Permitir portas 3001 e 5173

4. **Reinstalar Node.js:**
   - Desinstalar completamente
   - Baixar versão LTS mais recente
   - Reinstalar 