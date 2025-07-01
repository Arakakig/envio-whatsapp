@echo off
echo ========================================
echo ENVIO WHATSAPP - EXECUTANDO PROGRAMA
echo ========================================
echo.

echo Verificando se o Node.js esta instalado...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale o Node.js primeiro.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js encontrado!
echo.

echo Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias pela primeira vez...
    npm install
    if errorlevel 1 (
        echo ERRO: Falha na instalacao das dependencias!
        echo Execute: install-clean.bat
        pause
        exit /b 1
    )
)

echo Dependencias OK!
echo.

echo Parando processos anteriores...
taskkill /F /IM node.exe 2>nul
echo.

echo Iniciando o programa...
echo.
echo ========================================
echo FRONTEND: http://localhost:5173
echo BACKEND:  http://localhost:3001
echo ========================================
echo.

echo Aguardando o servidor iniciar...
timeout /t 5 /nobreak >nul

echo Abrindo no navegador...
start http://localhost:5173

echo.
echo Pressione Ctrl+C para parar
echo.

npm start 