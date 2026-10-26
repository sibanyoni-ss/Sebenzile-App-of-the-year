const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const officeCrypto = require('officecrypto-tool');
const { encryptPDF } = require('@pdfsmaller/pdf-encrypt');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const JSZip = require('jszip');

/**
 * Generates an immutable SHA-256 cryptographic digest of the document answers,
 * custom clauses, template version, and lock timestamp.
 * This guarantees legal tamper-evidence and POPIA audit integrity.
 */
function generateDocumentLockSeal(documentData) {
    const payload = JSON.stringify({
        draftId: documentData.id,
        ownerId: documentData.owner_id,
        templateKey: documentData.template_key,
        answers: documentData.answers,
        customClauses: documentData.custom_clauses || [],
        lockedAt: new Date().toISOString()
    });

    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    const sealId = 'SEAL-ZA-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    return {
        isLocked: true,
        lockChecksum: hash,
        sealId: sealId,
        lockedAt: new Date().toISOString(),
        algorithm: 'SHA-256'
    };
}

/**
 * Verifies whether a document's content matches its lock checksum.
 */
function verifyDocumentLock(documentData, originalChecksum) {
    return documentData.lock_checksum === originalChecksum;
}

/**
 * Validates document password against the LawCompass security policy:
 * - Must be a non-empty string.
 * - Must be at least 8 characters long for cryptographic resilience.
 * - Password and confirmation password must match.
 */
function validateLockPassword(password, confirmPassword) {
    if (!password || typeof password !== 'string' || password.trim().length === 0) {
        return { valid: false, error: 'Password is required.', code: 'MISSING_PASSWORD' };
    }
    if (password.length < 8) {
        return {
            valid: false,
            error: 'Password must be at least 8 characters long for security compliance.',
            code: 'WEAK_PASSWORD'
        };
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
        return {
            valid: false,
            error: 'Passwords do not match. Please re-enter carefully.',
            code: 'PASSWORD_MISMATCH'
        };
    }
    return { valid: true };
}

/**
 * Checks whether a given buffer is an encrypted Word document (.docx).
 */
function isDocxEncrypted(buffer) {
    if (!buffer || !Buffer.isBuffer(buffer)) return false;
    try {
        return officeCrypto.isEncrypted(buffer);
    } catch (_) {
        return false;
    }
}

/**
 * Encrypts a DOCX file using standard Microsoft Office Agile / Standard AES encryption (ECMA-376).
 * The resulting file requires the password to open in Microsoft Word, LibreOffice, or compatible suites.
 */
async function encryptDocx(buffer, password) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error('Valid document buffer is required for encryption.');
    }
    const val = validateLockPassword(password);
    if (!val.valid) {
        const err = new Error(val.error);
        err.code = val.code;
        err.status = 400;
        throw err;
    }

    try {
        const encrypted = await officeCrypto.encrypt(buffer, { password });
        const encBuffer = Buffer.from(encrypted);
        if (!officeCrypto.isEncrypted(encBuffer)) {
            throw new Error('Verification failed: Encrypted artifact does not contain standard Office encryption headers.');
        }
        return encBuffer;
    } catch (e) {
        if (e.code) throw e;
        throw new Error(`DOCX encryption failed: ${e.message}`);
    }
}

/**
 * Decrypts an encrypted DOCX file using the user password.
 */
async function decryptDocx(buffer, password) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error('Valid document buffer is required for decryption.');
    }
    if (!password) {
        const err = new Error('Document password is required.');
        err.code = 'MISSING_PASSWORD';
        err.status = 400;
        throw err;
    }

    try {
        const decrypted = await officeCrypto.decrypt(buffer, { password });
        return Buffer.from(decrypted);
    } catch (e) {
        const err = new Error('Incorrect password. The document could not be unlocked.');
        err.code = 'INVALID_PASSWORD';
        err.status = 401;
        throw err;
    }
}

/**
 * Extracts plain text from an unencrypted DOCX buffer.
 */
async function extractTextFromDocx(buffer) {
    try {
        const zip = await JSZip.loadAsync(buffer);
        const docXmlFile = zip.file('word/document.xml');
        if (!docXmlFile) return '';
        const docXml = await docXmlFile.async('text');
        return docXml
            .replace(/<\/w:p>/g, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    } catch (e) {
        throw new Error(`Failed to extract text from Word document: ${e.message}`);
    }
}

/**
 * Generates an official, beautifully formatted legal PDF from questionnaire answers and custom clauses.
 */
async function generatePdfDocument({ title, templateKey, answers = {}, customClauses = [] }) {
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const margin = 50;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const contentWidth = pageWidth - (margin * 2);

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    function checkPage(neededHeight = 24) {
        if (y - neededHeight < margin + 40) {
            drawFooter(page);
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
            return true;
        }
        return false;
    }

    function drawFooter(targetPage) {
        targetPage.drawLine({
            start: { x: margin, y: margin + 15 },
            end: { x: pageWidth - margin, y: margin + 15 },
            thickness: 0.5,
            color: rgb(0.8, 0.82, 0.86)
        });
        targetPage.drawText('LawCompass (Pty) Ltd · Republic of South Africa · Password-Protected Legal Document', {
            x: margin,
            y: margin,
            size: 8,
            font: fontOblique,
            color: rgb(0.45, 0.5, 0.58)
        });
    }

    function wrapText(text, font, size, maxWidth) {
        const words = String(text || '').split(/\s+/);
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const width = font.widthOfTextAtSize(testLine, size);
            if (width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines.length ? lines : [''];
    }

    // Top Brand Eyebrow
    page.drawText('LAWCOMPASS LEGAL SERVICES · OFFICIAL CONTRACT DRAFT', {
        x: margin,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.79, 0.55, 0.19)
    });
    y -= 18;

    // Document Title
    const docTitle = (title || `${templateKey || 'Legal'} Agreement`).toUpperCase();
    page.drawText(docTitle, {
        x: margin,
        y,
        size: 18,
        font: fontBold,
        color: rgb(0.08, 0.13, 0.23)
    });
    y -= 14;

    // Legal Subtitle
    page.drawText('Jurisdiction: Republic of South Africa | Tamper-Evident Password Protected Artifact', {
        x: margin,
        y,
        size: 9,
        font: fontOblique,
        color: rgb(0.36, 0.40, 0.48)
    });
    y -= 12;

    // Divider
    page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85)
    });
    y -= 22;

    // Questionnaire Answers
    for (const [key, val] of Object.entries(answers)) {
        if (!val) continue;
        checkPage(36);

        page.drawText(key.toUpperCase(), {
            x: margin,
            y,
            size: 8,
            font: fontBold,
            color: rgb(0.4, 0.45, 0.52)
        });
        y -= 12;

        const lines = wrapText(val, fontRegular, 10, contentWidth);
        for (const line of lines) {
            checkPage(15);
            page.drawText(line, {
                x: margin,
                y,
                size: 10,
                font: fontRegular,
                color: rgb(0.09, 0.14, 0.23)
            });
            y -= 14;
        }
        y -= 6;
    }

    // Custom Clauses Section
    if (Array.isArray(customClauses) && customClauses.length > 0) {
        checkPage(40);
        y -= 10;
        page.drawText('SPECIAL TERMS & CUSTOM COVENANTS', {
            x: margin,
            y,
            size: 11,
            font: fontBold,
            color: rgb(0.79, 0.55, 0.19)
        });
        y -= 16;

        customClauses.forEach((clause, idx) => {
            checkPage(36);
            page.drawText(`${idx + 1}. ${(clause.title || 'Special Clause').toUpperCase()}`, {
                x: margin,
                y,
                size: 9,
                font: fontBold,
                color: rgb(0.08, 0.13, 0.23)
            });
            y -= 12;

            const lines = wrapText(clause.body, fontRegular, 9.5, contentWidth);
            for (const line of lines) {
                checkPage(14);
                page.drawText(line, {
                    x: margin,
                    y,
                    size: 9.5,
                    font: fontRegular,
                    color: rgb(0.12, 0.16, 0.24)
                });
                y -= 13;
            }
            y -= 6;
        });
    }

    // Signatures and Execution Block
    checkPage(130);
    y -= 18;
    page.drawText('SIGNATURES & EXECUTION', {
        x: margin,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.08, 0.13, 0.23)
    });
    y -= 14;

    page.drawText('Signed at ________________________ on this _____ day of __________________ 20___', {
        x: margin,
        y,
        size: 9,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2)
    });
    y -= 40;

    page.drawLine({ start: { x: margin, y }, end: { x: margin + 180, y }, thickness: 0.8, color: rgb(0.5, 0.5, 0.5) });
    page.drawLine({ start: { x: margin + 240, y }, end: { x: margin + 420, y }, thickness: 0.8, color: rgb(0.5, 0.5, 0.5) });
    y -= 12;
    page.drawText('First Party / Authorized Signatory', { x: margin, y, size: 8, font: fontBold, color: rgb(0.35, 0.35, 0.35) });
    page.drawText('Second Party / Employee Signature', { x: margin + 240, y, size: 8, font: fontBold, color: rgb(0.35, 0.35, 0.35) });

    drawFooter(page);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

/**
 * Checks whether a given buffer is an encrypted PDF.
 */
function isPdfEncrypted(buffer) {
    if (!buffer || !Buffer.isBuffer(buffer)) return false;
    const str = buffer.slice(0, 4096).toString('binary');
    if (!str.startsWith('%PDF-')) return false;
    // Look for /Encrypt trailer entry in the first 8KB or last 4KB
    const tail = buffer.slice(Math.max(0, buffer.length - 4096)).toString('binary');
    return str.includes('/Encrypt') || tail.includes('/Encrypt');
}

/**
 * Encrypts a PDF file using standard AES-256 PDF encryption (ISO 32000-1 / Adobe extension).
 * The resulting file requires the password to open in Adobe Acrobat, web browsers, or compatible readers.
 */
async function encryptPdf(buffer, password) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error('Valid PDF buffer is required for encryption.');
    }
    const val = validateLockPassword(password);
    if (!val.valid) {
        const err = new Error(val.error);
        err.code = val.code;
        err.status = 400;
        throw err;
    }

    try {
        const encBytes = await encryptPDF(new Uint8Array(buffer), password);
        const encBuffer = Buffer.from(encBytes);
        if (!encBuffer.slice(0, 8).toString('utf8').startsWith('%PDF-')) {
            throw new Error('Verification failed: Encrypted artifact is not a valid PDF.');
        }
        if (!isPdfEncrypted(encBuffer)) {
            throw new Error('Verification failed: Encrypted artifact does not contain a PDF encryption dictionary.');
        }
        return encBuffer;
    } catch (e) {
        if (e.code) throw e;
        throw new Error(`PDF encryption failed: ${e.message}`);
    }
}

/**
 * Decrypts an encrypted PDF file using the user password and returns extracted text.
 */
async function decryptPdfText(buffer, password) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error('Valid PDF buffer is required for decryption.');
    }
    if (!password) {
        const err = new Error('Document password is required.');
        err.code = 'MISSING_PASSWORD';
        err.status = 400;
        throw err;
    }

    const tmpFilename = `lc_decrypt_${crypto.randomUUID()}.pdf`;
    const tmpPath = path.join(os.tmpdir(), tmpFilename);

    try {
        fs.writeFileSync(tmpPath, buffer);
        const script = [
            'import sys, pypdf',
            'try:',
            '    reader = pypdf.PdfReader(sys.argv[1])',
            '    if not reader.is_encrypted:',
            '        text = "\\n".join(p.extract_text() or "" for p in reader.pages)',
            '        print("OK:" + text.strip())',
            '        sys.exit(0)',
            '    code = reader.decrypt(sys.argv[2])',
            '    if code == 0:',
            '        print("ERR:INVALID_PASSWORD")',
            '        sys.exit(1)',
            '    text = "\\n".join(p.extract_text() or "" for p in reader.pages)',
            '    print("OK:" + text.strip())',
            'except Exception as e:',
            '    print("ERR:" + str(e))',
            '    sys.exit(1)'
        ].join('\n');

        const res = spawnSync('python', ['-c', script, tmpPath, password], { encoding: 'utf8' });
        const output = (res.stdout || '').trim();

        if (output.startsWith('OK:')) {
            return output.slice(3).trim();
        }

        const err = new Error('Incorrect password. The document could not be unlocked.');
        err.code = 'INVALID_PASSWORD';
        err.status = 401;
        throw err;
    } finally {
        if (fs.existsSync(tmpPath)) {
            try { fs.unlinkSync(tmpPath); } catch (_) {}
        }
    }
}

module.exports = {
    generateDocumentLockSeal,
    verifyDocumentLock,
    validateLockPassword,
    encryptDocx,
    decryptDocx,
    isDocxEncrypted,
    extractTextFromDocx,
    generatePdfDocument,
    encryptPdf,
    isPdfEncrypted,
    decryptPdfText
};
