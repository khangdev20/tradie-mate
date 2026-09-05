import { FastifySchema } from 'fastify'

export const registerTradieSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['first_name', 'last_name', 'trade_type'],
    properties: {
      first_name: { type: 'string', minLength: 1, maxLength: 50 },
      last_name: { type: 'string', minLength: 1, maxLength: 50 },
      trade_type: { 
        type: 'string', 
        enum: ["PLUMBER", "ELECTRICIAN", "CARPENTER", "HVAC", "PAINTER", "TILER", "ROOFER", "OTHER"] 
      },
      abn: { type: 'string', minLength: 11, maxLength: 11 },
      legal_consent: {
        type: 'object',
        required: ['terms_version', 'privacy_version', 'disclaimer_version', 'accepted_at'],
        properties: {
          terms_version: { type: 'string', maxLength: 32 },
          privacy_version: { type: 'string', maxLength: 32 },
          disclaimer_version: { type: 'string', maxLength: 32 },
          accepted_at: { type: 'string', format: 'date-time' },
        },
      },
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        tradie_id: { type: 'string' },
        is_new_user: { type: 'boolean' }
      }
    }
  }
}
