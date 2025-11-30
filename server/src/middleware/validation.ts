import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  name: z.string().min(1, 'Name is required').max(100).trim(),
});

export const socialLoginSchema = z.object({
  provider: z.enum(['google']),
  idToken: z.string().min(1, 'ID token is required'),
});

export const grinderSchema = z.object({
  model: z.string().min(1).max(200),
  photo: z.string().nullable().optional(),
  burrType: z.enum(['conical', 'flat']),
  idealFor: z.enum(['pour-over', 'espresso', 'both']),
});

export const brewerSchema = z.object({
  model: z.string().min(1).max(200),
  photo: z.string().nullable().optional(),
  type: z.enum(['espresso', 'pour-over']),
});

export const coffeeServerSchema = z.object({
  model: z.string().min(1).max(200),
  photo: z.string().nullable().optional(),
  maxVolume: z.number().positive().optional(),
  emptyWeight: z.number().positive().optional(),
});

export const coffeeBeanSchema = z.object({
  photo: z.string().nullable().optional(),
  name: z.string().min(1).max(200),
  roaster: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  altitude: z.string().max(50).optional(),
  varietal: z.string().max(100).optional(),
  process: z.string().max(100).optional(),
  roastLevel: z.string().max(50).optional(),
  roastFor: z.enum(['pour-over', 'espresso', '']).optional(),
  tastingNotes: z.string().max(500).optional(),
  url: z.string().max(1000).nullable().optional(),
  favorite: z.boolean().optional(),
  lowStockThreshold: z.number().int().positive().nullable().optional(),
  batches: z.array(z.object({
    id: z.string().optional(),
    price: z.number().min(0).optional(),
    roastDate: z.string().max(50).optional(),
    weight: z.number().min(0).optional(),
    currentWeight: z.number().min(0).optional(),
    purchaseDate: z.string().max(50).optional(),
    notes: z.string().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  })).optional(),
});

export const recipeSchema = z.object({
  name: z.string().min(1).max(200),
  grinderId: z.string().max(20).optional(),
  brewerId: z.string().max(20).optional(),
  ratio: z.string().max(20).optional(),
  dose: z.number().min(0).optional(),
  photo: z.string().nullable().optional(),
  process: z.string().max(100).optional(),
  processSteps: z.array(z.object({
    description: z.string().max(500),
    waterAmount: z.number().min(0),
    duration: z.number().min(0),
  })).optional(),
  grindSize: z.number().min(0).optional(),
  water: z.number().min(0).optional(),
  yield: z.number().min(0).optional(),
  temperature: z.number().min(0).max(100).optional(),
  brewTime: z.string().max(20).optional(),
  favorite: z.boolean().optional(),
});

export const brewSchema = z.object({
  coffeeBeanId: z.string().optional().nullable(),
  batchId: z.string().optional().nullable(),
  grinderId: z.string().optional().nullable(),
  brewerId: z.string().optional().nullable(),
  recipeId: z.string().optional().nullable(),
  coffeeServerId: z.string().optional().nullable(),
  dose: z.number().optional().nullable(),
  grindSize: z.number().optional().nullable(),
  water: z.number().optional().nullable(),
  yield: z.number().optional().nullable(),
  temperature: z.number().optional().nullable(),
  brewTime: z.string().optional().nullable(),
  tds: z.number().optional().nullable(),
  extractionYield: z.number().optional().nullable(),
  rating: z.number().optional().nullable(),
  comment: z.string().optional().nullable(),
  photo: z.string().optional().nullable(),
  favorite: z.boolean().optional(),
  templateNotes: z.any().optional().nullable(),
});

export const brewTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  fields: z.array(z.object({
    id: z.string(),
    label: z.string().max(100),
    type: z.enum(['text', 'number', 'rating', 'select']),
    required: z.boolean(),
    options: z.array(z.string().max(100)).optional(),
  })),
});
