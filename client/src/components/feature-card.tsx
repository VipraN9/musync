import { motion } from "framer-motion";
import { fadeInUp } from "@/utils/animations";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  color: "primary" | "secondary" | "accent";
}

const FeatureCard = ({ icon, title, description, color }: FeatureCardProps) => {
  const colorClass = 
    color === "primary" ? "text-primary bg-primary/20" : 
    color === "secondary" ? "text-secondary bg-secondary/20" : 
    "text-accent bg-accent/20";

  return (
    <motion.div 
      variants={fadeInUp}
      className="bg-darkElevated p-6 rounded-xl transition-all duration-300 hover:bg-darkCard hover:shadow-xl hover:shadow-primary/10 flex flex-col items-center text-center"
    >
      <div className={`w-16 h-16 ${colorClass} rounded-full flex items-center justify-center mb-4`}>
        <i className={`${icon} text-2xl`}></i>
      </div>
      <h3 className="font-heading font-semibold text-xl mb-2">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </motion.div>
  );
};

export default FeatureCard;
