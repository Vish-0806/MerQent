export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  templateName: string;
  templateData: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export const EMAIL_SERVICE_TOKEN = 'IEmailService';

export interface IEmailService {
  sendEmail(options: SendEmailOptions): Promise<void>;
}
