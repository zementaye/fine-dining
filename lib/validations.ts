import { z } from "zod";

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  partySize: z.coerce.number().int().min(1).max(20),
});

export const createReservationSchema = z.object({
  idempotencyKey: z.string().uuid().optional(),
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(7).max(30).optional(),
  partySize: z.number().int().min(1).max(20),
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservationTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  occasion: z.string().max(200).optional(),
  dietaryNotes: z.string().max(1000).optional(),
  seatingPreference: z.string().max(200).optional(),
  mobilityNotes: z.string().max(500).optional(),
});

export const adminCreateReservationSchema = createReservationSchema.extend({
  source: z.enum(["phone", "walk_in"]).default("phone"),
  internalNotes: z.string().max(2000).optional(),
  preferredTableId: z.string().uuid().optional(),
  allowOverbookingBuffer: z.boolean().default(false),
});

export const updateReservationSchema = z.object({
  status: z.enum(["pending", "confirmed", "seated", "completed", "cancelled", "no_show"]).optional(),
  tableId: z.string().uuid().nullable().optional(),
  internalNotes: z.string().max(2000).optional(),
  dietaryNotes: z.string().max(1000).optional(),
  mobilityNotes: z.string().max(500).optional(),
});

export const waitlistCreateSchema = z.object({
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(7).max(30).optional(),
  partySize: z.number().int().min(1).max(20),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestedTimeRange: z.string().min(1).max(50),
});

export const privateEventInquirySchema = z.object({
  contactName: z.string().min(1).max(200),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7).max(30).optional(),
  eventType: z.string().min(1).max(100),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partySize: z.number().int().min(1).max(500),
  message: z.string().max(2000).optional(),
});

export const assignTableSchema = z.object({
  reservationId: z.string().uuid(),
  tableId: z.string().uuid(),
});
