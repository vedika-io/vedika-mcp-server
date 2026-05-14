import { z } from 'zod';

export const BirthDetailsSchema = z.object({
  datetime: z.string()
    .describe('Birth date and time in ISO 8601 format, e.g. "1990-06-15T14:30:00". Required for all chart calculations.'),
  latitude: z.number().min(-90).max(90)
    .describe('Birth location latitude (-90 to 90). Polar latitudes >66.5 are rejected (house calculations unreliable).'),
  longitude: z.number().min(-180).max(180)
    .describe('Birth location longitude (-180 to 180).'),
  timezone: z.string()
    .describe('Timezone as UTC offset "+05:30" or IANA "Asia/Kolkata". UTC offsets preferred.'),
  ayanamsa: z.enum(['lahiri', 'kp', 'raman', 'yukteshwar', 'fagan-bradley', 'true-chitra', 'true-revati', 'ss-citra']).optional()
    .describe('Sidereal zodiac correction. Default: lahiri. Only for Vedic calculations.'),
});

export type BirthDetails = z.infer<typeof BirthDetailsSchema>;

const MatchPersonSchema = z.object({
  datetime: z.string().describe('Birth datetime in ISO 8601 format, e.g. "1990-06-15T14:30:00"'),
  latitude: z.number().min(-90).max(90).describe('Birth latitude'),
  longitude: z.number().min(-180).max(180).describe('Birth longitude'),
  timezone: z.string().describe('Timezone as UTC offset "+05:30" or IANA name'),
  ayanamsa: z.enum(['lahiri', 'kp', 'raman', 'yukteshwar', 'fagan-bradley', 'true-chitra', 'true-revati', 'ss-citra']).optional()
    .describe('Sidereal correction. Default: lahiri.'),
});

export const VedicMatchingSchema = z.object({
  male: MatchPersonSchema.describe('Male birth details'),
  female: MatchPersonSchema.describe('Female birth details'),
});

const WesternPersonSchema = z.object({
  datetime: z.string().describe('Birth datetime in ISO 8601 format'),
  latitude: z.number().min(-90).max(90).describe('Birth latitude'),
  longitude: z.number().min(-180).max(180).describe('Birth longitude'),
  timezone: z.string().describe('Timezone as UTC offset or IANA name'),
});

export const WesternRelationshipSchema = z.object({
  person1: WesternPersonSchema.describe('First person birth details'),
  person2: WesternPersonSchema.describe('Second person birth details'),
});

export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90).optional()
    .describe('Location latitude. Defaults to Delhi (28.6139).'),
  longitude: z.number().min(-180).max(180).optional()
    .describe('Location longitude. Defaults to Delhi (77.2090).'),
  timezone: z.string().optional()
    .describe('Timezone. Defaults to "+05:30" (IST).'),
});

export const NumerologyPersonSchema = z.object({
  name: z.string().describe('Full name for numerology calculation'),
  birthDate: z.string().describe('Birth date in YYYY-MM-DD format'),
});

export const SignEnum = z.enum([
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  'mesha', 'vrishabha', 'mithuna', 'karka', 'simha', 'kanya',
  'tula', 'vrishchika', 'dhanu', 'makara', 'kumbha', 'meena',
]);

export function extractBirthDetails(args: Record<string, unknown>): Record<string, unknown> {
  const details: Record<string, unknown> = {
    datetime: args.datetime,
    latitude: args.latitude,
    longitude: args.longitude,
    timezone: args.timezone,
  };
  if (args.ayanamsa) details.ayanamsa = args.ayanamsa;
  return details;
}

export const ChineseZodiacAnimalEnum = z.enum([
  'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake',
  'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig',
]);

export const TarotSpreadEnum = z.enum([
  'single', 'three-card', 'celtic-cross', 'horseshoe', 'relationship', 'career',
]);

export const PlanetEnum = z.enum([
  'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu',
]);

export const MatrimonyMatchPersonSchema = z.object({
  datetime: z.string().describe('Birth datetime in ISO 8601 format, e.g. "1990-06-15T14:30:00"'),
  latitude: z.number().min(-90).max(90).describe('Birth latitude'),
  longitude: z.number().min(-180).max(180).describe('Birth longitude'),
  timezone: z.string().describe('Timezone as UTC offset "+05:30" or IANA name'),
  name: z.string().optional().describe('Person name'),
  gender: z.enum(['male', 'female']).describe('Gender (required for Kundali matching)'),
  ayanamsa: z.enum(['lahiri', 'kp', 'raman', 'yukteshwar', 'fagan-bradley', 'true-chitra', 'true-revati', 'ss-citra']).optional()
    .describe('Sidereal correction. Default: lahiri.'),
});

export function extractLocationParams(args: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  if (args.latitude !== undefined) params.latitude = String(args.latitude);
  if (args.longitude !== undefined) params.longitude = String(args.longitude);
  if (args.timezone !== undefined) params.timezone = String(args.timezone);
  return params;
}
