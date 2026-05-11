export interface SendMessageDto {
  to: string;
  message: string;
}

export interface SignupStartResponse {
  success: boolean;
  redirectUrl?: string;
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

export interface IWhatsAppProvider {
  sendMessage(dto: SendMessageDto): Promise<{ success: boolean; messageId?: string; error?: string }>;
  
  startSignup(): Promise<SignupStartResponse>;
  
  handleCallback(code: string, state?: string): Promise<SignupCallbackResponse>;
  
  verifyWebhook(mode: string, token: string, challenge: string): Promise<WebhookVerificationResponse>;
  
  handleWebhook(payload: any): Promise<{ success: boolean; error?: string }>;
  
  getProviderName(): string;
}
