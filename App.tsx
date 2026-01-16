import React, { useState, useCallback, useEffect, useRef } from 'react';
import LoginScreen from './components/LoginScreen';
import MainScreen from './components/MainScreen';
import ProfileScreen from './components/screens/ProfileScreen';
import MessagesScreen from './components/screens/MessagesScreen';
import FooterNav from './components/FooterNav';
import ReminderModal from './components/ReminderModal';
import HistoryModal from './components/HistoryModal';
import RegionModal from './components/RegionModal';
import GoLiveScreen from './components/GoLiveScreen';
import { ToastType, ToastData, Streamer, User, StreamSummaryData, LiveSessionState } from './types';
import Toast from './components/Toast';
import UserProfileScreen from './components/screens/UserProfileDetailScreen';
import WalletScreen from './components/WalletScreen';
import AdminWalletScreen from './components/AdminWalletScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import SearchScreen from './components/SearchScreen';
import VideoScreen from './components/screens/VideoScreen';
import LanguageSelectionModal from './components/LanguageSelectionModal';
import { api, storage } from './services/api';
import { LoadingSpinner } from './components/Loading';
import { webSocketManager } from './services/websocket';
import { LanguageProvider } from './i18n';
import EndStreamConfirmationModal from './components/EndStreamConfirmationModal';
import EndStreamSummaryScreen from './components/EndStreamSummaryScreen';
import RelationshipScreen from './components/screens/RelationshipScreen';
import { LevelScreen, TopFansScreen, BlockListScreen } from './components/screens/ProfileSubScreens';
import MarketScreen from './components/screens/MarketScreen';
import FanClubMembersScreen from './components/screens/FanClubMembersScreen';
import StreamRoom from './components/StreamRoom';
import { PKBattleScreen } from './components/PKBattleScreen';
import PrivateInviteModal from './components/live/PrivateInviteModal';
import ApiTracker from './components/ApiTracker';
import EditProfileScreen from './components/EditProfileScreen';
import ApiHealthMonitorScreen from './components/screens/ApiHealthMonitorScreen';
import ZoomSettingsScreen from './components/screens/ZoomSettingsScreen';
import LiveKitMonitorScreen from './components/screens/LiveKitMonitorScreen';
import { GIFTS } from './constants';
import StreamingControlPanel from './components/StreamingControlPanel';
// FIX: Import missing screen components for admin developer tools.
import DatabaseScreen from './components/DatabaseScreen';
import AppIntegrityTesterScreen from './components/screens/AppIntegrityTesterScreen';
import FullApiCheckupScreen from './components/screens/FullApiCheckupScreen';

const AppContent: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
    const [activeScreen, setActiveScreen] = useState<'main' | 'profile' | 'messages' | 'video'>('main');
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const [liveSession, setLiveSession] = useState<LiveSessionState | null>(null);
    const [isApiTrackerVisible, setIsApiTrackerVisible] = useState(false);
    const [isHealthMonitorOpen, setIsHealthMonitorOpen] = useState(false);
    const [isLiveKitMonitorOpen, setIsLiveKitMonitorOpen] = useState(false);
    const [isStreamingPanelOpen, setIsStreamingPanelOpen] = useState(false);
    const tapCount = useRef(0);
    const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [chatTargetUser, setChatTargetUser] = useState<User | null>(null);
    
    const [visitors, setVisitors] = useState<User[]>([]);

    const addToast = useCallback((type: ToastType, message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            const savedUser = storage.getUser();
            const token = storage.getToken();

            if (savedUser && token) {
                try {
                    const freshUser = await api.users.me();
                    setCurrentUser(freshUser);
                    setIsAuthenticated(true);
                    webSocketManager.connect(freshUser.id);
                    // FIX: Corrected API call to use api.getVisitors
                    api.getVisitors(freshUser.id).then(visitorList => setVisitors(visitorList || [])).catch(() => setVisitors([]));
                } catch (e) {
                    console.warn("Sessão expirada ou VPS offline.");
                    storage.clear();
                }
            }
            setIsLoadingInitial(false);
        };
        checkAuth();
    }, []);

    const [activeStream, setActiveStream] = useState<Streamer | null>(null);
    const [pkOpponent, setPkOpponent] = useState<User | null>(null);
    const [isGoLiveOpen, setIsGoLiveOpen] = useState(false);
    
    const [isReminderOpen, setIsReminderOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isRegionOpen, setIsRegionOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
    const [isPrivateInviteModalOpen, setIsPrivateInviteModalOpen] = useState(false);

    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [walletTab, setWalletTab] = useState<'Diamante' | 'Ganhos'>('Diamante');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsInitialView, setSettingsInitialView] = useState('root');
    const [isMarketOpen, setIsMarketOpen] = useState(false);
    const [isLevelOpen, setIsLevelOpen] = useState(false);
    const [isAdminWalletOpen, setIsAdminWalletOpen] = useState(false);
    const [isBlockListOpen, setIsBlockListOpen] = useState(false);
    const [isTopFansOpen, setIsTopFansOpen] = useState(false);
    const [isFanClubMembersOpen, setIsFanClubMembersOpen] = useState(false);
    const [isZoomSettingsOpen, setIsZoomSettingsOpen] = useState(false);
    // FIX: Add state for new admin developer tool screens.
    const [isDatabaseMonitorOpen, setIsDatabaseMonitorOpen] = useState(false);
    const [isIntegrityTesterOpen, setIsIntegrityTesterOpen] = useState(false);
    const [isFullApiCheckupOpen, setIsFullApiCheckupOpen] = useState(false);
    
    const [relTab, setRelTab] = useState<'following' | 'fans' | 'visitors'>('following');
    const [isRelOpen, setIsRelOpen] = useState(false);
    
    const [profileToView, setProfileToView] = useState<User | null>(null);

    const [isEndConfirmationOpen, setIsEndConfirmationOpen] = useState(false);
    const [showStreamSummary, setShowStreamSummary] = useState(false);
    const [lastSummary, setLastSummary] = useState<StreamSummaryData | null>(null);

    const [streamers, setStreamers] = useState<Streamer[]>([]);
    const [isLoadingStreams, setIsLoadingStreams] = useState(false);
    const [activeTab, setActiveTab] = useState('popular');
    const [selectedRegion, setSelectedRegion] = useState('global');
    const [followingUsers, setFollowingUsers] = useState<User[]>([]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const fetchStreams = async () => {
            setIsLoadingStreams(true);
            try {
                // FIX: Corrected API call to use api.streams.listByCategory
                const result: any = await api.streams.listByCategory(activeTab, selectedRegion);
                const list = Array.isArray(result) ? result : (result?.data || []);
                setStreamers(list);
            } catch (err) {
                console.error("[MainScreen] Falha ao carregar lives:", err);
                setStreamers([]);
            } finally {
                setIsLoadingStreams(false);
            }
        };
        fetchStreams();
    }, [activeTab, selectedRegion, isAuthenticated]);

    const updateCurrentUser = (user: User) => {
        setCurrentUser(user);
        storage.setUser(user);
    };

    const handleLogin = (data: { user: User; token: string }) => {
        storage.setUser(data.user);
        storage.setToken(data.token);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        webSocketManager.connect(data.user.id);
    };

    const handleLogout = () => {
        storage.clear();
        setIsAuthenticated(false);
        setCurrentUser(null);
        webSocketManager.disconnect();
    };
    
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
    };

    const handleSelectStream = (streamer: Streamer) => {
        if (activeStream?.id === streamer.id) return;
        setActiveStream(streamer);
        
        // Inicializa sessão de live para espectador
        const newLiveSession: LiveSessionState = {
            viewers: streamer.viewers || 0,
            peakViewers: streamer.viewers || 0,
            coins: Math.floor(Math.random() * 10000), // Valor inicial aleatório simulado
            followers: 0,
            members: 0,
            fans: 0,
            events: [],
            isMicrophoneMuted: false,
            isStreamMuted: false,
            isAutoFollowEnabled: false,
            isAutoPrivateInviteEnabled: false,
            startTime: Date.now()
        };
        setLiveSession(newLiveSession);
    };

    const handleLeaveStream = () => {
        setActiveStream(null);
        setLiveSession(null);
    };
    
    const handleStartStream = (streamData: Partial<Streamer>) => {
        const newStreamer: Streamer = {
            id: `live_${Date.now()}`,
            hostId: currentUser!.id,
            name: currentUser!.name,
            avatar: currentUser!.avatarUrl,
            location: currentUser!.location,
            viewers: 1,
            tags: [],
            ...streamData
        };
        setActiveStream(newStreamer);
        setIsGoLiveOpen(false);

        // Inicializa sessão de live para Broadcaster (Zerada)
        setLiveSession({
            viewers: 1,
            peakViewers: 1,
            coins: 0,
            followers: 0,
            members: 0,
            fans: 0,
            events: [],
            isMicrophoneMuted: false,
            isStreamMuted: false,
            isAutoFollowEnabled: false,
            isAutoPrivateInviteEnabled: false,
            startTime: Date.now()
        });
    };
    
    const handleEndStream = () => {
        setIsEndConfirmationOpen(false);

        if (activeStream) {
            webSocketManager.emit('stream:ended', { streamId: activeStream.id });
        }

        const isBroadcaster = activeStream?.hostId === currentUser?.id;
        if (activeStream && isBroadcaster) {
            // FIX: Corrected API call to use api.streams.deleteById
            api.streams.deleteById(activeStream.id).then((res: any) => {
                 addToast(ToastType.Info, res.message || "Stream encerrada no servidor.");
            }).catch(err => {
                console.error("Failed to delete stream:", err);
                addToast(ToastType.Error, "Falha ao encerrar a stream no servidor.");
            });
        }

        setActiveStream(null);
        if (liveSession) {
            const duration = (Date.now() - liveSession.startTime) / 1000;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            const summary = {
                viewers: liveSession.peakViewers,
                duration: `${minutes}m ${seconds}s`,
                coins: liveSession.coins,
                followers: liveSession.followers,
                members: liveSession.members,
                fans: liveSession.fans
            };
            setLastSummary(summary);
            setShowStreamSummary(true);
        }
        setLiveSession(null);
    };
    
    const handleViewProfile = (userToView: User) => {
        setProfileToView(userToView);
    };
    
    const handleOpenRelationship = (tab: 'following' | 'fans' | 'visitors') => {
        setRelTab(tab);
        setIsRelOpen(true);
    };
    
    const handleStartPK = (opponent: User) => {
        setPkOpponent(opponent);
    };

    const handleSecretTap = () => {
        if (tapTimeout.current) clearTimeout(tapTimeout.current);
        tapCount.current += 1;
        if (tapCount.current >= 5) {
            setIsApiTrackerVisible(p => !p);
            tapCount.current = 0;
        }
        tapTimeout.current = setTimeout(() => {
            tapCount.current = 0;
        }, 1000);
    };
    
    const handleStartChatWith = (user: User) => {
        if (profileToView) setProfileToView(null);
        if (activeStream) handleLeaveStream();
        setChatTargetUser(user);
        setActiveScreen('messages');
    };

    const handleOpenSettings = (initialView = 'root') => {
        setSettingsInitialView(initialView);
        setIsSettingsOpen(true);
    };

    const handleFollowUser = (userToFollow: User, streamId?: string) => {
        if (!currentUser) return;
        const isAlreadyFollowing = followingUsers.some(u => u.id === userToFollow.id);
        if (!isAlreadyFollowing) {
            setFollowingUsers(prev => [...prev, userToFollow]);
            addToast(ToastType.Success, `Você começou a seguir ${userToFollow.name}!`);
        }
        api.users.toggleFollow(userToFollow.id).catch(() => {
             setFollowingUsers(prev => prev.filter(u => u.id !== userToFollow.id));
        });
    };

    const updateLiveSessionState = (updates: Partial<LiveSessionState>) => {
        setLiveSession(prev => prev ? { ...prev, ...updates } : null);
    };

    const handleRegionSelect = (region: string) => {
        setSelectedRegion(region);
        addToast(ToastType.Info, `Região alterada para ${region.toUpperCase()}.`);
    };

    const handleOpenPrivateChat = () => {
        if (activeStream && currentUser) {
            const isBroadcaster = activeStream.hostId === currentUser.id;
            if (isBroadcaster) {
                handleLeaveStream();
                setActiveScreen('messages');
            } else {
                const streamerUserObject: User = {
                    id: activeStream.hostId, identification: activeStream.hostId,
                    name: activeStream.name, avatarUrl: activeStream.avatar,
                    coverUrl: `https://picsum.photos/seed/${activeStream.id}/800/1600`,
                    country: activeStream.country || 'br', age: 23, gender: 'female',
                    level: 1, xp: 0, location: activeStream.location, fans: 0, following: 0,
                    receptores: 0, enviados: 0, isLive: true, diamonds: 0, earnings: 0, earnings_withdrawn: 0
                };
                handleStartChatWith(streamerUserObject);
            }
        } else {
            setActiveScreen('messages');
        }
    };
    
    if (isLoadingInitial) {
        return <div className="h-screen w-screen flex items-center justify-center bg-black"><LoadingSpinner /></div>;
    }

    if (!isAuthenticated) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className="h-screen w-screen bg-black text-white font-sans overflow-hidden select-none">
          <div className="absolute top-0 left-0 right-0 z-[200] flex flex-col items-center pt-4 pointer-events-none">
                {toasts.map(t => (
                    <Toast key={t.id} data={t} onClose={() => {}} />
                ))}
          </div>

          {isApiTrackerVisible && <ApiTracker isVisible={isApiTrackerVisible} onClose={() => setIsApiTrackerVisible(false)} />}
          {isHealthMonitorOpen && <ApiHealthMonitorScreen onClose={() => setIsHealthMonitorOpen(false)} />}
          {isLiveKitMonitorOpen && <LiveKitMonitorScreen onClose={() => setIsLiveKitMonitorOpen(false)} />}
          {isStreamingPanelOpen && <StreamingControlPanel onClose={() => setIsStreamingPanelOpen(false)} addToast={addToast} />}
    
          {isWalletOpen && currentUser && <WalletScreen onClose={() => setIsWalletOpen(false)} initialTab={walletTab} currentUser={currentUser} updateUser={updateCurrentUser} addToast={addToast} />}
          {isAdminWalletOpen && currentUser && <AdminWalletScreen onClose={() => setIsAdminWalletOpen(false)} user={currentUser} addToast={addToast} />}
          {isSettingsOpen && currentUser && (
            <SettingsScreen 
                currentUser={currentUser}
                onClose={() => setIsSettingsOpen(false)}
                onLogout={handleLogout}
                onOpenBlockList={() => setIsBlockListOpen(true)}
                onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
                onOpenWallet={(tab) => { setIsWalletOpen(true); setWalletTab(tab || 'Diamante'); }}
                initialView={settingsInitialView}
                updateUser={updateCurrentUser}
                addToast={addToast}
                onOpenZoomSettings={() => setIsZoomSettingsOpen(true)}
            />
          )}
          {isZoomSettingsOpen && currentUser && (
              <ZoomSettingsScreen
                  onClose={() => setIsZoomSettingsOpen(false)}
                  currentUser={currentUser}
                  updateUser={updateCurrentUser}
                  addToast={addToast}
              />
          )}
          {/* FIX: Conditionally render new admin tool screens */}
          {isDatabaseMonitorOpen && <DatabaseScreen onClose={() => setIsDatabaseMonitorOpen(false)} addToast={addToast} />}
          {isIntegrityTesterOpen && <AppIntegrityTesterScreen onClose={() => setIsIntegrityTesterOpen(false)} />}
          {isFullApiCheckupOpen && <FullApiCheckupScreen onClose={() => setIsFullApiCheckupOpen(false)} />}

          {isMarketOpen && currentUser && <MarketScreen onClose={() => setIsMarketOpen(false)} user={currentUser} updateUser={updateCurrentUser} onOpenWallet={(tab) => {setIsWalletOpen(true); setWalletTab(tab)}} addToast={addToast} />}
          {isLevelOpen && currentUser && <LevelScreen onClose={() => setIsLevelOpen(false)} currentUser={currentUser} />}
          {isBlockListOpen && <BlockListScreen onClose={() => setIsBlockListOpen(false)} />}
          {isTopFansOpen && <TopFansScreen onClose={() => setIsTopFansOpen(false)} />}
          {isFanClubMembersOpen && profileToView && <FanClubMembersScreen streamer={profileToView} onClose={() => setIsFanClubMembersOpen(false)} onViewProfile={handleViewProfile} />}

          {isRelOpen && currentUser && <RelationshipScreen initialTab={relTab} onClose={() => setIsRelOpen(false)} currentUser={currentUser} onViewProfile={handleViewProfile} />}

          {showStreamSummary && lastSummary && currentUser && (
              <EndStreamSummaryScreen 
                  currentUser={currentUser}
                  summaryData={lastSummary} 
                  onClose={() => setShowStreamSummary(false)} 
              />
          )}

          {isLanguageModalOpen && <LanguageSelectionModal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} />}
        
          <div className={`w-full h-full transition-all duration-300 ${activeStream ? 'blur-sm scale-95' : ''}`}>
             {activeScreen === 'main' && (
                <MainScreen
                    onOpenReminderModal={() => setIsReminderOpen(true)}
                    onOpenRegionModal={() => setIsRegionOpen(true)}
                    onSelectStream={handleSelectStream}
                    onOpenSearch={() => setIsSearchOpen(true)}
                    streamers={streamers}
                    isLoading={isLoadingStreams}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    showLocationBanner={!currentUser?.location}
                />
             )}
            {activeScreen === 'profile' && currentUser && (
                <ProfileScreen
                    currentUser={currentUser}
                    onOpenUserDetail={() => setProfileToView(currentUser)}
                    onOpenWallet={(tab) => { setIsWalletOpen(true); setWalletTab(tab || 'Diamante'); }}
                    onOpenFollowing={() => handleOpenRelationship('following')}
                    onOpenFans={() => handleOpenRelationship('fans')}
                    onOpenVisitors={() => handleOpenRelationship('visitors')}
                    onNavigateToMessages={() => setActiveScreen('messages')}
                    onOpenMarket={() => setIsMarketOpen(true)}
                    onOpenMyLevel={() => setIsLevelOpen(true)}
                    onOpenBlockList={() => setIsBlockListOpen(true)}
                    onOpenFAQ={() => { /* Placeholder */ }}
                    onOpenSettings={() => handleOpenSettings()}
                    onOpenSupportChat={() => { /* Placeholder */ }}
                    onOpenAdminWallet={() => setIsAdminWalletOpen(true)}
                    onOpenApiTracker={() => setIsApiTrackerVisible(true)}
                    onOpenHealthMonitor={() => setIsHealthMonitorOpen(true)}
                    onOpenLiveKitMonitor={() => setIsLiveKitMonitorOpen(true)}
                    onOpenStreamingPanel={() => setIsStreamingPanelOpen(true)}
                    // FIX: Add missing props to satisfy the ProfileScreenProps interface.
                    onOpenDatabaseMonitor={() => setIsDatabaseMonitorOpen(true)}
                    onOpenIntegrityTester={() => setIsIntegrityTesterOpen(true)}
                    onOpenFullApiCheckup={() => setIsFullApiCheckupOpen(true)}
                    visitors={visitors}
                />
            )}
            {activeScreen === 'messages' && <MessagesScreen addToast={addToast} initialChatUser={chatTargetUser} onChatOpened={() => setChatTargetUser(null)} />}
            {activeScreen === 'video' && currentUser && <VideoScreen addToast={addToast} currentUser={currentUser} />}

            <FooterNav 
                currentUser={currentUser} 
                onOpenGoLive={() => setIsGoLiveOpen(true)}
                activeTab={activeScreen}
                onNavigate={setActiveScreen}
                onSecretTap={handleSecretTap}
            />
          </div>

          {profileToView && currentUser && (
// Fix: Corrected component name from UserProfileDetailScreen to UserProfileScreen to match its import alias.
              <UserProfileScreen
                  userToView={profileToView}
                  loggedInUser={currentUser}
                  onClose={() => setProfileToView(null)}
                  onUpdateUser={(updated) => { if (updated.id === currentUser.id) updateCurrentUser(updated); setProfileToView(updated); }}
                  onOpenFans={() => { setProfileToView(null); handleOpenRelationship('fans'); }}
                  onOpenFollowing={() => { setProfileToView(null); handleOpenRelationship('following'); }}
                  onOpenTopFans={() => { setProfileToView(null); setIsTopFansOpen(true); }}
                  onChat={() => profileToView && handleStartChatWith(profileToView)}
                  onFollow={() => handleFollowUser(profileToView)}
                  addToast={addToast}
              />
          )}

          {activeStream && currentUser && (
             pkOpponent ? (
                <PKBattleScreen 
                    streamer={activeStream}
                    opponent={pkOpponent}
                    onEndPKBattle={() => setPkOpponent(null)}
                    currentUser={currentUser}
                    updateUser={updateCurrentUser}
                    onRequestEndStream={() => setIsEndConfirmationOpen(true)}
                    onLeaveStreamView={handleLeaveStream}
                    onViewProfile={handleViewProfile}
                    onOpenWallet={(tab) => { setIsWalletOpen(true); setWalletTab(tab || 'Diamante'); }}
                    onFollowUser={handleFollowUser}
                    onOpenPrivateChat={handleOpenPrivateChat}
                    onOpenPrivateInviteModal={() => setIsPrivateInviteModalOpen(true)}
                    onOpenPKTimerSettings={() => {}}
                    onOpenFans={() => handleOpenRelationship('fans')}
                    onOpenFriendRequests={() => {}}
                    liveSession={liveSession}
                    updateLiveSession={updateLiveSessionState}
                    logLiveEvent={() => {}}
                    onStreamUpdate={(updates) => setActiveStream(prev => prev ? { ...prev, ...updates } : null)}
                    addToast={addToast}
                    setActiveScreen={setActiveScreen}
                    followingUsers={followingUsers}
                    pkBattleDuration={5}
                    streamers={streamers}
                    onSelectStream={handleSelectStream}
                    onOpenVIPCenter={() => setIsMarketOpen(true)}
                    onOpenFanClubMembers={(user) => {setProfileToView(user); setIsFanClubMembersOpen(true)}}
                    onOpenSettings={handleOpenSettings}
                />
             ) : (
                <StreamRoom 
                    streamer={activeStream}
                    currentUser={currentUser}
                    updateUser={updateCurrentUser}
                    onRequestEndStream={() => setIsEndConfirmationOpen(true)}
                    onLeaveStreamView={handleLeaveStream}
                    onStartPKBattle={handleStartPK}
                    onViewProfile={handleViewProfile}
                    onOpenWallet={(tab) => { setIsWalletOpen(true); setWalletTab(tab || 'Diamante'); }}
                    onFollowUser={handleFollowUser}
                    onOpenPrivateChat={handleOpenPrivateChat}
                    onOpenPrivateInviteModal={() => setIsPrivateInviteModalOpen(true)}
                    onOpenPKTimerSettings={() => {}}
                    onOpenFans={() => handleOpenRelationship('fans')}
                    onOpenFriendRequests={() => {}}
                    liveSession={liveSession}
                    updateLiveSession={updateLiveSessionState}
                    logLiveEvent={() => {}}
                    onStreamUpdate={(updates) => setActiveStream(prev => prev ? { ...prev, ...updates } : null)}
                    addToast={addToast}
                    setActiveScreen={setActiveScreen}
                    followingUsers={followingUsers}
                    streamers={streamers}
                    onSelectStream={handleSelectStream}
                    onOpenVIPCenter={() => setIsMarketOpen(true)}
                    onOpenFanClubMembers={(user) => {setProfileToView(user); setIsFanClubMembersOpen(true)}}
                    onOpenSettings={handleOpenSettings}
                />
             )
          )}
          
          <EndStreamConfirmationModal isOpen={isEndConfirmationOpen} onConfirm={handleEndStream} onCancel={() => setIsEndConfirmationOpen(false)} />
          {isGoLiveOpen && currentUser && <GoLiveScreen currentUser={currentUser} onClose={() => setIsGoLiveOpen(false)} onStartStream={handleStartStream} addToast={addToast} />}
          {isReminderOpen && <ReminderModal isOpen={isReminderOpen} onClose={() => setIsReminderOpen(false)} onOpenHistory={() => { setIsReminderOpen(false); setIsHistoryOpen(true); }} onSelectStream={handleSelectStream} />}
{/* FIX: The 'onSelectStream' prop was missing from the HistoryModal component, causing a type error. Added the required prop to resolve the issue. */}
          {isHistoryOpen && <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onSelectStream={handleSelectStream} />}
          {isRegionOpen && <RegionModal isOpen={isRegionOpen} onClose={() => setIsRegionOpen(false)} onSelectRegion={handleRegionSelect} />}
          {isSearchOpen && <SearchScreen onClose={() => setIsSearchOpen(false)} onUserSelected={(user) => { setIsSearchOpen(false); handleViewProfile(user); }} />}
          {isPrivateInviteModalOpen && activeStream && <PrivateInviteModal isOpen={isPrivateInviteModalOpen} onClose={() => setIsPrivateInviteModalOpen(false)} streamId={activeStream.id} hostId={activeStream.hostId} />}

        </div>
    );
};

const App: React.FC = () => (
    <LanguageProvider>
        <AppContent />
    </LanguageProvider>
);

export default App;