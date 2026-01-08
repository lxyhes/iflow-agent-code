/**
 * FocusModeToggle.jsx - Zen Mode Toggle Button
 * 
 * A floating button that toggles "Focus Mode" (Zen Mode)
 * which hides sidebar and distractions for maximum focus.
 */

import React from 'react';
import { Focus, Maximize2, Minimize2 } from 'lucide-react';

const FocusModeToggle = ({ isFocusMode, onToggle }) => {
    return (
        <>
            {/* Focus Mode Toggle Button */}
            <button
                onClick={onToggle}
                className="focus-mode-toggle group"
                aria-label={isFocusMode ? "Exit focus mode" : "Enter focus mode"}
                title={isFocusMode ? "Exit Zen Mode (Esc)" : "Enter Zen Mode"}
            >
                {isFocusMode ? (
                    <Minimize2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                ) : (
                    <Focus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                )}
            </button>

            {/* Exit Hint (shown when in focus mode) */}
            {isFocusMode && (
                <div className="focus-exit-hint">
                    Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs mx-1">Esc</kbd> or click button to exit
                </div>
            )}
        </>
    );
};

export default FocusModeToggle;
