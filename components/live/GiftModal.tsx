
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Gift, User } from '../../types';
import { YellowDiamondIcon, CheckIcon, ChevronDownIcon, SettingsIcon } from '../icons';
import { useTranslation } from '../../i18n';
import { GIFTS } from '../../constants';
import { api } from '../../services/api';

interface GiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onUpdateUser?: (user: User) => void;
    onSendGift: (gift: Gift, quantity: number, targetId?: string) => Promise<User | null> | void;
    onRecharge: () => void;
    gifts?: Gift[];
    isBroadcaster?: boolean;
    onOpenVIPCenter: () => void;
    streamId?: string;
    hostId?: string;
    onlineUsers?: User[];
    hostUser?: User;
    onOpenSettings?: (view?: string) => void;
}

const STORAGE_KEY_PREFIX = 'livego:giftOrder:';

const GiftModal: React.FC<GiftModalProps> = ({ 
    isOpen, 
    onClose, 
    currentUser,
    onSendGift, 
    onRecharge, 
    gifts = GIFTS, 
    isBroadcaster = false, 
    onOpenVIPCenter,
    hostUser,
    onOpenSettings,
    onlineUsers,
}) => {
    const { t } = useTranslation();
    const userDiamonds = currentUser.diamonds;
    const isVIP = !!currentUser.isVIP;

    const [isEditMode, setIsEditMode] = useState(false);
    const [giftsByTab, setGiftsByTab] = useState<Record<string, Gift[]>>({});
    const [targetUser, setTargetUser] = useState<User>(hostUser || currentUser);
    const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);
    const [receivedGifts, setReceivedGifts] = useState<(Gift & { count: number })[]>([]);
    const [galleryLoaded, setGalleryLoaded] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // FIX: Block-scoped variable 'activeTab' used before its declaration. Moved declaration up.
    const giftCategories = useMemo(() => {
        const categories: (Gift['category'] | 'Galeria' | 'Mochila' | 'Jogos')[] = ['Mochila', 'Popular', 'Luxo', 'Atividade', 'VIP', 'Efeito', 'Entrada', 'Jogos', 'Galeria'];
        return categories.filter(c => c !== 'VIP' || isVIP);
    }, [isVIP]);

    const [activeTab, setActiveTab] = useState<(Gift['category'] | 'Galeria' | 'Mochila')>(giftCategories[0]);
    const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
    const [quantity, setQuantity] = useState(1);
    const presetQuantities = [1, 10, 99, 188, 520, 1314];

    const dragItem = useRef<Gift | null>(null);
    const dragOverItem = useRef<Gift | null>(null);

    useEffect(() => {
        if (isOpen && hostUser) {
            setTargetUser(hostUser);
        }
    }, [isOpen, hostUser]);

    useEffect(() => {
        if (isOpen && activeTab === 'Galeria' && !galleryLoaded) {
            api.gifts.getGallery().then(gifts => {
                if (Array.isArray(gifts)) {
                    setReceivedGifts(gifts);
                    setGalleryLoaded(true);
                }
            });
        }
    }, [isOpen, activeTab, galleryLoaded]);

    useEffect(() => {
        if (!isOpen) {
            setGalleryLoaded(false);
            setReceivedGifts([]); // Clear data on close
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const groupedGifts = gifts.reduce((acc, gift) => {
            const category = gift.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(gift);
            return acc;
        }, {} as Record<string, Gift[]>);

        Object.keys(groupedGifts).forEach(category => {
            try {
                const savedOrderIdsJson = localStorage.getItem(`${STORAGE_KEY_PREFIX}${category}`);
                if (savedOrderIdsJson) {
                    const savedOrderIds = JSON.parse(savedOrderIdsJson);
                    if (Array.isArray(savedOrderIds)) {
                        const giftMap = new Map(groupedGifts[category].map(g => [g.id, g]));
                        const orderedGifts: Gift[] = [];
                        
                        savedOrderIds.forEach(id => {
                            if (giftMap.has(id)) {
                                orderedGifts.push(giftMap.get(id)!);
                                giftMap.delete(id);
                            }
                        });

                        giftMap.forEach(newGift => orderedGifts.push(newGift));
                        
                        groupedGifts[category] = orderedGifts;
                    }
                }
            } catch (e) {
                console.warn(`Failed to parse gift order for ${category}`, e);
            }
        });

        setGiftsByTab(groupedGifts);
    }, [gifts, isOpen]);

    useEffect(() => {
        if (isEditMode) {
            setSelectedGift(null);
        }
    }, [isEditMode]);

    useEffect(() => {
        setIsEditMode(false);
    }, [activeTab]);
    
    const backpackGifts = useMemo((): Gift[] => {
        if (!currentUser.ownedGifts) return [];
        return currentUser.ownedGifts.map(owned => {
            const giftDetails = gifts.find(g => g.id === owned.giftId);
            if (!giftDetails) return null;
            return {
                ...giftDetails,
                isFromBackpack: true,
                ownedQuantity: owned.quantity
            };
        }).filter(Boolean) as Gift[];
    }, [currentUser.ownedGifts, gifts]);

    const filteredGifts = useMemo(() => {
        if (activeTab === 'Galeria' || activeTab === 'Mochila') return [];
        return giftsByTab[activeTab as string] || [];
    }, [activeTab, giftsByTab]);
    
    const maxCanSend = useMemo(() => {
        if (!selectedGift) return 0;
        if (selectedGift.isFromBackpack) {
            return selectedGift.ownedQuantity || 0;
        }
        if (!selectedGift.price || selectedGift.price === 0) return 9999;
        return Math.floor(userDiamonds / selectedGift.price);
    }, [selectedGift, userDiamonds]);

    const handleSend = async () => {
        if (isEditMode || !selectedGift || isSending) return;
        setIsSending(true);
        let sentSuccessfully = false;
        
        if (selectedGift.isFromBackpack) {
            if (quantity > 0 && quantity <= (selectedGift.ownedQuantity || 0)) {
                const updatedUser = await onSendGift(selectedGift, quantity, targetUser.id);
                if (updatedUser) sentSuccessfully = true;
            }
        } else {
            if (quantity > 0 && quantity * (selectedGift.price || 0) <= userDiamonds) {
                const updatedUser = await onSendGift(selectedGift, quantity, targetUser.id);
                if (updatedUser) sentSuccessfully = true;
            } else {
                onRecharge();
            }
        }
    
        setIsSending(false);
        if (sentSuccessfully) {
            setSelectedGift(null);
            setQuantity(1);
            onClose();
        }
    };

    const handleSelectGift = (gift: Gift) => {
        setSelectedGift(gift);
        setQuantity(1);
    };

    const canReorderCurrentTab = useMemo(() => {
        return ['Popular', 'Luxo', 'Atividade', 'VIP', 'Efeito'].includes(activeTab);
    }, [activeTab]);
    
    const handleDragStart = (gift: Gift) => {
        dragItem.current = gift;
    };
    
    const handleDragEnter = (gift: Gift) => {
        dragOverItem.current = gift;
    };
    
    const handleDrop = () => {
        if (!dragItem.current || !dragOverItem.current || !giftsByTab[activeTab as string]) return;
    
        const currentGifts = [...giftsByTab[activeTab as string]];
        const dragItemIndex = currentGifts.findIndex(g => g.id === dragItem.current!.id);
        const dragOverItemIndex = currentGifts.findIndex(g => g.id === dragOverItem.current!.id);
    
        if (dragItemIndex === -1 || dragOverItemIndex === -1 || dragItemIndex === dragOverItemIndex) {
            return;
        }
    
        const newGifts = [...currentGifts];
        const [draggedItem] = newGifts.splice(dragItemIndex, 1);
        newGifts.splice(dragOverItemIndex, 0, draggedItem);
    
        setGiftsByTab(prev => ({
            ...prev,
            [activeTab as string]: newGifts
        }));

        try {
            const newOrderIds = newGifts.map(g => g.id);
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${activeTab}`, JSON.stringify(newOrderIds));
        } catch (e) {
            console.error('Failed to save gift order to localStorage', e);
        }

        dragItem.current = null;
        dragOverItem.current = null;
    };
    
    const handleRestoreDefault = () => {
        try {
            localStorage.removeItem(`${STORAGE_KEY_PREFIX}${activeTab}`);
            const defaultGiftsForTab = GIFTS.filter(g => g.category === activeTab);
            setGiftsByTab(prev => ({
                ...prev,
                [activeTab as string]: defaultGiftsForTab
            }));
        } catch (e) {
            console.error('Failed to restore default gift order', e);
        }
    };

    const selectableUsers = useMemo(() => {
        const usersMap = new Map<string, User>();
        
        // Adiciona o anfitrião primeiro
        if (hostUser) {
            usersMap.set(hostUser.id, hostUser);
        }

        // Adiciona todos os outros usuários online, exceto o usuário atual
        (onlineUsers || []).forEach(user => {
            if (user.id !== currentUser.id && !usersMap.has(user.id)) {
                usersMap.set(user.id, user);
            }
        });

        return Array.from(usersMap.values());
    }, [hostUser, onlineUsers, currentUser.id]);

    return (
        <div 
            className={`absolute inset-0 z-30 flex items-end ${isOpen ? '' : 'pointer-events-none'}`} 
            onClick={onClose}
        >
            <div 
                className={`bg-[#1C1C1E] w-full max-w-md h-[65%] rounded-t-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`} 
                onClick={e => e.stopPropagation()}
            >
                <header className="flex-shrink-0 p-3">
                    <div className="flex justify-between items-center mb-2 relative text-center h-9">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            {canReorderCurrentTab && (
                                <button 
                                    onClick={() => setIsEditMode(!isEditMode)} 
                                    className="text-sm font-semibold text-purple-400 px-3 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20"
                                >
                                    {isEditMode ? t('gifts.done') : t('gifts.reorder')}
                                </button>
                            )}
                            {isEditMode && (
                                <button 
                                    onClick={handleRestoreDefault}
                                    className="text-sm font-semibold text-gray-500 hover:text-white"
                                >
                                    Restaurar
                                </button>
                            )}
                             {!isEditMode && onOpenSettings && (
                                <button 
                                    onClick={() => {
                                        onClose();
                                        onOpenSettings('NotifPresentes');
                                    }} 
                                    className="p-1.5 rounded-full text-gray-400 hover:bg-white/10 hover:text-white"
                                ><SettingsIcon className="w-4 h-4" /></button>
                            )}
                        </div>
                        <h2 className="text-base font-bold text-white mx-auto">{t('gifts.title')}</h2>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2">
                            <div className="flex items-center space-x-2 bg-[#2C2C2E] p-1.5 rounded-full">
                                <YellowDiamondIcon className="w-5 h-5 text-yellow-400" />
                                <span className="text-white font-semibold text-sm">{userDiamonds.toLocaleString('pt-BR')}</span>
                                <button onClick={onRecharge} className="text-xs text-yellow-400 font-bold bg-yellow-400/20 px-2 py-0.5 rounded-full hover:bg-yellow-400/30">{t('gifts.recharge')}</button>
                            </div>
                        </div>
                    </div>

                    <div className="px-1 py-1 relative">
                        <div className="bg-black/20 p-1.5 rounded-full flex items-center text-xs">
                            <span className="text-gray-400 px-2 font-bold">Para:</span>
                            <div className="relative flex-1">
                                <button onClick={() => setIsUserSelectorOpen(!isUserSelectorOpen)} className="bg-white/10 rounded-full w-full p-1.5 flex items-center justify-between text-left">
                                    <div className="flex items-center gap-2">
                                        <img src={targetUser.avatarUrl} className="w-5 h-5 rounded-full" alt={targetUser.name} />
                                        <span className="text-white font-bold text-xs">{targetUser.name}</span>
                                    </div>
                                    <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isUserSelectorOpen ? 'rotate-180' : ''}`}/>
                                </button>
                                {isUserSelectorOpen && (
                                    <div className="absolute bottom-full mb-1 w-full bg-[#2C2C2E] rounded-lg max-h-48 overflow-y-auto border border-white/10 z-10 shadow-lg">
                                    {selectableUsers.map(user => (
                                        <div key={user.id} onClick={() => { setTargetUser(user); setIsUserSelectorOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer">
                                        <img src={user.avatarUrl} className="w-8 h-8 rounded-full" alt={user.name} />
                                        <span className="text-white text-sm font-semibold">{user.name}</span>
                                        {user.id === targetUser.id && <CheckIcon className="w-4 h-4 text-purple-400 ml-auto" />}
                                        </div>
                                    ))}
                                    