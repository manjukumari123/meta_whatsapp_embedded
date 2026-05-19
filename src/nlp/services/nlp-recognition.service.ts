import { Injectable, Logger } from '@nestjs/common';
import { IntentType } from '../enums/intent.enum';
import { NlpAnalysisResult, ExtractedEntity } from '../dto/nlp-analysis.dto';
import { StructuredLoggingService } from '../../logging/services/structured-logging.service';

@Injectable()
export class NlpRecognitionService {
  private readonly logger = new Logger(NlpRecognitionService.name);

  constructor(private readonly structuredLogger: StructuredLoggingService) {}

  private readonly bookingKeywords = [
    'book',
    'appointment',
    'schedule',
    'reserve',
    'need',
    'want',
    'doctor',
    'dr',
    'tomorrow',
    'today',
    'next',
    'with',
    // Hindi keywords
    'book',
    'appointment',
    'kal',
    'aaj',
    'karna',
    'karo',
    'chahiye',
    'hai',
  ];

  private readonly cancellationKeywords = [
    'cancel',
    'delete',
    'remove',
    'refund',
    'change',
    'reschedule',
    'postpone',
    'appointment',
    // Hindi keywords
    'cancel',
    'delete',
    'hatana',
    'radd',
  ];

  private readonly rescheduleKeywords = [
    'reschedule',
    'change',
    'move',
    'shift',
    'postpone',
    'different',
    'instead',
    'actually',
    'rather',
    // Hindi keywords
    'badl',
    'change',
    'shift',
  ];

  private readonly escalationKeywords = [
    'human',
    'agent',
    'person',
    'talk',
    'speak',
    'help',
    'support',
    'escalate',
    'manager',
    'supervisor',
    // Hindi keywords
    'insan',
    'madad',
    'help',
  ];

  private readonly viewKeywords = [
    'show',
    'list',
    'view',
    'check',
    'upcoming',
    'my',
    'appointments',
    'bookings',
    'scheduled',
  ];

  private readonly slotKeywords = [
    'available',
    'slots',
    'free',
    'timing',
    'time',
    'open',
    'available',
    'vacant',
  ];

  private readonly doctorSpecializations = [
    'dermatologist',
    'skin',
    'cardiologist',
    'heart',
    'dentist',
    'teeth',
    'orthopedic',
    'bones',
    'pediatrician',
    'child',
    'neurologist',
    'brain',
    'surgeon',
    'general',
  ];

  private readonly timePeriodMap = {
    morning: { start: 6, end: 12 },
    afternoon: { start: 12, end: 18 },
    evening: { start: 18, end: 24 },
    night: { start: 18, end: 24 },
    late: { start: 18, end: 24 },
  };

  /**
   * Analyzes user text and returns intent and extracted entities
   */
  analyzeUserInput(userText: string, sessionId?: string, phoneNumber?: string): NlpAnalysisResult {
    const cleanText = this.normalizeText(userText);
    this.logger.log(`Analyzing input | original: ${userText} | normalized: ${cleanText}`);

    const intent = this.detectIntent(cleanText);
    const entities = this.extractEntities(cleanText);
    const confidence = this.calculateConfidence(intent, entities, cleanText);

    const result: NlpAnalysisResult = {
      intent,
      confidence,
      extractedEntities: entities,
      originalText: userText,
      rawText: cleanText,
      hasAmbiguity: confidence < 0.7,
      ambiguityNotes: confidence < 0.7 ? 'Low confidence - may need clarification' : undefined,
    };

    this.logger.log(
      `Analysis complete | intent: ${result.intent} | confidence: ${result.confidence} | entities: ${JSON.stringify(entities)}`,
    );

    // Log intent detection
    this.structuredLogger.logIntentDetection({
      sessionId,
      phoneNumber,
      userMessage: userText,
      detectedIntent: intent,
      confidence,
      status: intent === IntentType.FALLBACK ? 'FALLBACK' : 'SUCCESS',
    });

    // Log entity extraction
    this.structuredLogger.logEntityExtraction({
      sessionId,
      phoneNumber,
      intent,
      entities,
      status: Object.keys(entities).length > 0 ? 'SUCCESS' : (confidence < 0.7 ? 'PARTIAL' : 'FAILURE'),
    });

    return result;
  }

  /**
   * Normalizes text by removing extra spaces, converting to lowercase, fixing typos
   */
  private normalizeText(text: string): string {
    let normalized = text.toLowerCase().trim();

    // Remove extra spaces
    normalized = normalized.replace(/\s+/g, ' ');

    // Fix common typos
    normalized = normalized.replace(/docter/g, 'doctor');
    normalized = normalized.replace(/dktor/g, 'doctor');
    normalized = normalized.replace(/apt/g, 'appointment');
    normalized = normalized.replace(/appt/g, 'appointment');
    normalized = normalized.replace(/tmrw/g, 'tomorrow');
    normalized = normalized.replace(/tdy/g, 'today');
    normalized = normalized.replace(/tonite/g, 'tonight');
    normalized = normalized.replace(/pls/g, 'please');
    normalized = normalized.replace(/plz/g, 'please');
    normalized = normalized.replace(/wanna/g, 'want to');
    normalized = normalized.replace(/wana/g, 'want to');
    normalized = normalized.replace(/cuz/g, 'because');
    normalized = normalized.replace(/ur/g, 'your');
    normalized = normalized.replace(/b4/g, 'before');

    // Handle Hindi keywords (transliteration)
    normalized = normalized.replace(/kal/g, 'tomorrow');
    normalized = normalized.replace(/aaj/g, 'today');
    normalized = normalized.replace(/karna/g, 'book');
    normalized = normalized.replace(/karo/g, 'book');
    normalized = normalized.replace(/chahiye/g, 'need');
    normalized = normalized.replace(/hai/g, '');
    normalized = normalized.replace(/hatana/g, 'cancel');
    normalized = normalized.replace(/radd/g, 'cancel');
    normalized = normalized.replace(/badl/g, 'change');
    normalized = normalized.replace(/insan/g, 'human');
    normalized = normalized.replace(/madad/g, 'help');

    return normalized;
  }

  /**
   * Detects intent from normalized text
   */
  private detectIntent(text: string): IntentType {
    const words = text
      .split(' ')
      .map((token) => token.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);

    // Check for escalation intent (highest priority - user wants human)
    const escalationMatched = words.some((w) =>
      this.escalationKeywords.includes(w),
    );
    if (escalationMatched) {
      return IntentType.ESCALATE_TO_AGENT;
    }

    // Check for reschedule intent (context continuation with "actually", "instead", etc.)
    const rescheduleMatched = words.some((w) =>
      this.rescheduleKeywords.includes(w),
    );
    if (rescheduleMatched) {
      return IntentType.RESCHEDULE_APPOINTMENT;
    }

    // Check for explicit cancellation keywords
    const cancellationMatched = words.some((w) =>
      ['cancel', 'delete', 'remove', 'refund', 'postpone'].includes(w),
    );

    if (cancellationMatched) {
      return IntentType.CANCEL_APPOINTMENT;
    }

    // Check view intent (before booking to avoid conflicts with "bookings" keyword)
    if (
      words.some((w) => ['show', 'list', 'view', 'check', 'upcoming', 'scheduled'].includes(w)) &&
      words.some((w) => ['bookings', 'appointments'].includes(w))
    ) {
      return IntentType.VIEW_APPOINTMENTS;
    }

    // Check slots intent (before booking to avoid conflicts)
    if (
      words.includes('available') &&
      (words.includes('slots') || words.includes('times') || words.includes('open'))
    ) {
      return IntentType.CHECK_SLOTS;
    }

    // Check booking intent
    const specializationMatched = words.some((w) =>
      this.doctorSpecializations.includes(w),
    );

    if (
      this.matchKeywords(words, this.bookingKeywords, 2) ||
      words.includes('book') ||
      words.includes('appointment') ||
      words.includes('doctor') ||
      words.includes('dr') ||
      specializationMatched
    ) {
      return IntentType.BOOK_APPOINTMENT;
    }

    return IntentType.FALLBACK;
  }

  /**
   * Matches keywords against text words
   */
  private matchKeywords(words: string[], keywords: string[], threshold: number): boolean {
    const matchCount = keywords.filter((kw) => words.some((w) => w.includes(kw))).length;
    return matchCount >= threshold;
  }

  /**
   * Extracts entities from normalized text
   */
  private extractEntities(text: string): ExtractedEntity {
    const entities: ExtractedEntity = {};

    // Extract doctor name (looks for "Dr. X" or "with X" pattern, but avoid time/date words)
    const drMatch = text.match(/(?:dr\.?\s|with\s)([a-z\s]+?)(?=\s(?:for|at|on|in|tomorrow|today|morning|afternoon|evening|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday|and|or|&)|$)/i);
    if (drMatch && drMatch[1]) {
      const doctorCandidate = drMatch[1].trim();
      if (doctorCandidate) {
        entities.doctorName = this.capitalizeWords(doctorCandidate);
      }
    }

    // Extract specialization
    for (const spec of this.doctorSpecializations) {
      if (text.includes(spec)) {
        entities.specialization = spec;
        break;
      }
    }

    // Map common terms to actual specializations
    if (entities.specialization) {
      const specializationMap: { [key: string]: string } = {
        'skin': 'dermatologist',
        'heart': 'cardiologist',
        'teeth': 'dentist',
        'bones': 'orthopedic',
        'child': 'pediatrician',
        'brain': 'neurologist',
      };
      entities.specialization = specializationMap[entities.specialization] || entities.specialization;
    }

    // Extract date
    entities.date = this.extractDate(text);

    // Extract time
    entities.time = this.extractTime(text);

    // Extract time period (morning, afternoon, evening)
    entities.timePeriod = this.extractTimePeriod(text);

    // Extract appointment ID (for cancellations)
    const idMatch = text.match(/(?:appointment|id|booking)\s*#?(\d+)/);
    if (idMatch && idMatch[1]) {
      entities.appointmentId = idMatch[1];
    }

    // Extract ordinal slot selection (first, second, third, etc.)
    entities.slotOrdinal = this.extractOrdinalSelection(text);

    return entities;
  }

  /**
   * Extracts date from text
   */
  private extractDate(text: string): string | undefined {
    // Handle "tomorrow"
    if (text.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Handle "today"
    if (text.includes('today')) {
      return new Date().toISOString().split('T')[0];
    }

    // Handle day of week (next monday, etc.)
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (let i = 0; i < daysOfWeek.length; i++) {
      if (text.includes(daysOfWeek[i])) {
        const today = new Date();
        const dayOfWeek = i;
        const diff = (dayOfWeek - today.getDay() + 7) % 7;
        const date = new Date(today);
        date.setDate(date.getDate() + (diff || 7));
        return date.toISOString().split('T')[0];
      }
    }

    // Handle explicit dates (YYYY-MM-DD or DD-MM-YYYY)
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})/);
    if (dateMatch) {
      return dateMatch[1];
    }

    return undefined;
  }

  /**
   * Extracts time from text (HH:MM format)
   */
  private extractTime(text: string): string | undefined {
    // Match time patterns: "10:30", "10:30 AM", "10:30PM", "3 pm", "3pm"
    const timeMatch = text.match(
      /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i,
    );

    if (timeMatch) {
      const hour = parseInt(timeMatch[1] || timeMatch[4]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = (timeMatch[3] || timeMatch[5] || '').toLowerCase();

      let adjustedHour = hour;
      if (period === 'pm' && hour !== 12) {
        adjustedHour = hour + 12;
      }
      if (period === 'am' && hour === 12) {
        adjustedHour = 0;
      }

      return `${String(adjustedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    return undefined;
  }

  /**
   * Extracts time period (morning, afternoon, evening)
   */
  private extractTimePeriod(
    text: string,
  ): 'morning' | 'afternoon' | 'evening' | undefined {
    for (const [period, _] of Object.entries(this.timePeriodMap)) {
      if (text.includes(period)) {
        return period as 'morning' | 'afternoon' | 'evening';
      }
    }
    return undefined;
  }

  /**
   * Extracts ordinal slot selection from text (first, second, third, etc.)
   */
  private extractOrdinalSelection(text: string): number | undefined {
    const numericOrdinalMatch = text.match(/\b(\d+)(?:st|nd|rd|th)\b/);
    if (numericOrdinalMatch?.[1]) {
      const ordinal = Number(numericOrdinalMatch[1]);
      return Number.isNaN(ordinal) || ordinal <= 0 ? undefined : ordinal - 1;
    }

    const ordinalMap: { [key: string]: number } = {
      'first': 0,
      '1st': 0,
      'second': 1,
      '2nd': 1,
      'third': 2,
      '3rd': 2,
      'fourth': 3,
      '4th': 3,
      'fifth': 4,
      '5th': 4,
      'sixth': 5,
      '6th': 5,
      'seventh': 6,
      '7th': 6,
      'eighth': 7,
      '8th': 7,
    };

    for (const [ordinal, index] of Object.entries(ordinalMap)) {
      if (text.includes(ordinal)) {
        return index;
      }
    }

    return undefined;
  }

  /**
   * Calculates confidence score
   */
  private calculateConfidence(
    intent: IntentType,
    entities: ExtractedEntity,
    text: string,
  ): number {
    let confidence = 0.5;

    // Boost confidence if intent is clear (not FALLBACK)
    if (intent !== IntentType.FALLBACK) {
      confidence += 0.2;
    }

    // Boost for extracted entities
    if (entities.doctorName) confidence += 0.1;
    if (entities.date) confidence += 0.1;
    if (entities.time) confidence += 0.05;
    if (entities.specialization) confidence += 0.05;

    // Penalize for very short text
    if (text.length < 5) confidence -= 0.1;

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Capitalizes words
   */
  private capitalizeWords(text: string): string {
    return text
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
