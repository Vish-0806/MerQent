import { Module, Logger } from '@nestjs/common';
import { EMAIL_SERVICE_TOKEN, IEmailService, SendEmailOptions } from './email.interface';

class SandboxEmailService implements IEmailService {
  private readonly logger = new Logger(SandboxEmailService.name);

  async sendEmail(options: SendEmailOptions): Promise<void> {
    this.logger.log(
      `[Email Sandbox] Dispatched "${options.subject}" to ${options.to} via template ${options.templateName}`,
    );
  }
}

@Module({
  providers: [
    {
      provide: EMAIL_SERVICE_TOKEN,
      useClass: SandboxEmailService,
    },
  ],
  exports: [EMAIL_SERVICE_TOKEN],
})
export class EmailModule {}
