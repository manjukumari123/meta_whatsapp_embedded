import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WebhookContact {
  @IsString()
  wa_id: string;

  @IsOptional()
  @IsObject()
  profile?: {
    name: string;
  };
}

export class WebhookMessage {
  @IsString()
  id: string;

  @IsString()
  from: string;

  @IsString()
  timestamp: string;

  @IsOptional()
  @IsObject()
  text?: {
    body: string;
  };

  @IsOptional()
  @IsObject()
  image?: {
    mime_type: string;
    sha256: string;
    id: string;
    caption?: string;
  };

  @IsOptional()
  @IsObject()
  document?: {
    mime_type: string;
    sha256: string;
    id: string;
    filename?: string;
  };

  @IsOptional()
  @IsString()
  type: string;
}

export class WebhookEntry {
  @IsString()
  id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookChange)
  changes: WebhookChange[];
}

export class WebhookChange {
  @IsString()
  field: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookValue)
  value?: WebhookValue;
}

export class WebhookValue {
  @IsString()
  messaging_product: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookMessage)
  messages?: WebhookMessage[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookContact)
  contacts?: WebhookContact[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookStatus)
  statuses?: WebhookStatus[];

  @IsOptional()
  @IsObject()
  metadata?: {
    display_phone_number: string;
    phone_number_id: string;
  };
}

export class WebhookStatus {
  @IsString()
  id: string;

  @IsString()
  status: string;

  @IsString()
  timestamp: string;

  @IsOptional()
  @IsString()
  recipient_id?: string;

  @IsOptional()
  @IsObject()
  conversation?: {
    id: string;
    origin: {
      type: string;
    };
  };
}

export class WebhookEventDto {
  @IsString()
  object: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookEntry)
  entry: WebhookEntry[];
}