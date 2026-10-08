import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Service Health Check' })
  @ApiResponse({ status: 200, description: 'Service is operational' })
  checkHealth() {
    return {
      status: 'ok',
      service: 'MerQent API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
