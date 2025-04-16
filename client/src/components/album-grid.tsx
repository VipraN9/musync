import { motion } from "framer-motion";

const AlbumGrid = () => {
  const albums = [
    {
      id: 1,
      rotation: 12,
      position: { top: 0, right: 5 },
      bgColor: "#2A2A2A"
    },
    {
      id: 2,
      rotation: -6,
      position: { top: 10, left: 5 },
      bgColor: "#2A2A2A"
    },
    {
      id: 3,
      rotation: 3,
      position: { bottom: 0, left: 10 },
      bgColor: "#2A2A2A"
    }
  ];

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full filter blur-3xl opacity-30"></div>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0.5 }}
        animate={{ 
          scale: [0.9, 1.02, 0.9],
          opacity: [0.5, 0.7, 0.5]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-full h-full flex items-center justify-center"
      >
        {albums.map((album) => (
          <motion.div
            key={album.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: album.id * 0.2 }}
            className="absolute w-40 h-40 bg-darkCard rounded-lg shadow-xl overflow-hidden"
            style={{
              transform: `rotate(${album.rotation}deg)`,
              top: album.position.top,
              right: album.position.right,
              bottom: album.position.bottom,
              left: album.position.left,
              backgroundColor: album.bgColor
            }}
          >
            {/* We'll use a placeholder div since we can't use actual images */}
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              <i className="ri-music-2-line text-4xl text-gray-400"></i>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default AlbumGrid;
