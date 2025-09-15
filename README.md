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

Pronto, com isso feito, já está tudo configurado para usar o script em seu projeto. Apenas rode ele com o comando a seguir:
```
$ npm run app:<build_type> -- -<platform>
```
Alterando `<build_type>` por `debug` ou `release` e `<platform>` por `android` ou `ios`. Siga o fluxo do script e pronto, seu projeto já estará sendo buildando e rodando em algum aparelho conectado, seja emulador ou aparelho fisíco, sem necessidade de alterar versionName e versionCode manualmente ou até mesmo limpar cache de builds anteriores, o script já cuida de tudo isso de acordo com suas preferencias!

> [!Tip]
> Caso queira saber como configurar um ambiente para rodar seu aplicativo em React Native, não tendo nada configurado, siga meu guia de Notas gerais de desenvolvimento!

## Using the script

Dependendo da necessidade do projeto, o script pode ser alterado da forma como se adequar melhor a seu projeto, tendo isso em mente, vamos aqui somente destrinchar alguns pontos:

- Uso de variáveis de ambiente dentro da parte nativa

Para aqueles que não sabem, é possível passar algumas variávies para a parte nativa do seu aplicativo durante a execução de qualquer comando usado para rodar seu aplicativo com o React Native. Um exemplo disso é passar uma variavél `HELLO_WORLD="teste"`, e captar ele na parte em Java do seu projeto dessa forma:
```
// app/build.gradle

def hello_world = System.getenv("HELLO_WORLD") ?: ""

// Receber para utilizar de forma a aplicar alguma lib de forma condicional no gradle
if (hello_world == "teste") {
    apply from: 'some-random-lib'
}


android {
    ...

    defaultConfig {
        ...
        versionCode 745
        versionName "2.0.35"
        // Inserir aqui para utilizar dentro dos arquivos *.java do seu projeto
        buildConfigField "String", "HELLO_WORLD", "\"${hello_world}\""
    }
    ...
}
```

- Uso dentro do Java caso tenha inserido dentro de android/defaultConfig
```
// MainApplication.java

...

public class MainApplication extends Application implements ReactApplication {

    private final ReactNativeHost mReactNativeHost = new ReactNativeHostWrapper(
      this,
      new ReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }
  
        @Override
        protected List<ReactPackage> getPackages() {
            @SuppressWarnings("UnnecessaryLocalVariable")
            List<ReactPackage> packages = new PackageList(this).getPackages();
    
            String hello_world = BuildConfig.HELLOW_WORLD.toLowerCase();
          
            if (hello_world != null) {
                hello_world = hello_world.toLowerCase();
            } else {
                hello_world = "";
            }
          
            switch (hello_world) {
                case "teste":
                    packages.add(new RandomPackage()); // Possivel adicionar um package de forma condicional a variável
                    break;
                default:
                    break;
            }

            ...
        }

        ...
    }

    ...
}
```

Caso queira utilizar desta feature do script de build (não obrigatório), apenas insira suas variáveis nesta seção:
```
...
function runBuild() {
    const envVars = [
      "HELLO_WORLD=teste" // Dessa forma
    ].join(' ');

    ...
}
```

> [!Warning]
> Totalmente configuravél para Android, futuras atualizações irão conter o necessário para iOS
