const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Extracts text from a file buffer based on mimetype
 * @param {Buffer} buffer - The file buffer
 * @param {string} mimetype - The file MIME type Ex: 'application/pdf'
 * @param {string} originalname - The original name of the file
 * @returns {Promise<string>} The extracted text
 */
async function extractTextFromFile(buffer, mimetype, originalname) {
    try {
        if (!buffer || buffer.length === 0) {
            return "";
        }

        const ext = originalname ? originalname.split('.').pop().toLowerCase() : '';

        // PDF
        if (mimetype === 'application/pdf' || ext === 'pdf') {
            const data = await pdfParse(buffer);
            return data.text || "";
        }

        // DOCX
        if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
            const result = await mammoth.extractRawText({ buffer: buffer });
            return result.value || "";
        }

        // CSV
        if (mimetype === 'text/csv' || ext === 'csv') {
            return new Promise((resolve, reject) => {
                const results = [];
                const stream = Readable.from(buffer);

                stream
                    .pipe(csv())
                    .on('data', (data) => {
                        // Join all values in the row separated by spaces
                        results.push(Object.values(data).join(' '));
                    })
                    .on('end', () => {
                        resolve(results.join('\n'));
                    })
                    .on('error', (err) => {
                        console.error('CSV Parsing Error:', err);
                        // Fallback to plain text if CSV parser fails
                        resolve(buffer.toString('utf8'));
                    });
            });
        }

        // Plain Text, JSON, XML, Markdown, etc (fallback for many generic types)
        if (mimetype.startsWith('text/') ||
            ['json', 'md', 'txt', 'xml', 'log'].includes(ext)) {
            return buffer.toString('utf8');
        }

        // If it's an image, video, or unsupported type, return empty or throw err
        // We will just return an empty string for now, meaning "no text to scan"
        console.warn(`[FileParser] Unsupported MIME type for text extraction: ${mimetype} (${originalname})`);
        return "";

    } catch (err) {
        console.error(`[FileParser] Failed to extract text from ${originalname} (${mimetype}):`, err.message);
        throw new Error(`Failed to parse file content: ${err.message}`);
    }
}

module.exports = {
    extractTextFromFile
};
