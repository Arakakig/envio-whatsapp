@echo off
echo ========================================
echo LIMPEZA E REINSTALACAO DO PROJETO
echo ========================================
echo.

echo 1. Parando processos Node.js...
taskkill /F /IM node.exe 2>nul
echo.

echo 2. Removendo node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo node_modules removido.
) else (
    echo node_modules nao encontrado.
)
echo.

echo 3. Removendo package-lock.json...
if exist package-lock.json (
    del package-lock.json
    echo package-lock.json removido.
) else (
    echo package-lock.json nao encontrado.
)
echo.

echo 4. Limpando cache do npm...
npm cache clean --force
echo Cache limpo.
echo.

echo 5. Reinstalando dependencias...
npm install
echo.

echo 6. Verificando instalacao...
npm run build
echo.

echo ========================================
echo INSTALACAO CONCLUIDA!
echo ========================================
echo.
echo Para iniciar o projeto, execute:
echo npm start
echo.
pause 