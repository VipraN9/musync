import { Badge } from '@/components/ui/badge';
import { SiSpotify, SiApplemusic, SiSoundcloud } from 'react-icons/si';

interface PlatformBadgeProps {
  type: string;
}

export default function PlatformBadge({ type }: PlatformBadgeProps) {
  let icon;
  let label;
  let variant: 'default' | 'outline' | 'secondary' = 'outline';
  let className = '';
  
  switch (type) {
    case 'spotify':
      icon = <SiSpotify className="h-3 w-3 mr-1" />;
      label = 'Spotify';
      className = 'bg-green-500 hover:bg-green-600 text-white';
      variant = 'default';
      break;
    case 'apple_music':
      icon = <SiApplemusic className="h-3 w-3 mr-1" />;
      label = 'Apple';
      className = 'bg-pink-500 hover:bg-pink-600 text-white';
      variant = 'default';
      break;
    case 'soundcloud':
      icon = <SiSoundcloud className="h-3 w-3 mr-1" />;
      label = 'SoundCloud';
      className = 'bg-orange-500 hover:bg-orange-600 text-white';
      variant = 'default';
      break;
    default:
      icon = null;
      label = type;
      break;
  }
  
  return (
    <Badge variant={variant} className={className}>
      <div className="flex items-center">
        {icon}
        {label}
      </div>
    </Badge>
  );
}