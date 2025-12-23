import React from 'react';

const IFlowLogo = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M512 64L128 256L512 448L896 256L512 64Z"
        fill="currentColor"
        className="text-blue-600 dark:text-blue-400"
      />
      <path
        d="M128 448L512 640L896 448L512 256L128 448Z"
        fill="currentColor"
        fillOpacity="0.8"
        className="text-blue-500 dark:text-blue-500"
      />
      <path
        d="M128 640L512 832L896 640L512 448L128 640Z"
        fill="currentColor"
        fillOpacity="0.6"
        className="text-blue-400 dark:text-blue-600"
      />
    </svg>
  );
};

export default IFlowLogo;