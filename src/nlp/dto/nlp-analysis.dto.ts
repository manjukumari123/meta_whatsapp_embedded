import { IntentType } from '../enums/intent.enum';

export class ExtractedEntity {
  doctorName?: string;
  specialization?: string;
  date?: string;
  time?: string;
  timePeriod?: 'morning' | 'afternoon' | 'evening'; // morning: 6-12, afternoon: 12-18, evening: 18-24
  appointmentId?: string;
  slotOrdinal?: number; // 0-based index for ordinal selections (first=0, second=1, etc.)
  confidence?: number;
}

export class NlpAnalysisResult {
  intent: IntentType;
  confidence: number;
  extractedEntities: ExtractedEntity;
  originalText: string;
  rawText: string;
  hasAmbiguity?: boolean;
  ambiguityNotes?: string;
}
