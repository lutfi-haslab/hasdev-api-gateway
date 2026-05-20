import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import { Environment } from '../../bindings'

const emailRoutes = new Hono<Environment>()

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
  fromName: z.string().min(1).optional(),
  fromEmail: z.string().email().optional(),
}).refine((value) => value.text || value.html, {
  message: 'Either text or html is required',
  path: ['text'],
})

emailRoutes.post(
  '/send',
  describeRoute({
    description: 'Send email using SMTP',
    tags: ['Email'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              to: { type: 'string', example: 'recipient@example.com' },
              subject: { type: 'string', example: 'Hello from Sumopod' },
              text: { type: 'string', example: 'This is a test email sent via Sumopod SMTP.' },
              html: { type: 'string', example: '<b>This is a test email sent via Sumopod SMTP.</b>' },
              fromName: { type: 'string', example: 'Lutfi Ikbal Majid' },
              fromEmail: { type: 'string', example: 'sender@example.com' },
            },
            required: ['to', 'subject'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Email successfully sent',
      },
    },
  }),
  zValidator('json', sendEmailSchema),
  async (c) => {
    try {
      const payload = c.req.valid('json')

      const smtpPort = Number(c.env.SMTP_PORT || '465')
      const smtpSecure = (c.env.SMTP_SECURE || 'true').toLowerCase() === 'true'

      const transporter = nodemailer.createTransport({
        host: c.env.SMTP_HOST || 'smtp.sumopod.com',
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: c.env.SMTP_USER,
          pass: c.env.SMTP_PASS,
        },
      })

      const fromName = payload.fromName || c.env.SMTP_FROM_NAME || 'Mailer'
      const fromEmail = payload.fromEmail || c.env.SMTP_FROM_EMAIL || c.env.SMTP_USER

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      })

      return c.json({
        success: true,
        messageId: info.messageId,
      })
    } catch (error) {
      console.error('Failed to send email:', error)
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send email',
        },
        500,
      )
    }
  },
)

export default emailRoutes
