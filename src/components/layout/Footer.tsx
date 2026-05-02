
import { Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-slate-400 flex items-center justify-center space-x-2">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span>for researchers everywhere</span>
          </p>
          <p className="text-slate-500 mt-2 text-sm">
            © 2024 ResearchMind. Empowering academic research through 锦木千束.
          </p>
        </div>
      </div>
    </footer>
  );
};

