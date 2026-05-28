import { FastifySchema } from 'fastify'

export const sendOtpSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['phone'],
    properties: {
      phone: { type: 'string', pattern: '^\\+614[0-9]{8}$' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        expires_in: { type: 'number' }
      }
    }
  }
}

export const verifyOtpSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['phone', 'otp'],
    properties: {
      phone: { type: 'string' },
      otp: { type: 'string', minLength: 6, maxLength: 6 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        expires_in: { type: 'number' },
        tradie_id: { type: ['string', 'null'] },
        is_new_user: { type: 'boolean' }
      }
    }
  }
}

export const refreshSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['refresh_token'],
    properties: {
      refresh_token: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        expires_in: { type: 'number' }
      }
    }
  }
}

export const logoutSchema: FastifySchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
}

export const emailRegisterSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['email', 'password', 'first_name', 'last_name', 'trade_type'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      first_name: { type: 'string' },
      last_name: { type: 'string' },
      trade_type: { type: 'string' },
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        expires_in: { type: 'number' },
        tradie_id: { type: 'string' },
        is_new_user: { type: 'boolean' }
      }
    }
  }
}

export const emailLoginSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        expires_in: { type: 'number' },
        tradie_id: { type: 'string' },
        is_new_user: { type: 'boolean' }
      }
    }
  }
}

export const forgotPasswordSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
}

export const oauthCallbackSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['provider', 'id_token'],
    properties: {
      provider: { type: 'string', enum: ['google', 'apple'] },
      id_token: { type: 'string' },
      access_token: { type: 'string' },
      full_name: { type: 'string' },
      email: { type: 'string', format: 'email' },
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        expires_in: { type: 'number' },
        tradie_id: { type: 'string' },
        is_new_user: { type: 'boolean' }
      }
    }
  }
}

export const linkProviderSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['provider'],
    properties: {
      provider: { type: 'string', enum: ['phone', 'google', 'apple', 'email'] }
    }
  },
  body: {
    type: 'object',
    properties: {
      id_token: { type: 'string' },
      email: { type: 'string' },
      password: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
}

export const unlinkProviderSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['provider'],
    properties: {
      provider: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
}

export const getAuthMethodsSchema: FastifySchema = {
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          isPrimary: { type: 'boolean' },
          lastUsedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
}
