import chalk from 'chalk';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import readline from 'readline';

const mode = process.argv[2] || 'debug';
const platformArg = (process.argv[3] || '').replace(/^-/, '').toLowerCase();

const PlatformAliases: Record<string, string> = {
    android: 'android',
    ios: 'ios',
};

const platform = PlatformAliases[platformArg];

// ai ele capta aqui tudo que voce coloca no comando que envia, se é release ou debug e qual o platform

if (!platform) {
    console.error(chalk.red(`❌ Plataforma inválida. Use um dos: ${Object.keys(PlatformAliases).map(p => '-' + p).join(' ')}`));
    process.exit(1);
}

// caso não tenha ele ja joga o erro, se não tiver dentro dos que eu coloquei no PlatformAliases ele já joga o erro tambem 

console.log(chalk.blue(`🚀 Iniciando build (${mode}) com plataforma: ${platform.toUpperCase()}\n`));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askVersionName() {
    const appJsonPath = resolve(__dirname, '../app.json');
    const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
    const currentVersionName = appJson.expo.android.versionName || '';

    let inputBuffer = '';
    let cursorPos = 0;

    function redrawPrompt() {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(
            chalk.yellow(`Digite o novo versionName: ${inputBuffer}`)
        );
        if (inputBuffer.length === 0) {
            process.stdout.write(chalk.gray(currentVersionName));
        }
    }

    redrawPrompt();

    const onKeyPress = (char: string, key: any) => {
        if (key && key.name === 'tab') {
            inputBuffer = currentVersionName;
            cursorPos = inputBuffer.length;
            redrawPrompt();
        } else if (key && key.name === 'backspace') {
            if (cursorPos > 0) {
                inputBuffer = inputBuffer.slice(0, cursorPos - 1) + inputBuffer.slice(cursorPos);
                cursorPos--;
                redrawPrompt();
            }
        } else if (key && key.name === 'return') {
            process.stdout.write('\n');
            process.stdin.removeListener('keypress', onKeyPress);
            const versionNameToUse = inputBuffer.trim() || currentVersionName;
            if (!versionNameToUse) {
                console.error(chalk.red('❌ Você deve informar o versionName.'));
                process.exit(1);
            }
            updateAppJson(versionNameToUse);
        } else if (typeof char === 'string' && char.length === 1) {
            inputBuffer = inputBuffer.slice(0, cursorPos) + char + inputBuffer.slice(cursorPos);
            cursorPos++;
            redrawPrompt();
        }
    };

    process.stdin.on('keypress', onKeyPress);
}

// aqui ele pergunta a versão que o app vai ter, se não mudar, continua a mesma que já estava

function updateAppJson(newVersionName: string) {
    const appJsonPath = resolve(__dirname, '../app.json');
    const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));

    const oldVersionCode = appJson.expo.android.versionCode || 1;
    const newVersionCode = oldVersionCode + 1;

    appJson.expo.android.versionName = newVersionName;
    appJson.expo.android.versionCode = newVersionCode;
    appJson.expo.ios.buildNumber = newVersionName;
    appJson.expo.version = newVersionName;

    writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log(chalk.green(`✅ app.json atualizado: versionName=${newVersionName}, versionCode=${newVersionCode}`));

    console.log(chalk.cyan(`🔧 Rodando expo prebuild --platform ${platform}...`));
    try {
        const prebuildOutput = execSync(`npx expo prebuild --platform ${platform}`, { encoding: 'utf8' });
        console.log(chalk.green('✅ Expo prebuild concluído.\n'));
    } catch (error: any) {
        console.error(chalk.red('❌ Erro durante o expo prebuild:'));
        console.error(chalk.red(error.stdout || error.message));
        process.exit(1);
    }

    askClean();
}

// ele faz todo o processo de limpeza e prebuild do expo aqui, atualizando o versionCode e colocando o versionName e tudo que eu quiser no app.json
// alem de atualizar um arquivo de environment.ts que atualiza o provider e alguns detalhes para eu usar direto no app

function askClean() {
    rl.question(chalk.yellow('Deseja limpar o cache do build anterior (Caso não tenha o que limpar irá dar erro)? [y/n]: '), (answer) => {
        const shouldClean = answer.trim().toLowerCase() === 'y';
        const wrongAnswer = answer.trim().toLowerCase() !== 'y' && answer.trim().toLowerCase() !== 'n' && answer.trim() !== '';
        rl.close();

        if (wrongAnswer) {
            console.error(chalk.red('❌ Resposta inválida. Por favor, responda com "y" ou "n".'));
            process.exit(1);
        }

        // Define clean commands for each platform
        const cleanCommands: Record<string, string> = {
            android: 'cd android && ./gradlew clean',
            ios: 'cd ios && xcodebuild clean'
        };

        if (shouldClean) {
            console.log(chalk.cyan('\n🧹 Limpando build anterior...\n'));

            const cleanCommand = cleanCommands[platform];
            if (cleanCommand) {
                try {
                    execSync(cleanCommand, { encoding: 'utf8' });
                    console.log(chalk.green('\n✅ Cache limpo.\n'));
                } catch (error: any) {
                    console.error(chalk.red('❌ Erro ao limpar o cache:'));
                    console.error(chalk.red(error.stdout || error.message));
                    process.exit(1);
                }
            } else {
                console.log(chalk.yellow('⚠️ Nenhum comando de limpeza definido para esta plataforma.'));
            }
        }

        if (answer.trim() === '') {
            process.stdout.write('n\n');
        }

        if (platform === PlatformAliases.ios) {
            runPodInstall();
        } else {
            runBuild();
        }
    });
}

function runPodInstall() {
    if (platform !== 'ios') {
        return;
    }
    console.log(chalk.cyan('\n📦 Rodando pod install...\n'));
    try {
        execSync('cd ios && pod install', { stdio: 'inherit' });
        console.log(chalk.green('✅ pod install concluído.\n'));
    } catch (error: any) {
        console.error(chalk.red('❌ Erro durante o pod install:'));
        console.error(chalk.red(error.stdout || error.message));
        process.exit(1);
    }

    runBuild();
}

function runBuild() {
    const envVars = [
    ].join(' ');

    const command = `${envVars} npx react-native run-${platform} ${mode === 'release' ? '--mode=release' : ''}`;
    console.log(chalk.cyan(`\n🚀 Iniciando build da aplicação ${platform}...\n`));
    console.log(chalk.gray('Isso pode levar alguns minutos.'));
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (error: any) {
        console.error(chalk.red(`❌ Erro durante o build da aplicação ${platform}:`));
        console.error(chalk.red(error.stdout || error.message));
        process.exit(1);
    }
}


askVersionName();
