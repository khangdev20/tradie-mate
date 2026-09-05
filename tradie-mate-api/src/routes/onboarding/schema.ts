export const completeProfileSchema = {
  tags: ['onboarding'],
  summary: 'Create tradie profile after phone OTP verification',
  body: {
    type: 'object',
    required: [
      'first_name', 'last_name', 'email', 'phone',
      'trade_type', 'business_name', 'abn', 'has_public_liability', 'legal_consent',
    ],
    properties: {
      first_name:           { type: 'string', minLength: 1, maxLength: 50 },
      last_name:            { type: 'string', minLength: 1, maxLength: 50 },
      email:                { type: 'string', format: 'email', maxLength: 255 },
      phone:                { type: 'string', pattern: '^\\+614\\d{8}$' },
      trade_type:           { type: 'string', enum: ['PLUMBER','ELECTRICIAN','CARPENTER','HVAC','PAINTER','TILER','ROOFER','OTHER'] },
      business_name:        { type: 'string', minLength: 2, maxLength: 200 },
      abn:                  { type: 'string', pattern: '^[\\d\\s]{9,14}$' },
      has_public_liability: { type: 'boolean' },
      experience_years:     { type: 'string', enum: ['<1', '1-3', '3-5', '5+'], nullable: true },
      legal_consent: {
        type: 'object',
        required: ['terms_version', 'privacy_version', 'disclaimer_version'],
        properties: {
          terms_version:      { type: 'string' },
          privacy_version:    { type: 'string' },
          disclaimer_version: { type: 'string' },
          accepted_at:        { type: 'string' },
        },
      },
    },
  },
}

export const getOnboardingStatusSchema = {
  tags: ['onboarding'],
  summary: 'Get current onboarding status and resume step',
}

export const validateAbnSchema = {
  tags: ['onboarding'],
  summary: 'Validate ABN via Australian Business Register',
  body: {
    type: 'object',
    required: ['abn'],
    properties: {
      abn: { type: 'string' },
    },
  },
}

export const uploadDocumentSchema = {
  tags: ['documents'],
  summary: 'Upload a verification document (multipart)',
  consumes: ['multipart/form-data'],
}
