import chalk from "chalk";
import { execSync, spawn } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import os from "os";
import { dirname, resolve as pathResolve, resolve } from "path";
import readline from "readline";

// -----------------------------
// Menu interativo via readline
// -----------------------------
async function selectOption(message: string, options: string[]): Promise<string> {
    return new Promise((resolve) => {
        let selected = 0;
        let rendered = false;

        console.log(chalk.yellow(message));

        function render() {
            if (rendered) {
                readline.moveCursor(process.stdout, 0, -(options.length));
                readline.clearScreenDown(process.stdout);
            }

            options.forEach((opt, i) => {
                const label = opt.charAt(0).toUpperCase() + opt.slice(1);
                if (i === selected) {
                    console.log(chalk.cyan(`> ${label}`));
                } else {
                    console.log(`  ${label}`);
                }
            });

            rendered = true;
        }

        function onKeypress(_: string, key: any) {
            if (key.sequence === "\u0003") {
                process.stdout.write("\n");
                console.log(chalk.red("❌ Operação cancelada pelo usuário."));
                process.exit(0);
            } else if (key.name === "up") {
                selected = (selected - 1 + options.length) % options.length;
                render();
            } else if (key.name === "down") {
                selected = (selected + 1) % options.length;
                render();
            } else if (key.name === "return") {
                const chosen = options[selected];
                process.stdin.off("keypress", onKeypress);
                process.stdin.setRawMode(false);
                readline.moveCursor(process.stdout, 0, -(options.length));
                readline.clearScreenDown(process.stdout);
                console.log(chalk.green(`✔ ${chosen.charAt(0).toUpperCase() + chosen.slice(1)}\n`));
                resolve(chosen);
            }
        }

        process.stdin.setRawMode(true);
        process.stdin.resume();
        readline.emitKeypressEvents(process.stdin);
        process.stdin.on("keypress", onKeypress);
        render();
    });
}

// -----------------------------
// Abrir diretório do arquivo gerado
// -----------------------------
function openDirectory(filePath: string) {
    const dir = dirname(filePath);
    const platform = os.platform();
    if (platform === "darwin") spawn("open", [dir]);
    else if (platform === "win32") spawn("explorer", [dir]);
    else spawn("xdg-open", [dir]);
}

// -----------------------------
// Atualiza app.json e roda prebuild
// -----------------------------
function updateAppJson(newVersionName: string, platform: string) {
    const appJsonPath = resolve(__dirname, "../app.json");
    const appJson = JSON.parse(readFileSync(appJsonPath, "utf8"));

    const oldVersionCode = appJson.expo.android.versionCode || 1;
    const newVersionCode = oldVersionCode + 1;

    appJson.expo.android.versionName = newVersionName;
    appJson.expo.android.versionCode = newVersionCode;
    appJson.expo.ios.buildNumber = newVersionName;
    appJson.expo.version = newVersionName;

    writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log(chalk.green(`\n✅ app.json atualizado: versionName=${newVersionName}, versionCode=${newVersionCode}`));

    console.log(chalk.cyan(`🔧 Rodando expo prebuild --platform ${platform}...`));
    try {
        execSync(`npx expo prebuild --platform ${platform}`, { encoding: 'utf8' });
        console.log(chalk.green("✅ Expo prebuild concluído.\n"));
    } catch (error: any) {
        console.error(chalk.red("❌ Erro durante o prebuild:"));
        console.error(chalk.red(error.stdout || error.message));
        process.exit(1);
    }
}

// -----------------------------
// Pergunta versão do app
// -----------------------------
async function askVersionName(platform: string): Promise<string> {
    return new Promise((resolve) => {
        const appJsonPath = pathResolve(__dirname, "../app.json");
        const appJson = JSON.parse(readFileSync(appJsonPath, "utf8"));
        const currentVersionName = appJson.expo.android.versionName || "";

        let inputBuffer = "";
        let cursorPos = 0;

        function redrawPrompt() {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(chalk.yellow(`Digite o novo versionName: ${inputBuffer}`));
            if (!inputBuffer) process.stdout.write(chalk.gray(currentVersionName));
        }

        redrawPrompt();

        const onKeyPress = (char: string, key: any) => {
            if (key?.sequence === "\u0003") {
                process.stdout.write("\n");
                console.log(chalk.red("❌ Operação cancelada pelo usuário."));
                process.exit(0);
            } else if (key?.name === "tab") {
                inputBuffer = currentVersionName;
                cursorPos = inputBuffer.length;
                redrawPrompt();
            } else if (key?.name === "backspace") {
                if (cursorPos > 0) {
                    inputBuffer = inputBuffer.slice(0, cursorPos - 1) + inputBuffer.slice(cursorPos);
                    cursorPos--;
                    redrawPrompt();
                }
            } else if (key?.name === "return") {
                process.stdout.write("\n");
                process.stdin.removeListener("keypress", onKeyPress);
                process.stdin.setRawMode(false);
                const versionNameToUse = inputBuffer.trim() || currentVersionName;
                if (!versionNameToUse) {
                    console.error(chalk.red("❌ Você deve informar o versionName."));
                    process.exit(1);
                }
                updateAppJson(versionNameToUse, platform);
                resolve(versionNameToUse);
            } else if (char && char.length === 1) {
                inputBuffer = inputBuffer.slice(0, cursorPos) + char + inputBuffer.slice(cursorPos);
                cursorPos++;
                redrawPrompt();
            }
        };

        process.stdin.setRawMode(true);
        process.stdin.resume();
        readline.emitKeypressEvents(process.stdin);
        process.stdin.on("keypress", onKeyPress);
    });
}

async function askOpenDirectory(filePath: string) {
    return new Promise<void>((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.on('SIGINT', () => {
            rl.close();
            console.log(chalk.red("\n❌ Operação cancelada pelo usuário."));
            process.exit(0);
        });

        rl.question(chalk.yellow("\nDeseja abrir o local do arquivo? [y/n]: "), async (answer) => {
            rl.close();
            const shouldOpen = answer.trim().toLowerCase() === "y";

            if (shouldOpen) {
                try {
                    openDirectory(filePath);
                } catch (err: any) {
                    console.error(chalk.red("❌ Erro ao abrir local do arquivo:"), err.message);
                }
            }
            resolve();
        });
    });
}

// -----------------------------
// Limpeza opcional
// -----------------------------
async function askClean(platform: string): Promise<boolean> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.on('SIGINT', () => {
            rl.close();
            console.log(chalk.red("\n❌ Operação cancelada pelo usuário."));
            process.exit(0);
        });

        rl.question(chalk.yellow("Deseja limpar o cache do build anterior? [y/n]: "), (answer) => {
            rl.close();
            const shouldClean = answer.trim().toLowerCase() === "y";
            const wrongAnswer = answer.trim().toLowerCase() !== "y" && answer.trim().toLowerCase() !== "n" && answer.trim() !== "";

            if (wrongAnswer) {
                console.error(chalk.red("❌ Resposta inválida. Por favor, responda com \"y\" ou \"n\"."));
                process.exit(1);
            }

            const cleanCommands: Record<string, string> = {
                android: "cd android && ./gradlew clean",
                ios: "cd ios && xcodebuild clean"
            };

            if (shouldClean) {
                console.log(chalk.cyan("\n🧹 Limpando build anterior...\n"));

                const cleanCommand = cleanCommands[platform];
                if (cleanCommand) {
                    try {
                        execSync(cleanCommand, { encoding: "utf8" });
                        console.log(chalk.green("✅ Cache limpo.\n"));
                    } catch (error: any) {
                        console.error(chalk.red("❌ Erro ao limpar o cache:"));
                        console.error(chalk.red(error.stdout || error.message));
                        process.exit(1);
                    }
                } else {
                    console.log(chalk.yellow("⚠️ Nenhum comando de limpeza definido para esta plataforma."));
                }
            }

            if (answer.trim() === "") {
                process.stdout.write("n\n");
            }

            resolve(shouldClean);
        });
    });
}

// -----------------------------
// Pod Install para iOS
// -----------------------------
async function runPodInstall() {
    console.log(chalk.cyan("\n📦 Rodando pod install...\n"));
    try {
        execSync("cd ios && pod install", { encoding: 'utf8' });
        console.log(chalk.green("✅ pod install concluído.\n"));
    } catch (error: any) {
        console.error(chalk.red("❌ Erro durante o pod install:"));
        console.error(chalk.red(error.stdout || error.message));
        process.exit(1);
    }
}

// -----------------------------
// Rodar aplicação no dispositivo/emulador
// -----------------------------
async function runBuild(platform: string, mode: string) {
    // Defina suas variáveis de ambiente aqui
    const envVars = [
        // Exemplo: 'API_URL=https://api.example.com',
        // Exemplo: 'ENV=production'
    ].join(" ");

    const modeFlag = mode === "release" ? (platform === "android" ? "--mode=release" : "--mode=Release") : "";
    const command = `${envVars} npx react-native run-${platform} ${modeFlag}`.trim();

    console.log(chalk.cyan(`\n🚀 Iniciando build da aplicação ${platform}...\n`));
    console.log(chalk.gray("Isso pode levar alguns minutos."));

    try {
        execSync(command, { stdio: "inherit" });
        console.log(chalk.green(`\n✅ Build ${platform} concluído com sucesso!\n`));
    } catch (error: any) {
        console.error(chalk.red(`❌ Erro durante o build da aplicação ${platform}:`));
        console.error(chalk.red(error.stdout || error.message));
        process.exit(1);
    }
}

// -----------------------------
// Gerar arquivo APK/AAB/IPA
// -----------------------------
async function generateFile(platform: string, fileType: string) {
    if (platform === "android") {
        const gradleCommand = fileType === "apk" ? "assembleRelease" : "bundleRelease";
        const outputPath = fileType === "apk"
            ? "android/app/build/outputs/apk/release/app-release.apk"
            : "android/app/build/outputs/bundle/release/app-release.aab";

        console.log(chalk.cyan(`🔨 Gerando ${fileType.toUpperCase()}...\n`));
        console.log(chalk.gray("Isso pode levar alguns minutos...\n"));

        try {
            execSync(`cd android && ./gradlew ${gradleCommand}`, { stdio: "inherit" });

            if (existsSync(outputPath)) {
                console.log(chalk.green(`\n✅ ${fileType.toUpperCase()} gerado: file://${resolve(outputPath)}\n`));
                await askOpenDirectory(resolve(outputPath));
            } else {
                console.log(chalk.red(`❌ ${fileType.toUpperCase()} não encontrado.`));
            }
        } catch (error: any) {
            console.error(chalk.red(`❌ Erro ao gerar ${fileType.toUpperCase()}:`));
            console.error(chalk.red(error.stdout || error.message));
            process.exit(1);
        }
    } else if (platform === "ios") {
        console.log(chalk.cyan("🔨 Gerando IPA...\n"));
        console.log(chalk.yellow("📝 Certifique-se de que o projeto está configurado no XCode com certificados válidos.\n"));

        try {
            execSync(
                "cd ios && xcodebuild -workspace *.xcworkspace -scheme * -configuration Release archive -archivePath build/App.xcarchive",
                { stdio: "inherit" }
            );

            execSync(
                "cd ios && xcodebuild -exportArchive -archivePath build/App.xcarchive -exportPath build -exportOptionsPlist exportOptions.plist",
                { stdio: "inherit" }
            );

            console.log(chalk.green("\n✅ IPA gerado em: ios/build/\n"));
            await askOpenDirectory(resolve("ios/build/"));
        } catch (error: any) {
            console.error(chalk.red("❌ Erro ao gerar IPA:"));
            console.error(chalk.red(error.stdout || error.message));
            process.exit(1);
        }
    }
}

// -----------------------------
// Seleção de tipo de build e execução
// -----------------------------
async function askBuild(platform: string, mode: string) {
    if (mode === "debug") {
        // Debug sempre roda direto
        if (platform === "ios") {
            await runPodInstall();
        }
        await runBuild(platform, mode);
        return;
    }

    // Release: pergunta se quer rodar ou gerar arquivo
    const buildType = await selectOption(
        "Deseja rodar no dispositivo ou gerar arquivo?",
        ["rodar", "gerar arquivo"]
    );

    if (buildType === "rodar") {
        if (platform === "ios") {
            await runPodInstall();
        }
        await runBuild(platform, mode);
    } else {
        // Gerar arquivo
        if (platform === "android") {
            const fileType = await selectOption("Deseja gerar APK ou AAB?", ["apk", "aab"]);
            await generateFile(platform, fileType);
        } else if (platform === "ios") {
            await generateFile(platform, "ipa");
        }
    }
}

// -----------------------------
// Fluxo principal
// -----------------------------
(async () => {
    console.log(chalk.bold.blue("📱 React Native/Expo Bare Workflow build helper tool\n"));

    const platform = await selectOption("Selecione a plataforma:", ["android", "ios"]);
    const mode = await selectOption("Selecione o tipo de build:", ["debug", "release"]);

    await askVersionName(platform);
    await askClean(platform);

    if (platform === "ios") {
        await runPodInstall();
    }

    await askBuild(platform, mode);

    process.exit(0);
})();
