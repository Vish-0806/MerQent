import { z } from 'zod';
import {
  UserRole,
  PrimaryRoleType,
  AvailabilityStatus,
  ProjectStatus,
  FirmAumTier,
} from '@merqent/shared-types';

export const RegisterUserSchema = z.object({
  email: z.string().email('Invalid business email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  fullName: z.string().min(2, 'Full name is required'),
  role: z.enum([UserRole.PE_FIRM_ADMIN, UserRole.CONSULTANT_OPERATOR]),
});

export const LoginUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const CreateProjectSchema = z.object({
  title: z.string().min(5, 'Project title must be at least 5 characters'),
  confidentialNameMasked: z.string().min(3, 'Confidential mask name required'),
  description: z.string().min(20, 'Detailed project description required'),
  industryTermId: z.string().uuid(),
  dealTypeTermId: z.string().uuid(),
  targetStartDate: z.string().datetime(),
  estimatedDurationMonths: z.number().int().min(1).max(36),
  requiredTravelPercent: z.number().int().min(0).max(100),
  geographyCountry: z.string().min(2),
});

export const UpdateConsultantProfileSchema = z.object({
  headline: z.string().min(5).max(120),
  bio: z.string().min(50).max(5000),
  primaryRoleType: z.nativeEnum(PrimaryRoleType),
  yearsPmiExperience: z.number().int().min(1).max(50),
  availabilityStatus: z.nativeEnum(AvailabilityStatus),
  availableHoursPerWeek: z.number().int().min(1).max(80),
  geographyCountry: z.string().min(2),
  willingToTravelPercent: z.number().int().min(0).max(100),
});
