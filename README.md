# Script de build para apps no Expo Bare Workflow

Este script foi criado com a intenção de facilitar para devs que utilizam o Expo dentro de seus projetos React Native, mas que usam ele em Bare Workflow, que em outras palavras, se refere a um projeto exportado, com as pastas de iOS e Android visiveis para modificações nativas no código, possibilitando acesso a alterar partes que somente libs no React Native não conseguem atingir, como SDKs de impressoras, máquinas de pagamento, dentro outros.

> [!NOTE]
> Mas atenha-se ao fato de que este script foi feito para funcionar com o Expo, sem o uso do Expo Dev Client, para aqueles que querem mexer diretamente na parte nativa, sem restrições e quase como se estivesse utilizando o próprio Expo!

## Get started

Para começar a utilizar deste script, é necessário algumas configurações a serem feitas, a começar com as libs, é necessário o uso do `ts-node`, que permite execução de scripts em Typescript, compilando o código de forma que o Node.js entenda (algo semelhante a criar a pasta dist de um projeto)
- NPM
```
npm install ts-node --save-dev
```
- YARN
```
$ yarn add ts-node -D
```
> Após isso, se tudo ocorreu normalmente, a lib deve aparecer dentro das `devDependencies` do seu projeto

Após ter instalado ela, será necessário inserir uma linha dentro da seção de scripts do seu package.json
```
{
  "name": "my-app",
  ...
  "scripts": {
    ...
    "app:debug": "ts-node scripts/build.ts debug", // Rodar em debug
    "app:release": "ts-node scripts/build.ts release" // Rodar em release
  }, 
  ...
  "devDependencies": {
    ...
    "ts-node": "*", // Lib instalada 
    "typescript": "*" // Pre requisito do seu projeto para executar o script
  },
  ...
}
```



