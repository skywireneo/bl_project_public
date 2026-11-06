// const apiError = require('../exceptions/apiError');
// const tokenService = require('./systemServices/tokenService');
// const settingsService = require('./settingsService');
// const { tgNotificationSend } = require('../grpc/handlers/notificationSendHandler');
// const { generatePolicyPDF } = require('./pdf/policyPdfService');
// const queryService = require('./systemServices/queryService');
// const notificationsService = require('./notificationsService');
// const { getUserStatuses } = require('./userService');
// const logService = require('./logService');

const apiError = require("../../exceptions/apiError");

class policyUpdateService {

    // === НОВАЯ УМНАЯ ФУНКЦИЯ РАЗБИЕНИЯ HTML НА СТРОКИ ===
    splitHtmlLines(text) {
        if (!text) return [];

        let normalized = text.replace(/\r\n/g, '\n');

        // Если текст содержит HTML-теги, форматируем его для корректного сравнения
        if (normalized.includes('<')) {
            normalized = normalized
                // Добавляем перенос после закрывающих блочных тегов и <br>
                .replace(/(<\/(?:p|h[1-6]|div|li|ul|ol|blockquote|br)>)/gi, '$1\n')
                // Добавляем перенос между закрывающим и открывающим тегом, если между ними нет \n
                .replace(/>\s+</g, '>\n<');
        }

        // Разбиваем по \n, убираем пробелы по краям и фильтруем полностью пустые строки
        return normalized
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    // Метод для сравнения текстов и генерации HTML с инлайн-стилями
    async generateDiffHTML(oldText, newText) {
        const oldLines = this.splitHtmlLines(oldText);
        const newLines = this.splitHtmlLines(newText);

        // Реализация алгоритма LCS (Longest Common Subsequence) для построчного сравнения
        const computeLCS = (a, b) => {
            const m = a.length;
            const n = b.length;
            const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

            for (let i = 1; i <= m; i++) {
                for (let j = 1; j <= n; j++) {
                    if (a[i - 1] === b[j - 1]) {
                        dp[i][j] = dp[i - 1][j - 1] + 1;
                    } else {
                        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                    }
                }
            }
            return dp;
        };

        // Восстановление diff
        const getDiff = (dp, a, b, i, j) => {
            if (i === 0 && j === 0) return [];
            if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
                return [...getDiff(dp, a, b, i - 1, j - 1), { type: 'equal', line: a[i - 1] }];
            }
            if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j])) {
                return [...getDiff(dp, a, b, i - 1, j), { type: 'delete', line: a[i - 1] }];
            }
            if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1])) {
                return [...getDiff(dp, a, b, i, j - 1), { type: 'insert', line: b[j - 1] }];
            }
            return [];
        };

        const dp = computeLCS(oldLines, newLines);
        const diffResult = getDiff(dp, oldLines, newLines, oldLines.length, newLines.length);

        // Генерация HTML с инлайн-стилями
        let htmlResult = `<div style="font-family: 'Courier New', monospace; background-color: #f6f8fa; padding: 16px; border-radius: 6px; border: 1px solid #d0d7de; margin: 10px 0; font-size: 13px; line-height: 1.5;">\n`;

        htmlResult += `<div style="padding: 8px 12px; background-color: #f6f8fa; border-bottom: 1px solid #d0d7de; margin-bottom: 12px; font-weight: bold; color: #24292f; font-family: sans-serif;">
            Изменения в политике
        </div>\n`;

        for (const item of diffResult) {
            if (item.type === 'equal') {
                htmlResult += `  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">${this.escapeHtml(item.line)}</div>\n`;
            } else if (item.type === 'delete') {
                htmlResult += `  <div style="padding: 4px 8px; color: #24292f; background-color: #ffeef0; border-left: 3px solid #f85149; margin: 2px 0; white-space: pre-wrap; word-break: break-word; text-decoration: line-through;">
                    <span style="color: #f85149; font-weight: bold; font-family: sans-serif;">-</span> ${this.escapeHtml(item.line)}
                </div>\n`;
            } else if (item.type === 'insert') {
                htmlResult += `  <div style="padding: 4px 8px; color: #24292f; background-color: #e6ffec; border-left: 3px solid #3fb950; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">
                    <span style="color: #3fb950; font-weight: bold; font-family: sans-serif;">+</span> ${this.escapeHtml(item.line)}
                </div>\n`;
            }
        }

        // Добавляем статистику
        const stats = this.getDiffStats(diffResult);
        htmlResult += `\n  <div style="margin-top: 12px; padding: 8px 12px; background-color: #f6f8fa; border-top: 1px solid #d0d7de; border-radius: 0 0 6px 6px; display: flex; gap: 20px; font-size: 13px; color: #57606a; font-family: sans-serif;">
            <span><span style="color: #f85149;">●</span> Удалено: <strong>${stats.deletions}</strong></span>
            <span><span style="color: #3fb950;">●</span> Добавлено: <strong>${stats.insertions}</strong></span>
            <span><span style="color: #8b949e;">●</span> Без изменений: <strong>${stats.equals}</strong></span>
        </div>\n`;

        htmlResult += '</div>';
        return htmlResult;
    }

    // Вспомогательный метод для экранирования HTML
    escapeHtml(text) {
        if (!text) return '';
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return text.replace(/[&<>"']/g, match => htmlEscapes[match]);
    }

    // Метод для отображения diff в консоли с цветами (ANSI)
    generateDiffConsole(oldText, newText) {
        const oldLines = this.splitHtmlLines(oldText);
        const newLines = this.splitHtmlLines(newText);

        const computeLCS = (a, b) => {
            const m = a.length;
            const n = b.length;
            const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
            for (let i = 1; i <= m; i++) {
                for (let j = 1; j <= n; j++) {
                    if (a[i - 1] === b[j - 1]) {
                        dp[i][j] = dp[i - 1][j - 1] + 1;
                    } else {
                        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                    }
                }
            }
            return dp;
        };

        const getDiff = (dp, a, b, i, j) => {
            if (i === 0 && j === 0) return [];
            if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
                return [...getDiff(dp, a, b, i - 1, j - 1), { type: 'equal', line: a[i - 1] }];
            }
            if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j])) {
                return [...getDiff(dp, a, b, i - 1, j), { type: 'delete', line: a[i - 1] }];
            }
            if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1])) {
                return [...getDiff(dp, a, b, i, j - 1), { type: 'insert', line: b[j - 1] }];
            }
            return [];
        };

        const dp = computeLCS(oldLines, newLines);
        const diffResult = getDiff(dp, oldLines, newLines, oldLines.length, newLines.length);

        const colors = {
            reset: '\x1b[0m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            gray: '\x1b[90m',
            bold: '\x1b[1m'
        };

        let consoleOutput = '\n' + '='.repeat(80) + '\n';
        consoleOutput += `${colors.bold}DIFF Политики${colors.reset}\n`;
        consoleOutput += '='.repeat(80) + '\n\n';

        let currentBlock = [];
        let blockType = null;

        for (const item of diffResult) {
            if (item.type === 'equal') {
                if (currentBlock.length > 0) {
                    consoleOutput += this.formatDiffBlock(currentBlock, blockType);
                    currentBlock = [];
                    blockType = null;
                }
                consoleOutput += `  ${colors.gray}${item.line}${colors.reset}\n`;
            } else {
                if (blockType !== item.type && currentBlock.length > 0) {
                    consoleOutput += this.formatDiffBlock(currentBlock, blockType);
                    currentBlock = [];
                }
                blockType = item.type;
                currentBlock.push(item.line);
            }
        }

        if (currentBlock.length > 0) {
            consoleOutput += this.formatDiffBlock(currentBlock, blockType);
        }

        consoleOutput += '\n' + '='.repeat(80) + '\n';
        consoleOutput += `${colors.bold}📊 Статистика изменений:${colors.reset}\n`;
        const stats = this.getDiffStats(diffResult);
        consoleOutput += `  ${colors.red}Удалено: ${stats.deletions} строк${colors.reset}\n`;
        consoleOutput += `  ${colors.green}Добавлено: ${stats.insertions} строк${colors.reset}\n`;
        consoleOutput += `  ${colors.gray}Без изменений: ${stats.equals} строк${colors.reset}\n`;
        consoleOutput += '='.repeat(80) + '\n';

        return consoleOutput;
    }

    formatDiffBlock(lines, type) {
        const colors = {
            reset: '\x1b[0m',
            red: '\x1b[31m',
            green: '\x1b[32m'
        };

        let result = '';
        const prefix = type === 'delete' ? `${colors.red}- ` : `${colors.green}+ `;
        const color = type === 'delete' ? colors.red : colors.green;

        for (const line of lines) {
            result += `${color}${prefix}${line}${colors.reset}\n`;
        }

        return result;
    }

    getDiffStats(diffResult) {
        let deletions = 0, insertions = 0, equals = 0;
        for (const item of diffResult) {
            if (item.type === 'delete') deletions++;
            else if (item.type === 'insert') insertions++;
            else equals++;
        }
        return { deletions, insertions, equals };
    }

    // Основной метод обновления с интеграцией diff и сохранением в историю
    async updatePolicy(client, updateType, policyType, text, changeComment, current_user) {
        // console.log(updateType, policyType, text, current_user);

        const nameRes = await client.query('SELECT id, name, version, text FROM policy WHERE type = $1', [policyType]);
        if (nameRes.rowCount == 0) {
            throw apiError.BadRequest('POLICY_NOT_FOUND', 'Политика не найдена');
        }

        const currentVersion = nameRes.rows[0].version;
        const oldText = nameRes.rows[0].text || '';
        const [major, minor, patch] = currentVersion.split('.').map(Number);

        let newMajor = major, newMinor = minor, newPatch = patch;

        if (updateType === "major") {
            newMajor = major + 1; newMinor = 0; newPatch = 0;
        } else if (updateType === "minor") {
            newMinor = minor + 1; newPatch = 0;
        } else if (updateType === "micro") {
            newPatch = patch + 1;
        } else {
            throw apiError.BadRequest('INVALID_UPDATE_TYPE', 'Недопустимый тип обновления');
        }

        const newVersion = `${newMajor}.${newMinor}.${newPatch}`;

        try {
            const htmlDiff = await this.generateDiffHTML(oldText, text);
            // console.log('\n📄 HTML Diff сгенерирован');

            // 1. Сохраняем в историю
            await client.query(
                `INSERT INTO policy_versions 
                (type, old_version, new_version, change, user_id, updated_at, clear_old_version_text, clear_new_version_text, diff_html) 
                VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)`,
                [policyType, currentVersion, newVersion, changeComment || 'Без комментария', current_user?.id, oldText, text, htmlDiff]
            );

            // 2. Обновляем текущую политику
            const res = await client.query(
                'UPDATE policy SET text = $1, version = $2, updated_at = NOW() WHERE type = $3 RETURNING *',
                [text, newVersion, policyType]
            );

            // console.log(` Политика успешно обновлена: ${currentVersion} -> ${newVersion}`);
            return [res.rows[0].text, res.rows[0].version];
        } catch (error) {
            console.error(`❌ Ошибка при обновлении политики: ${error.message}`);
            throw error;
        }
    }

    // === НОВЫЕ МЕТОДЫ ДЛЯ ИСТОРИИ ===

    // 1. Легковесный список версий для модального окна
    async getPolicyVersions(client, policyType) {
        const res = await client.query(
            `SELECT id, old_version, new_version, change, user_id, updated_at 
             FROM policy_versions 
             WHERE type = $1 
             ORDER BY updated_at DESC`,
            [policyType]
        );
        return res.rows;
    }

    // 2. Детальная информация о конкретном переходе версий (для страницы с табами)
    async getPolicyVersionDetail(client, policyType, version) {
        const res = await client.query(
            `SELECT old_version, new_version, change, user_id, updated_at, 
                    clear_old_version_text, clear_new_version_text, diff_html 
             FROM policy_versions 
             WHERE type = $1 AND new_version = $2`,
            [policyType, version]
        );
        if (res.rowCount === 0) {
            throw apiError.BadRequest('VERSION_NOT_FOUND', 'Версия не найдена');
        }
        return res.rows[0];
    }
}

module.exports = new policyUpdateService();