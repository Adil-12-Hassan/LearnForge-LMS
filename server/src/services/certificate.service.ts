import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '../config/database.js';

// | Error helper   

function createError(message: string, statusCode: number) {
    return Object.assign(new Error(message), { statusCode, isOperational: true });
}

// | Helpers  

function generateCertNo(): string {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `LF-${year}-${rand}`;
}

function uploadBuffer(buffer: Buffer, options: object): Promise<{ secure_url: string }> {
    return new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(options, (error, result) => {
                if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
                resolve(result as { secure_url: string });
            })
            .end(buffer);
    });
}

async function buildPDF(
    studentName: string,
    courseName: string,
    certNo: string,
    issuedAt: Date,
): Promise<Buffer> {
    const doc  = await PDFDocument.create();
    const page = doc.addPage([842, 595]); // A4 landscape
    const { width, height } = page.getSize();

    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const font     = await doc.embedFont(StandardFonts.Helvetica);

    const blue  = rgb(0.18, 0.38, 0.68);
    const dark  = rgb(0.1,  0.1,  0.1);
    const grey  = rgb(0.35, 0.35, 0.35);
    const cream = rgb(0.98, 0.97, 0.93);

    const cx = width / 2; // center x

    // Background
    page.drawRectangle({ x: 0, y: 0, width, height, color: cream });

    // Outer border
    page.drawRectangle({
        x: 20, y: 20, width: width - 40, height: height - 40,
        borderColor: blue, borderWidth: 3,
    });

    // Inner border
    page.drawRectangle({
        x: 30, y: 30, width: width - 60, height: height - 60,
        borderColor: blue, borderWidth: 1,
    });

    // Brand
    const brand = 'LearnForge';
    page.drawText(brand, {
        x: cx - boldFont.widthOfTextAtSize(brand, 28) / 2,
        y: height - 95,
        size: 28, font: boldFont, color: blue,
    });

    // Title
    const title = 'Certificate of Completion';
    page.drawText(title, {
        x: cx - boldFont.widthOfTextAtSize(title, 20) / 2,
        y: height - 135,
        size: 20, font: boldFont, color: dark,
    });

    // Divider
    page.drawLine({
        start: { x: 100, y: height - 155 },
        end:   { x: width - 100, y: height - 155 },
        color: blue, thickness: 1,
    });

    // Body text
    const sub1 = 'This is to certify that';
    page.drawText(sub1, {
        x: cx - font.widthOfTextAtSize(sub1, 13) / 2,
        y: height - 200,
        size: 13, font, color: grey,
    });

    // Student name
    page.drawText(studentName, {
        x: cx - boldFont.widthOfTextAtSize(studentName, 30) / 2,
        y: height - 250,
        size: 30, font: boldFont, color: dark,
    });

    // Name underline
    page.drawLine({
        start: { x: cx - 160, y: height - 262 },
        end:   { x: cx + 160, y: height - 262 },
        color: grey, thickness: 0.5,
    });

    const sub2 = 'has successfully completed the course';
    page.drawText(sub2, {
        x: cx - font.widthOfTextAtSize(sub2, 13) / 2,
        y: height - 292,
        size: 13, font, color: grey,
    });

    // Course name (truncate if too long)
    const displayCourse = courseName.length > 60 ? courseName.slice(0, 57) + '...' : courseName;
    page.drawText(displayCourse, {
        x: cx - boldFont.widthOfTextAtSize(displayCourse, 19) / 2,
        y: height - 335,
        size: 19, font: boldFont, color: blue,
    });

    // Footer
    const dateStr = issuedAt.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    page.drawText(`Issued: ${dateStr}`, {
        x: 60, y: 65,
        size: 10, font, color: grey,
    });

    const certLabel = `Certificate No: ${certNo}`;
    page.drawText(certLabel, {
        x: width - 60 - font.widthOfTextAtSize(certLabel, 10),
        y: 65,
        size: 10, font, color: grey,
    });

    const bytes = await doc.save();
    return Buffer.from(bytes);
}

// | Service  

export const certificateService = {

    // Called internally by enrollment service when course is marked complete.
    // Safe to call multiple times — skips if certificate already exists.
    async issueCertificate(studentId: string, courseId: string): Promise<void> {
        const existing = await prisma.certificate.findFirst({
            where: { studentId, courseId },
        });
        if (existing) return; // idempotent

        const [student, course] = await Promise.all([
            prisma.user.findUnique({
                where: { id: studentId },
                select: { firstName: true, lastName: true },
            }),
            prisma.course.findUnique({
                where: { id: courseId },
                select: { title: true },
            }),
        ]);

        if (!student || !course) throw createError('Student or course not found', 404);

        const studentName = `${student.firstName} ${student.lastName}`;
        const certNo      = generateCertNo();
        const issuedAt    = new Date();

        const pdfBuffer = await buildPDF(studentName, course.title, certNo, issuedAt);

        const uploaded = await uploadBuffer(pdfBuffer, {
            folder:        'learnforge/certificates',
            resource_type: 'raw',
            public_id:     certNo,
            format:        'pdf',
        });

        await prisma.certificate.create({
            data: {
                certificateNo: certNo,
                studentId,
                courseId,
                pdfUrl:   uploaded.secure_url,
                issuedAt,
            },
        });
    },

    async getMyCertificates(studentId: string) {
        return prisma.certificate.findMany({
            where: { studentId },
            include: {
                course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
            },
            orderBy: { issuedAt: 'desc' },
        });
    },

    async verify(certificateNo: string) {
        const cert = await prisma.certificate.findUnique({
            where: { certificateNo },
            include: {
                student: { select: { firstName: true, lastName: true } },
                course:  { select: { title: true } },
            },
        });
        if (!cert) throw createError('Certificate not found or invalid', 404);
        return cert;
    },
};