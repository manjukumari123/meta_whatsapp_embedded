import { Controller, Post, Body, BadRequestException, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
} from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { SendMessageDto } from './dto';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('send-message')
  async sendMessage(@Body() dto: SendMessageDto) {
    this.logger.log(`[Controller] POST /whatsapp/send-message - to: ${dto.to}`);
    
    if (!dto.to || !dto.message) {
      throw new BadRequestException('to and message are required');
    }

    const result = await this.whatsappService.sendMessage(dto.to, dto.message);
    return result;
  }
}
