const AdmZip = require('adm-zip');
const { DEFAULT_METADATA_SETTINGS, SERVICE_NAME } = require('../constants');

async function cleanOfficeMetadata(inputBuffer, options = {}) {
    const settings = { ...DEFAULT_METADATA_SETTINGS, ...options };
    try {
        const originalSize = inputBuffer.length;
        const zip = new AdmZip(inputBuffer);
        const author = settings.setAuthor || SERVICE_NAME;
        const now = new Date().toISOString();

        // 1. Полная перезапись core.xml (Идеальное решение, оставляем)
        const cleanCoreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>${author}</dc:creator>
  <cp:lastModifiedBy>${author}</cp:lastModifiedBy>
  <dc:title></dc:title>
  <dc:subject></dc:subject>
  <dc:description></dc:description>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;

        zip.updateFile('docProps/core.xml', Buffer.from(cleanCoreXml, 'utf8'));

        // 2. Очистка app.xml (Улучшенная: добавили очистку Manager)
        const appEntry = zip.getEntry('docProps/app.xml');
        if (appEntry) {
            let xmlContent = appEntry.getData().toString('utf8');
            xmlContent = xmlContent.replace(/<Company>.*?<\/Company>/gi, '<Company></Company>');
            xmlContent = xmlContent.replace(/<Manager>.*?<\/Manager>/gi, '<Manager></Manager>');
            xmlContent = xmlContent.replace(/<Application>.*?<\/Application>/gi, `<Application>${SERVICE_NAME}</Application>`);
            zip.updateFile('docProps/app.xml', Buffer.from(xmlContent, 'utf8'));
        }

        // 3. Проходим по всем файлам внутри архива для точечной очистки
        zip.getEntries().forEach((entry) => {
            const entryName = entry.entryName;

            // А. Очистка авторов в комментариях (КРИТИЧЕСКИ ВАЖНО для Word/Excel/PPT)
            if (entryName.includes('comments.xml')) {
                let xmlContent = entry.getData().toString('utf8');
                // Очищаем теги авторов в комментариях
                xmlContent = xmlContent.replace(/<dc:creator>.*?<\/dc:creator>/gi, '<dc:creator></dc:creator>');
                xmlContent = xmlContent.replace(/<author>.*?<\/author>/gi, '<author><name></name><initials></initials></author>');
                zip.updateFile(entryName, Buffer.from(xmlContent, 'utf8'));
            }

            // Б. Включение флага "Удалить личную информацию" для Word
            if (entryName === 'word/settings.xml') {
                let xmlContent = entry.getData().toString('utf8');
                if (!xmlContent.includes('removePersonalInformation')) {
                    // Вставляем флаг перед закрывающим тегом w:settings
                    xmlContent = xmlContent.replace('</w:settings>', '<w:removePersonalInformation w:val="1"/></w:settings>');
                    zip.updateFile(entryName, Buffer.from(xmlContent, 'utf8'));
                }
            }

            // В. Удаление мусорных папок, кастомных свойств и миниатюр
            if (entryName.startsWith('customXml/') ||
                entryName === 'docProps/custom.xml' ||
                entryName === 'docProps/thumbnail.jpeg' ||
                entryName.includes('thumbnails')) {
                zip.deleteFile(entryName);
            }
        });

        const cleanedBuffer = zip.toBuffer();
        return {
            buffer: cleanedBuffer,
            originalSize,
            cleanedSize: cleanedBuffer.length,
            cleaned: true
        };
    } catch (error) {
        console.error('Ошибка очистки Office метаданных:', error);
        return {
            buffer: inputBuffer,
            originalSize: inputBuffer.length,
            cleanedSize: inputBuffer.length,
            cleaned: false,
            error: error.message
        };
    }
}

module.exports = { cleanOfficeMetadata };