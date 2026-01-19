import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * 离线横幅组件
 *
 * 当网络离线时显示
 */
const OfflineBanner = () => {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-600 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">
        您当前处于离线状态，某些功能可能无法使用
      </span>
      <button
        onClick={() => window.location.reload()}
        className="ml-4 px-3 py-1 bg-white text-orange-600 rounded-full text-xs font-medium hover:bg-orange-50 transition-colors flex items-center gap-1"
      >
        <RefreshCw className="w-3 h-3" />
        重新连接
      </button>
    </div>
  );
};

export default OfflineBanner;