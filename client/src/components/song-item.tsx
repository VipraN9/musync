import { motion } from "framer-motion";
import { fadeInUp } from "@/utils/animations";

interface SongItemProps {
  song: {
    id: number;
    title: string;
    artist: string;
    album?: string;
    albumCover?: string;
    platforms: number[];
  };
  platforms: any[];
}

const SongItem = ({ song, platforms }: SongItemProps) => {
  return (
    <motion.div 
      variants={fadeInUp}
      className="px-6 py-4 flex items-center border-b border-darkCard hover:bg-darkCard transition-colors duration-200"
    >
      <div className="w-10 h-10 rounded overflow-hidden mr-4 flex-shrink-0 bg-darkCard">
        {song.albumCover && (
          <img src={song.albumCover} alt={`${song.title} album cover`} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-grow min-w-0">
        <h4 className="text-white font-medium truncate">{song.title}</h4>
        <p className="text-gray-300 text-sm truncate">{song.artist}</p>
      </div>
      <div className="flex items-center ml-4 flex-shrink-0">
        <div className="flex space-x-1 mr-4">
          {platforms.map(platform => {
            const isOnPlatform = song.platforms.includes(platform.id);
            
            let icon, color;
            switch (platform.type) {
              case 'spotify':
                icon = 'ri-spotify-fill';
                color = isOnPlatform ? 'text-green-500' : 'text-green-500 opacity-30';
                break;
              case 'apple_music':
                icon = 'ri-apple-fill';
                color = isOnPlatform ? 'text-white' : 'text-white opacity-30';
                break;
              case 'soundcloud':
                icon = 'ri-soundcloud-fill';
                color = isOnPlatform ? 'text-orange-500' : 'text-orange-500 opacity-30';
                break;
              default:
                icon = 'ri-music-fill';
                color = isOnPlatform ? 'text-primary' : 'text-primary opacity-30';
            }
            
            return (
              <i key={platform.id} className={`${icon} ${color}`}></i>
            );
          })}
        </div>
        <button className="text-gray-300 hover:text-white">
          <i className="ri-more-2-fill"></i>
        </button>
      </div>
    </motion.div>
  );
};

export default SongItem;
