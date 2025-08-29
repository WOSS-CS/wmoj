import { useState } from "react";

interface SpinningDuckProps {
  size?: "sm" | "md" | "lg";
  speed?: "slow" | "normal" | "fast";
  className?: string;
}

export function SpinningDuck({ size = "md", speed = "normal", className = "" }: SpinningDuckProps) {
  const [isSpinning, setIsSpinning] = useState(true);

  const sizeClasses = {
    sm: "w-6 h-6 text-xl",
    md: "w-8 h-8 text-2xl",
    lg: "w-12 h-12 text-4xl"
  };

  const speedDurations = {
    slow: "4s",
    normal: "2s",
    fast: "1s"
  };

  const handleClick = () => {
    setIsSpinning(!isSpinning);
  };

  return (
    <div
      className={`
        flex items-center justify-center cursor-pointer select-none
        transition-all duration-200 hover:scale-110
        ${sizeClasses[size]}
        ${className}
      `}
      onClick={handleClick}
      title={isSpinning ? "Click to stop spinning!" : "Click to start spinning!"}
      style={{
        animation: isSpinning ? `spin ${speedDurations[speed]} linear infinite` : "none"
      }}
    >
      🦆
    </div>
  );
}
