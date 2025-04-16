import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { fadeIn, fadeInUp, staggerContainer } from "@/utils/animations";
import FeatureCard from "@/components/feature-card";
import AlbumGrid from "@/components/album-grid";

const Welcome = () => {
  const [, setLocation] = useLocation();

  const navigateToSignup = () => {
    setLocation("/signup");
  };

  const navigateToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-darkBg text-white font-body">
      <section className="min-h-screen flex flex-col items-center justify-center p-4 lg:p-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center"
        >
          {/* Left side (hero content) */}
          <motion.div 
            variants={fadeInUp}
            className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left z-10 p-6"
          >
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: [-10, 0, -10] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl mb-2 gradient-text-musync">
                Musync
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 font-light">One Library. All Platforms.</p>
            </motion.div>
            
            <motion.p 
              variants={fadeInUp}
              className="mt-6 mb-8 text-lg text-gray-300 max-w-md"
            >
              Synchronize your music library across all streaming platforms automatically. Never lose your favorite tracks again.
            </motion.p>
            
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <button 
                onClick={navigateToSignup}
                className="bg-primary hover:bg-opacity-90 text-white font-accent rounded-full px-8 py-3 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-primary/30"
              >
                Get Started
              </button>
              <button 
                onClick={navigateToFeatures}
                className="border border-primary text-primary hover:bg-primary/10 font-accent rounded-full px-8 py-3 transition-all duration-300"
              >
                Learn More
              </button>
            </motion.div>
            
            <motion.div 
              variants={fadeInUp}
              className="mt-8 flex items-center justify-center md:justify-start"
            >
              <p className="text-gray-400 mr-4">Works with:</p>
              <div className="flex space-x-4">
                <i className="ri-spotify-fill text-2xl text-green-500"></i>
                <i className="ri-apple-fill text-2xl text-white"></i>
                <i className="ri-soundcloud-fill text-2xl text-orange-500"></i>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Right side (visual) */}
          <motion.div 
            variants={fadeIn}
            className="w-full md:w-1/2 mt-12 md:mt-0 relative"
          >
            <AlbumGrid />
          </motion.div>
        </motion.div>
        
        {/* Features preview */}
        <div id="features" className="w-full max-w-6xl mx-auto mt-24 px-4">
          <motion.h2 
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, amount: 0.3 }}
            className="text-2xl md:text-3xl font-heading font-bold text-center mb-12"
          >
            How Musync Works
          </motion.h2>
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, amount: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <FeatureCard 
              icon="ri-link-m" 
              title="Connect Platforms" 
              description="Link your accounts from Spotify, Apple Music, SoundCloud and more."
              color="primary"
            />
            
            <FeatureCard 
              icon="ri-compare-line" 
              title="Compare Libraries" 
              description="We find which songs are missing from each platform's library."
              color="secondary"
            />
            
            <FeatureCard 
              icon="ri-refresh-line" 
              title="Sync Everything" 
              description="With one click, your music is perfectly synchronized across platforms."
              color="accent"
            />
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Welcome;
