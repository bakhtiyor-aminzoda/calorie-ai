import { Router } from 'express';
import multer from 'multer';
import { analyzeFoodImage } from '../services/openai';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const userId = req.body.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID required for analysis' });
        }

        // 1. Check Rate Limits
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.isPremium) {
            const now = new Date();
            const lastRequest = new Date(user.lastRequestDate);
            const isSameDay = now.getDate() === lastRequest.getDate() &&
                now.getMonth() === lastRequest.getMonth() &&
                now.getFullYear() === lastRequest.getFullYear();

            // Reset if new day
            let count = isSameDay ? user.dailyRequestCount : 0;

            if (count >= 3) {
                return res.status(403).json({ error: 'Daily limit reached', code: 'LIMIT_REACHED' });
            }

            // Update counter
            await prisma.user.update({
                where: { id: userId },
                data: {
                    dailyRequestCount: count + 1,
                    lastRequestDate: now
                }
            });
        }

        // Convert buffer to base64 for OpenAI
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        console.log(`[Analyze] User ${userId} starting analysis (Premium: ${user.isPremium})`);

        // Parallel execution: Analyze content AND Upload to CDN
        const analyzedPromise = analyzeFoodImage(base64Image);

        // Import dynamically if needed or assume import is available at top
        const { uploadImage } = await import('../services/cloudinary');
        const uploadPromise = uploadImage(req.file.buffer);

        const [analysisResult, photoUrl] = await Promise.all([analyzedPromise, uploadPromise]);

        console.log('Analysis and Upload complete.', { photoUrl });

        // Return both analysis and the pre-uploaded URL
        res.json({ ...analysisResult, photoUrl });
    } catch (error) {
        console.error('Analysis failed:', error);
        res.status(500).json({ error: 'Failed to analyze image' });
    }
});

export default router;
