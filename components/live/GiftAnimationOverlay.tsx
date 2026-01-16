import React, { useEffect, useState } from 'react';
import type { GiftSendPayload } from '../../types';

interface Props {
    giftPayload: GiftSendPayload;
    onAnimationEnd: () => void;
}

const GiftAnimationOverlay: React.FC<Props> = ({ giftPayload, onAnimationEnd }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Start animation shortly after component mounts
        const entryTimer = setTimeout(() => setIsVisible(true), 50);

        // Timer to start fade out
        const exitTimer = setTimeout(() => {
            setIsVisible(false);
        }, 2500); 

        // Timer to call onAnimationEnd after fade out completes
        const endTimer = setTimeout(() => {
            onAnimationEnd();
        }, 3000);

        return () => {
            clearTimeout(entryTimer);
            clearTimeout(exitTimer);
            clearTimeout(endTimer);
        };
    }, [giftPayload, onAnimationEnd]);

    return (
        <div 
            className={`flex flex-col items-center gap-3 transition-all duration-500 ease-in-out ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
            {/* Gift Icon */}
            <div className="text-8xl drop-shadow-lg">
                {giftPayload.gift.component ? giftPayload.gift.component : giftPayload.gift.icon}
            </div>
            
            {/* Gift Name and Quantity */}
            <div className="bg-black/70 backdrop-blur-sm rounded-full px-6 py-2 border border-yellow-500/30 shadow-lg">
                <span className="text-yellow-400 font-black text-xl uppercase tracking-wider">
                    {giftPayload.gift.name} X{giftPayload.quantity}
                </span>
            </div>
            
            {/* Sender Name */}
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5 mt-1 shadow-md">
                <span className="text-white text-xs font-medium">Enviado por {giftPayload.fromUser.name}</span>
            </div>
        </div>
    );
};

export default GiftAnimationOverlay;
