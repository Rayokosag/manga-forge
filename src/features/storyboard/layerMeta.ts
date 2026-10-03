import {
  Image,
  Layers,
  MessageCircle,
  Mountain,
  Sparkle,
  User,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { PANEL_LAYER_TYPES } from '@/db/schema';

type LayerType = (typeof PANEL_LAYER_TYPES)[number];

export const LAYER_META: Record<
  LayerType,
  { label: string; icon: LucideIcon; defaultContent: string }
> = {
  background: { label: 'Background', icon: Mountain, defaultContent: 'Background' },
  character: { label: 'Character', icon: User, defaultContent: 'Character' },
  foreground: { label: 'Foreground', icon: Image, defaultContent: 'Foreground' },
  dialogue: { label: 'Dialogue', icon: MessageCircle, defaultContent: 'Dialogue…' },
  narration: { label: 'Narration', icon: Layers, defaultContent: 'Narration…' },
  sfx: { label: 'SFX', icon: Zap, defaultContent: 'DOOM' },
  overlay: { label: 'Overlay', icon: Sparkle, defaultContent: 'Overlay' },
};

export const LAYER_TYPE_ORDER: LayerType[] = [...PANEL_LAYER_TYPES];
