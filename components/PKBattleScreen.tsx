import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import OnlineUsersModal from './live/OnlineUsersModal';
import ChatMessage from './live/ChatMessage';
import CoHostModal from './CoHostModal';
import EntryChatMessage from './live/EntryChatMessage';
import ToolsModal from './ToolsModal';
import { GiftIcon, SendIcon, MoreIcon, CloseIcon, ViewerIcon, BellIcon, LockIcon } from './icons';
import { Streamer, User, Gift, RankedUser, LiveSessionState, ToastType, GiftSendPayload } from '../types';
import ContributionRankingModal from './ContributionRankingModal';
import BeautyEffectsPanel from './live/BeautyEffectsPanel';
import ResolutionPanel from './live/ResolutionPanel';
import GiftModal from './live/GiftModal';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import { webSocketManager } from '../services/websocket';
import GiftAnimationOverlay from './live/GiftAnimationOverlay';
import PrivateInviteModal from './live/PrivateInviteModal';
import SupportersBar from './live/SupportersBar';
import { GIFTS } from '../constants';

interface ChatMessageType {
    id: number;
    type: 'chat' | 'entry' | 'follow' | 'private_invite';
    user?: string;
    level?: number;
    message?: string | React.ReactNode;
    avatar?: string;
    fullUser?: User;
    inviteData?: {
        fromName: string;
        toName: string;
        streamId: string;
    };
}

interface PKBattleScreenProps {
    streamer: Streamer;
    opponent: User;
    onEndPKBattle: () => void;
    onRequestEndStream: () => void;
    onLeaveStreamView: () => void;
    onViewProfile: (user: User) => void;
    currentUser: User;
    onOpenWallet: (initialTab?: 'Diamante' | 'Ganhos') => void;
    onFollowUser: (user: User, streamId?: string) => void;
    onOpenPrivateChat: () => void;
    onOpenPrivateInviteModal: () => void;
    setActiveScreen: (screen: 'main' | 'profile' | 'messages' | 'video') => void;
    onOpenPKTimerSettings: () => void;
    onOpenFans: () => void;
    onOpenFriendRequests: () => void;
    liveSession: LiveSessionState | null;
    updateLiveSession: (updates: Partial<LiveSessionState>) => void;
    logLiveEvent: (type: string, data: any) => void;
    updateUser: (user: User) => void;
    onStreamUpdate: (updates: Partial<Streamer>) => void;
    addToast: (type: ToastType, message: string) => void;
    rankingData?: Record<string, RankedUser[]>;
    followingUsers?: User[];
    pkBattleDuration: number;
    streamers: Streamer[];
    onSelectStream: (streamer: Streamer) => void;
    onOpenVIPCenter: () => void;
    onOpenFanClubMembers: (streamer: User) => void;
    allUsers?: User[];
    onOpenSettings?: (view?: string) => void;
}

export const PKBattleScreen: React.FC<PKBattleScreenProps> = ({ 
    streamer, opponent, onEndPKBattle, onRequestEndStream, onLeaveStreamView, onViewProfile, currentUser,
    onOpenWallet, onFollowUser, onOpenPrivateChat, onOpenPrivateInviteModal,
    onOpenPKTimerSettings, onOpenFans, onOpenFriendRequests, liveSession,
    updateLiveSession, logLiveEvent, updateUser, onStreamUpdate, addToast,
    followingUsers = [], pkBattleDuration, onOpenVIPCenter, streamers, onSelectStream, onOpenFanClubMembers, allUsers,
    onOpenSettings
}) => {
    const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState(pkBattleDuration * 60);
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
    const [isOnlineUsersOpen, setIsOnlineUsersOpen] = useState(false);
    const [isPrivateInviteModalOpen, setIsPrivateInviteModalOpen] = useState(false);
    const [isRankingOpen, setIsRankingOpen] = useState(false);
    const [isCoHostModalOpen, setIsCoHostModalOpen] = useState(false);
    const [isResolutionPanelOpen, setIsResolutionPanelOpen] = useState(false);
    const [isBeautyPanelOpen, setIsBeautyPanelOpen] = useState(false);
    
    const [onlineUsers, setOnlineUsers] = useState<(User & { value: number })[]>([]);
    const [currentEffect, setCurrentEffect] = useState<GiftSendPayload | null>(null);
    const previousOnlineUsersRef = useRef<(User & { value: number })[]>([]);

    const isBroadcaster = streamer.hostId === currentUser.id;

    const streamerUser: User = useMemo(() => ({
        id: streamer.hostId,
        identification: streamer.hostId,
        name: streamer.name,
        avatarUrl: streamer.avatar,
        coverUrl: `https://picsum.photos/seed/${streamer.id}/800/1600`,
        country: streamer.country,
        age: 23,
        gender: 'female',
        level: 1,
        xp: 0,
        location: streamer.location,
        distance: 'desconhecida',
        fans: 3,
        following: 0,
        receptores: 0,
        enviados: 0,
        topFansAvatars: [],
        isLive: true,
        diamonds: 50000,
        earnings: 125000,
        earnings_withdrawn: 0,
        bio: 'Amante de streams!',
        obras: [],
        curtidas: [],
        ownedFrames: [],
        activeFrameId: null,
        frameExpiration: null,
    }), [streamer]);

    const updateUsersList = useCallback((newUsers: (User & { value: number })[]) => {
        setOnlineUsers(newUsers);
        const previousUsers = previousOnlineUsersRef.current;
        if (previousUsers.length > 0) {
            const previousUserIds = new Set(previousUsers.map(u => u.id));
            const newlyJoinedUsers = newUsers.filter(u => !previousUserIds.has(u.id) && u.id !== currentUser.id);

            if (newlyJoinedUsers.length > 0) {
                const entryMessages: ChatMessageType[] = newlyJoinedUsers.map(user => ({
                    id: Date.now() + Math.random(),
                    type: 'entry',
                    fullUser: user,
                    user: user.name,
                    avatar: user.avatarUrl,
                }));
                setMessages(prev => [...prev, ...entryMessages]);
            }
        }
        previousOnlineUsersRef.current = newUsers;
    }, [currentUser.id]);

    const refreshOnlineUsers = useCallback(async () => {
        if (!streamer.id) return;
        try {
            const freshUsers = await api.users.getOnlineUsers(streamer.id);
            const users = Array.isArray(freshUsers) ? freshUsers : [];
            const mappedUsers = users.map(u => ({ ...u, value: (u as any).value || 0 }));
            updateUsersList(mappedUsers);
        } catch(err) {
            console.error("Failed to refresh online users for PK battle", err);
        }
    }, [streamer.id, updateUsersList]);
    
    const postGiftChatMessage = (payload: GiftSendPayload) => {
        