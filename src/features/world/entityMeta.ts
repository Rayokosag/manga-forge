import {
  Box,
  Building2,
  CalendarDays,
  Castle,
  Cpu,
  Flag,
  Globe2,
  Landmark,
  Map,
  MapPin,
  Shapes,
  Sparkles,
  Swords,
  Users,
  Wand2,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { WORLD_ENTITY_TYPES } from '@/db/schema';

type EntityType = (typeof WORLD_ENTITY_TYPES)[number];

export const ENTITY_ICON: Record<EntityType, LucideIcon> = {
  country: Flag,
  region: Map,
  city: Building2,
  district: MapPin,
  building: Castle,
  room: Box,
  faction: Swords,
  organization: Landmark,
  magic_system: Wand2,
  tech_system: Cpu,
  culture: Users,
  religion: Sparkles,
  species: Shapes,
  item: Zap,
  event: CalendarDays,
  schedule: CalendarDays,
  custom: Globe2,
};

export function entityTypeLabel(type: EntityType): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
