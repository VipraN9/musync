import { motion } from "framer-motion";
import { fadeInUp } from "@/utils/animations";

interface ServiceCardProps {
  type: string;
  isConnected: boolean;
  onConnect: () => void;
}

const ServiceCard = ({ type, isConnected, onConnect }: ServiceCardProps) => {
  const getConfig = () => {
    switch (type) {
      case 'spotify':
        return {
          name: 'Spotify',
          icon: 'ri-spotify-fill',
          bgColor: 'from-[#1ED760] to-[#1DB954]',
          buttonClass: 'bg-secondary hover:bg-opacity-90 text-white',
          iconColor: 'text-white'
        };
      case 'apple_music':
        return {
          name: 'Apple Music',
          icon: 'ri-apple-fill',
          bgColor: 'from-[#FA586A] to-[#F93C4D]',
          buttonClass: 'bg-white hover:bg-gray-100 text-black',
          iconColor: 'text-white'
        };
      case 'soundcloud':
        return {
          name: 'SoundCloud',
          icon: 'ri-soundcloud-fill',
          bgColor: 'from-[#FF7700] to-[#FF3300]',
          buttonClass: 'bg-accent hover:bg-opacity-90 text-white',
          iconColor: 'text-white'
        };
      default:
        return {
          name: type.charAt(0).toUpperCase() + type.slice(1),
          icon: 'ri-music-fill',
          bgColor: 'from-gray-600 to-gray-700',
          buttonClass: 'bg-primary hover:bg-opacity-90 text-white',
          iconColor: 'text-white'
        };
    }
  };

  const config = getConfig();

  return (
    <motion.div 
      variants={fadeInUp}
      className="bg-darkElevated rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]"
      style={{ 
        boxShadow: isConnected ? 
          type === 'spotify' ? '0 4px 20px rgba(30, 215, 96, 0.2)' :
          type === 'apple_music' ? '0 4px 20px rgba(255, 255, 255, 0.2)' :
          '0 4px 20px rgba(255, 119, 0, 0.2)' : 
          'none'
      }}
    >
      <div className={`h-32 bg-gradient-to-r ${config.bgColor} flex items-center justify-center p-4`}>
        <i className={`${config.icon} text-7xl ${config.iconColor}`}></i>
      </div>
      <div className="p-6">
        <h3 className="font-heading font-semibold text-xl mb-2">{config.name}</h3>
        <p className="text-gray-300 text-sm mb-4">
          Connect to sync your {config.name} {type === 'spotify' ? 'playlists' : type === 'apple_music' ? 'library' : 'likes'} and liked songs.
        </p>
        <button 
          onClick={onConnect}
          disabled={isConnected}
          className={`w-full ${isConnected ? 'bg-gray-600 cursor-not-allowed' : config.buttonClass} font-accent rounded-lg px-4 py-2 transition-all duration-300`}
        >
          {isConnected ? 'Connected' : 'Connect'}
        </button>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
