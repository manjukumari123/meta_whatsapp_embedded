export interface WhatsAppTemplateParameter {
  type: 'text' | 'currency' | 'date_time';
  text?: string;
  currency?: { code: string; amount_1000: number };
}

export interface WhatsAppTemplateComponent {
  type: 'BODY' | 'HEADER' | 'FOOTER' | 'BUTTON';
  parameters: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplatePayload {
  name: string;
  language: {
    code: string;
  };
  components: WhatsAppTemplateComponent[];
}

export interface SendMessageDto {
  to: string;
  message?: string;
  template?: WhatsAppTemplatePayload;
  retryCount?: number;
  fallbackAttempt?: boolean;
}

export interface SignupStartResponse {
  success: boolean;
  redirectUrl?: string;
  signupUrl?: string;
  state?: string;
  businessId?: string;
  businessName?: string;
  phoneNumber?: string;
  expiresIn?: number;
  instructions?: string;
  error?: string;
}

export interface SignupCallbackResponse {
  success: boolean;
  businessId?: string;
  wabaId?: string;
  phoneNumberId?: string;
  accessToken?: string;
  error?: string;
}

export interface WebhookVerificationResponse {
  challenge?: string;
  error?: string;
}

export interface ProviderSendResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  providerStatus?: string;
  sentAt?: string;
  failureReason?: string;
  retryMetadata?: {
    attempt: number;
    maxRetries: number;
    nextRetryIn?: number;
  };
}

export interface IWhatsAppProvider {
  sendMessage(dto: SendMessageDto): Promise<ProviderSendResponse>;

  startSignup(options?: any): Promise<SignupStartResponse>;

  handleCallback(code: string, state?: string): Promise<SignupCallbackResponse>;

  verifyWebhook(mode: string, token: string, challenge: string): Promise<WebhookVerificationResponse>;

  handleWebhook(payload: any): Promise<{ success: boolean; error?: string }>;

  getProviderName(): string;
}
