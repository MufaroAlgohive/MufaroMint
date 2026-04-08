import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import AnimatedLabelInput from './AnimatedLabelInput.jsx';

const PasswordInput = ({ className = '', label, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative flex items-center flex-1">
      <AnimatedLabelInput
        type={showPassword ? 'text' : 'password'}
        label={label}
        className={`pr-10 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute right-3 flex items-center justify-center h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-white transition"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

export default PasswordInput;
