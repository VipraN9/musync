import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { fadeIn, fadeInUp, staggerContainer } from "@/utils/animations";
import ServiceCard from "@/components/service-card";
import { useAuth } from "@/store/auth-store";
import { useMusic } from "@/store/music-store";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const ConnectServices = () => {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { setPlatforms } = useMusic();
  const { toast } = useToast();
  const [connectedCount, setConnectedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [platforms, setPlatformsState] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }

    // Fetch platforms
    const fetchPlatforms = async () => {
      try {
        const response = await apiRequest("GET", "/api/platforms", undefined);
        const data = await response.json();
        setPlatformsState(data.platforms);
        setPlatforms(data.platforms);
        setConnectedCount(data.platforms.filter((p: any) => p.isConnected).length);
        setIsLoading(false);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load platforms",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    fetchPlatforms();
  }, [isAuthenticated, setLocation, setPlatforms, toast]);

  const handleConnect = async (platformType: string) => {
    setIsLoading(true);
    try {
      const response = await apiRequest(
        "GET",
        `/api/platforms/${platformType}/connect`,
        undefined
      );
      
      const data = await response.json();
      
      // Open popup for OAuth
      const popup = window.open(
        data.authUrl,
        'Connect Platform',
        'width=600,height=700'
      );

      // Listen for the callback message
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'PLATFORM_CONNECTED') {
          window.removeEventListener('message', handleMessage);
          
          // Update UI state
          setPlatformsState(prevPlatforms => {
            return prevPlatforms.map(p => {
              if (p.type === platformType) {
                return { ...p, isConnected: true };
              }
              return p;
            });
          });
          
          setConnectedCount(prevCount => prevCount + 1);
          
          // Update global state
          queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
          
          toast({
            title: "Connected!",
            description: `Successfully connected to ${platformType}`,
          });
        }
      };
      
      window.addEventListener('message', handleMessage);
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : `Failed to connect to ${platformType}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const continueToDashboard = () => {
    setLocation("/dashboard");
  };

  if (isLoading && platforms.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkBg text-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-darkBg text-white">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto"
      >
        <motion.div
          variants={fadeInUp} 
          className="text-center mb-12"
        >
          <h1 className="font-heading font-bold text-3xl mb-3">Connect Your Music Services</h1>
          <p className="text-gray-300 max-w-xl mx-auto">
            Link your accounts to start syncing your music libraries across platforms.
          </p>
        </motion.div>
        
        <motion.div 
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {platforms.map((platform, index) => (
            <ServiceCard
              key={platform.id}
              type={platform.type}
              isConnected={platform.isConnected}
              onConnect={() => handleConnect(platform.type)}
            />
          ))}
        </motion.div>
        
        <motion.div 
          variants={fadeInUp}
          className="mt-12 text-center"
        >
          <p className="text-gray-300 mb-4">Connect at least two services to start syncing</p>
          <button
            onClick={continueToDashboard}
            className={`
              bg-primary text-white font-accent rounded-full px-8 py-3 
              transition-all duration-300 transform hover:scale-105 
              ${connectedCount < 2 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-90'}
            `}
            disabled={connectedCount < 2}
          >
            Continue to Library
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ConnectServices;
