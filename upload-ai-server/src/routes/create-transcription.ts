import { FastifyInstance } from 'fastify';
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { createReadStream } from 'node:fs';
import { openai } from '../lib/openai'

export async function createTranscriptionRoute(app: FastifyInstance) {
    app.post('/videos/:videoId/transcription/', async (request, reply) => {
        const paramsSchema = z.object({
            videoId: z.string().uuid()
        })

        const { videoId } = paramsSchema.parse(request.params)
        const bodySchema = z.object({
            prompt: z.string()
        })


        const { prompt } = bodySchema.parse(request.body)
        const video = await prisma.video.findUnique({
            where: {
                id: videoId
            }
        })

        const videoPath = video?.path

        if (!videoPath) {
            return reply.status(404).send({
                message: 'Video not found'
            })
        }

        const audioReadStrem = createReadStream(videoPath)

        const response = await openai.audio.transcriptions.create({
            file: audioReadStrem,
            model: 'whisper-1',
            language: 'en',
            response_format: 'json',
            temperature: 0,
            prompt
        })

        const transcript = response?.text

        await prisma.video.update({
            where: {
                id: videoId
            },
            data: {
                transcript
            }
        })

        return { transcript }
    })
}