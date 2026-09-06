// src/app/navigation/types.ts
export type RootStackParamList = {
  Auth: undefined
  App: undefined
}

export type AuthStackParamList = {
  Login: undefined
  Phone: undefined
  OTP: { phone: string }
  TradeType: undefined
  Register: undefined
  ForgotPassword: undefined
  ResetPassword: { token: string }
  ABN: undefined
  DocumentUpload: undefined
}

export type AppTabParamList = {
  Dashboard: undefined
  Jobs: undefined
  Calendar: undefined
  Invoices: undefined
  Notifications: undefined
  Profile: undefined
}

export type JobsStackParamList = {
  JobList: undefined
  JobDetail: { jobId: string }
  NewJob: undefined
  QuickJob: undefined
  Invoice: { jobId: string }
  Signature: { invoiceId: string }
  Payment: { invoiceId: string; amountCents: number }
}

export type ProfileStackParamList = {
  ProfileMain: undefined
  SyncHealth: undefined
  Earnings: undefined
  Team: undefined
  Documents: undefined
  Reviews: undefined
  Supplies: undefined
  Integrations: undefined
  VoiceAgent: undefined
  Language: undefined
}
