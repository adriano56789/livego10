import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiTrackerService, LogEntry } from '../services/apiTrackerService';
import { ChevronLeftIcon, TrashIcon, PlayIcon, DatabaseIcon } from './icons';
import { api } from '../services/api';
import { LoadingSpinner } from './Loading';

interface ApiTrackerProps {
    isVisible: boolean;
    onClose: () => void;
}

interface ScanResult extends LogEntry {
    response?: any;
    paramsSent?: any;
}

interface EndpointDefinition {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    path: string;
    func: (...args: any[]) => Promise<any>;
    params: { name: string; default?: any }[];
    buildPayload?: (p: any) => any;
    collections: string[];
}

// FIX: Export getApiDefinitions function to be used in other components, resolving circular dependency.
export const getApiDefinitions = (): Array<{ group: string, endpoints: EndpointDefinition[] }> => [
    {
        group: 'Auth',
        endpoints: [
            { method: 'POST', path: '/auth/login', func: api.auth.login, params: [{ name: 'email', default: 'admin@livego.com' }, { name: 'password', default: '123' }], buildPayload: (p: any) => ({ email: p.email, password: p.password }), collections: ['users'] },
            { method: 'POST', path: '/auth/register', func: api.auth.register, params: [{ name: 'name', default: 'Tester' }, { name: 'email', default: `test${Date.now()}@test.com` }, { name: 'password', default: '123' }], buildPayload: (p: any) => ({ name: p.name, email: p.email, password: p.password }), collections: ['users'] },
            { method: 'POST', path: '/auth/logout', func: api.auth.logout, params: [], collections: ['users'] },
            { method: 'GET', path: '/auth/last-email', func: api.auth.getLastEmail, params: [], collections: [] },
            { method: 'POST', path: '/auth/save-email', func: api.auth.saveLastEmail, params: [{ name: 'email', default: 'saved@test.com' }], buildPayload: (p: any) => ({ email: p.email }), collections: [] }
        ]
    },
    {
        group: 'Users',
        endpoints: [
            { method: 'GET', path: '/users/me', func: api.users.me, params: [], collections: ['users'] },
            { method: 'GET', path: '/users/:id', func: api.users.get, params: [{ name: 'id', default: '5582931' }], collections: ['users'] },
            { method: 'GET', path: '/users/online', func: api.users.getOnlineUsers, params: [{ name: 'roomId', default: 'global' }], collections: ['users'] },
            { method: 'GET', path: '/users/:id/fans', func: api.users.getFansUsers, params: [{ name: 'id', default: 'me' }], collections: ['users'] },
            { method: 'GET', path: '/users/:id/friends', func: api.users.getFriends, params: [{ name: 'id', default: 'me' }], collections: ['users'] },
            { method: 'GET', path: '/users/search', func: api.users.search, params: [{ name: 'q', default: 'Mirella' }], collections: ['users'] },
            { method: 'POST', path: '/users/me/language', func: api.users.setLanguage, params: [{ name: 'code', default: 'en' }], buildPayload: (p: any) => ({code: p.code}), collections: ['users'] },
            { method: 'POST', path: '/users/:id', func: api.users.update, params: [{ name: 'id', default: 'me' }, { name: 'data', default: '{"bio":"Nova bio de teste"}' }], buildPayload: (p: any) => JSON.parse(p.data), collections: ['users'] },
            { method: 'POST', path: '/users/:id/follow', func: api.users.toggleFollow, params: [{ name: 'id', default: '9928374' }], collections: ['users'] },
            { method: 'GET', path: '/users/me/withdrawal-history', func: api.users.getWithdrawalHistory, params: [{ name: 'status', default: 'Todos' }], collections: ['transactions'] },
            { method: 'POST', path: '/users/me/blocklist/:userId', func: api.users.blockUser, params: [{ name: 'userId', default: '1122334' }], collections: ['users'] },
            // FIX: Corrected api.users.getBlocklist call to use api.getBlocklist as defined in services/api.ts.
            { method: 'GET', path: '/users/me/blocklist', func: api.getBlocklist, params: [], collections: ['users'] },
            // FIX: Corrected api.users.unblockUser call to use api.unblockUser as defined in services/api.ts.
            { method: 'POST', path: '/users/me/blocklist/:userId/unblock', func: api.unblockUser, params: [{ name: 'userId', default: '1122334' }], collections: ['users'] },
            { method: 'GET', path: '/users/:userId/following', func: api.getFollowingUsers, params: [{ name: 'userId', default: 'me' }], collections: ['users'] },
            { method: 'GET', path: '/users/:userId/visitors', func: api.getVisitors, params: [{ name: 'userId', default: 'me' }], collections: ['users'] },
            { method: 'GET', path: '/users/me/history', func: api.getStreamHistory, params: [], collections: [] },
            { method: 'GET', path: '/users/me/reminders', func: api.getReminders, params: [], collections: [] },
            { method: 'DELETE', path: '/users/me/reminders/:id', func: api.removeReminder, params: [{ name: 'id', default: 'rem-1' }], collections: [] },
            { method: 'POST', path: '/users/:userId/active-frame', func: api.setActiveFrame, params: [{ name: 'userId', default: 'me' }, { name: 'frameId', default: 'FrameBlueCrystal' }], buildPayload: (p) => ({ frameId: p.frameId }), collections: ['users'] },
            // FIX: Corrected API call path
            { method: 'POST', path: '/users/me/billing-address', func: api.users.updateBillingAddress, params: [{ name: 'address', default: '{"street":"Test St", "number":"123"}' }], buildPayload: (p) => JSON.parse(p.address), collections: ['users'] },
            // FIX: Corrected API call path
            { method: 'POST', path: '/users/me/credit-card', func: api.users.updateCreditCard, params: [{ name: 'card', default: '{"number":"4242424242424242"}' }], buildPayload: (p) => JSON.parse(p.card), collections: ['users'] }
        ]
    },
    {
        group: 'Chats',
        endpoints: [
            { method: 'GET', path: '/chats/conversations', func: api.chats.listConversations, params: [], collections: ['conversations', 'users'] },
            { method: 'POST', path: '/chats/start', func: api.chats.start, params: [{ name: 'userId', default: '9928374' }], buildPayload: (p: any) => ({ userId: p.userId }), collections: ['conversations', 'users'] }
        ]
    },
    {
        group: 'Gifts & Wallet',
        endpoints: [
            { method: 'GET', path: '/gifts', func: api.gifts.list, params: [{ name: 'category', default: 'Popular' }], collections: ['gifts'] },
            { method: 'GET', path: '/gifts/gallery', func: api.gifts.getGallery, params: [], collections: ['gifts'] },
            { method: 'POST', path: '/presentes/recarregar', func: api.gifts.recharge, params: [], collections: ['users'] },
            { method: 'POST', path: '/gift', func: api.sendGift, params: [{ name: 'from', default: 'me' }, { name: 'streamId', default: '8827364' }, { name: 'giftName', default: 'Rosa' }, { name: 'count', default: 1 }, { name: 'targetId', default: '9928374' }], collections: ['users', 'transactions'] },
            { method: 'GET', path: '/wallet/balance', func: api.diamonds.getBalance, params: [{ name: 'userId', default: 'me' }], collections: ['users'] },
            { method: 'POST', path: '/users/:userId/purchase', func: api.diamonds.purchase, params: [{ name: 'userId', default: 'me' }, { name: 'diamonds', default: 800 }, { name: 'price', default: 7 }], buildPayload: (p) => ({ diamonds: p.diamonds, price: p.price }), collections: ['users', 'transactions'] },
            { method: 'POST', path: '/wallet/confirm-purchase', func: api.confirmPurchaseTransaction, params: [{ name: 'details', default: '{"diamonds":800, "price":7}' }, { name: 'method', default: 'card' }], buildPayload: (p) => ({ details: JSON.parse(p.details), method: p.method }), collections: ['transactions', 'users'] },
            { method: 'POST', path: '/wallet/cancel-purchase', func: api.cancelPurchaseTransaction, params: [], collections: [] }
        ]
    },
    {
        group: 'Earnings & Admin',
        endpoints: [
            { method: 'POST', path: '/earnings/withdraw/calculate', func: api.earnings.withdraw.calculate, params: [{ name: 'amount', default: 10000 }], buildPayload: (p) => ({ amount: p.amount }), collections: ['users'] },
            { method: 'POST', path: '/earnings/withdraw/request', func: api.earnings.withdraw.request, params: [{ name: 'amount', default: 10000 }, { name: 'method', default: '{"method":"pix", "details":{"key":"test@test.com"}}' }], buildPayload: (p) => ({ amount: p.amount, method: JSON.parse(p.method) }), collections: ['users', 'transactions'] },
            { method: 'POST', path: '/earnings/withdraw/methods', func: api.earnings.withdraw.methods.update, params: [{ name: 'method', default: 'pix' }, { name: 'details', default: '{"key":"new@test.com"}' }], collections: ['users'] },
            { method: 'GET', path: '/admin/withdrawals', func: api.admin.getAdminWithdrawalHistory, params: [], collections: ['transactions'] },
            { method: 'POST', path: '/admin/withdrawals/request', func: api.admin.withdraw.request, params: [{ name: 'amount', default: 100 }], buildPayload: (p) => ({ amount: p.amount }), collections: ['transactions', 'users'] },
            { method: 'POST', path: '/admin/withdrawals/method', func: api.admin.saveAdminWithdrawalMethod, params: [{ name: 'details', default: '{"type":"email", "email":"admin@livego.com"}' }], buildPayload: (p) => JSON.parse(p.details), collections: ['users'] }
        ]
    },
    {
        group: 'Streams & Live',
        endpoints: [
            { method: 'GET', path: '/live/:category', func: api.streams.listByCategory, params: [{ name: 'category', default: 'popular' }, { name: 'region', default: 'global' }], collections: ['streamers'] },
            { method: 'POST', path: '/streams', func: api.streams.create, params: [{ name: 'data', default: '{"name":"Live de Teste", "hostId":"me"}' }], buildPayload: (p: any) => JSON.parse(p.data), collections: ['streamers', 'users'] },
            { method: 'PATCH', path: '/streams/:id', func: api.streams.update, params: [{ name: 'id', default: '8827364' }, { name: 'data', default: '{"isPrivate":true}' }], buildPayload: (p) => JSON.parse(p.data), collections: ['streamers'] },
            { method: 'PATCH', path: '/streams/:id/quality', func: api.streams.updateVideoQuality, params: [{ name: 'id', default: '8827364' }, { name: 'quality', default: '1080p' }], buildPayload: (p) => ({ quality: p.quality }), collections: ['streamers'] },
            { method: 'GET', path: '/streams/:streamId/donors', func: api.streams.getGiftDonors, params: [{ name: 'streamId', default: '8827364' }], collections: ['users'] },
            { method: 'GET', path: '/streams/search', func: api.streams.search, params: [{ name: 'q', default: 'Live' }], collections: ['streamers'] },
            { method: 'POST', path: '/streams/:streamId/invite', func: api.streams.inviteToPrivateRoom, params: [{ name: 'streamId', default: '8827364' }, { name: 'userId', default: '3456754' }], buildPayload: (p) => ({ userId: p.userId }), collections: [] },
            { method: 'POST', path: '/streams/:streamId/cohost/invite', func: api.inviteFriendForCoHost, params: [{ name: 'streamId', default: '8827364' }, { name: 'friendId', default: '8827361' }], buildPayload: (p) => ({ friendId: p.friendId }), collections: [] },
            { method: 'POST', path: '/streams/:r/kick', func: api.kickUser, params: [{ name: 'r', default: '8827364' }, { name: 'u', default: '3456754' }], buildPayload: (p) => ({ userId: p.u }), collections: [] },
            { method: 'POST', path: '/streams/:r/moderator', func: api.makeModerator, params: [{ name: 'r', default: '8827364' }, { name: 'u', default: '3456754' }], buildPayload: (p) => ({ userId: p.u }), collections: [] },
            { method: 'GET', path: '/streams/beauty-settings', func: api.streams.getBeautySettings, params: [], collections: [] },
            { method: 'POST', path: '/streams/beauty-settings', func: api.streams.saveBeautySettings, params: [{ name: 'settings', default: '{"smooth": 50}' }], buildPayload: (p) => JSON.parse(p.settings), collections: [] },
            { method: 'POST', path: '/streams/beauty-settings/reset', func: api.streams.resetBeautySettings, params: [], collections: [] },
            { method: 'POST', path: '/live/toggle-mic', func: api.toggleMicrophone, params: [], collections: [] },
            { method: 'POST', path: '/live/toggle-sound', func: api.toggleStreamSound, params: [], collections: [] },
            { method: 'POST', path: '/live/toggle-autofollow', func: api.toggleAutoFollow, params: [], collections: [] },
            { method: 'POST', path: '/live/toggle-autoinvite', func: api.toggleAutoPrivateInvite, params: [], collections: [] }
        ]
    },
    {
        group: 'Assets & Misc',
        endpoints: [
            { method: 'GET', path: '/ranking/daily', func: api.getDailyRanking, params: [], collections: ['users'] },
            { method: 'GET', path: '/ranking/weekly', func: api.getWeeklyRanking, params: [], collections: ['users'] },
            { method: 'GET', path: '/ranking/monthly', func: api.getMonthlyRanking, params: [], collections: ['users'] },
            { method: 'GET', path: '/ranking/top-fans', func: api.getTopFans, params: [], collections: ['users'] },
            { method: 'GET', path: '/tasks/quick-friends', func: api.getQuickCompleteFriends, params: [], collections: ['users'] },
            { method: 'POST', path: '/tasks/quick-friends/:friendId/complete', func: api.completeQuickFriendTask, params: [{ name: 'friendId', default: 'qf1' }], collections: [] },
            { method: 'GET', path: '/assets/music', func: api.getMusicLibrary, params: [], collections: ['music'] },
            { method: 'GET', path: '/assets/frames', func: api.getAvatarFrames, params: [], collections: ['frames'] },
            { method: 'POST', path: '/posts', func: api.createFeedPost, params: [{ name: 'data', default: '{"type":"image", "mediaData":"base64..."}' }], buildPayload: (p) => JSON.parse(p.data), collections: ['users', 'posts'] },
            { method: 'POST', path: '/translate', func: api.translate, params: [{ name: 'text', default: 'hello world' }], buildPayload: (p) => ({ text: p.text }), collections: [] }
        ]
    },
    {
        group: 'Database',
        endpoints: [
            { method: 'GET', path: '/db/collections', func: api.db.checkCollections, params: [], collections: ['*'] },
            { method: 'POST', path: '/db/setup', func: api.db.setupDatabase, params: [{ name: 'collections', default: '["users", "gifts"]' }], buildPayload: (p) => ({ collections: JSON.parse(p.collections) }), collections: ['*'] }
        ]
    },
    {
        group: 'SRS (Streaming)',
        endpoints: [
            { method: 'GET', path: '/v1/versions', func: api.srs.getVersions, params: [], collections: [] },
            { method: 'GET', path: '/v1/summaries', func: api.srs.getSummaries, params: [], collections: [] },
            { method: 'GET', path: '/v1/features', func: api.srs.getFeatures, params: [], collections: [] },
            { method: 'GET', path: '/v1/clients', func: api.srs.getClients, params: [], collections: [] },
            { method: 'GET', path: '/v1/clients/:id', func: api.srs.getClientById, params: [{ name: 'id', default: 'cli_xyz789' }], collections: [] },
            { method: 'GET', path: '/v1/streams', func: api.srs.getStreams, params: [], collections: [] },
            { method: 'GET', path: '/v1/streams/:id', func: api.srs.getStreamById, params: [{ name: 'id', default: 'str_abc123' }], collections: [] },
            { method: 'DELETE', path: '/v1/streams/:id', func: api.srs.deleteStreamById, params: [{ name: 'id', default: 'str_abc123' }], collections: [] },
            { method: 'GET', path: '/v1/connections', func: api.srs.getConnections, params: [], collections: [] },
            { method: 'GET', path: '/v1/connections/:id', func: api.srs.getConnectionById, params: [{ name: 'id', default: 'cli_xyz789' }], collections: [] },
            { method: 'DELETE', path: '/v1/connections/:id', func: api.srs.deleteConnectionById, params: [{ name: 'id', default: 'cli_xyz789' }], collections: [] },
            { method: 'GET', path: '/v1/configs', func: api.srs.getConfigs, params: [], collections: [] },
            { method: 'PUT', path: '/v1/configs', func: api.srs.updateConfigs, params: [{ name: 'config', default: 'vhost __defaultVhost__ {}' }], buildPayload: (p: any) => p.config, collections: [] },
            { method: 'GET', path: '/v1/metrics', func: api.srs.getMetrics, params: [], collections: [] },
            { method: 'POST', path: '/v1/rtc/publish', func: api.srs.rtcPublish, params: [{ name: 'sdp', default: 'v=0...' }, { name: 'streamUrl', default: 'webrtc://test/live/test' }], buildPayload: (p) => ({ sdp: p.sdp, streamUrl: p.streamUrl }), collections: [] },
            { method: 'POST', path: '/v1/rtc/trickle/:sessionId', func: api.srs.trickleIce, params: [{ name: 'sessionId', default: 'rtc-session-123' }, { name: 'candidate', default: '{"candidate":"..."}' }], buildPayload: (p) => JSON.parse(p.candidate), collections: [] }
        ]
    },
    {
        group: 'LiveKit (WebRTC)',
        endpoints: [
            { method: 'POST', path: '/livekit/token/generate', func: api.livekit.token.generate, params: [{ name: 'userId', default: 'user-123' }, { name: 'userName', default: 'Test User' }], buildPayload: (p) => ({ userId: p.userId, userName: p.userName }), collections: [] },
            { method: 'GET', path: '/livekit/rooms', func: api.livekit.room.list, params: [], collections: [] },
            { method: 'POST', path: '/livekit/room/create', func: api.livekit.room.create, params: [{ name: 'roomId', default: 'test-room-scan' }], buildPayload: (p) => ({ roomId: p.roomId }), collections: [] }
        ]
    }
];

const ApiTracker: React.FC<ApiTrackerProps> = ({ isVisible, onClose }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDefinition | null>(null);
    const [params, setParams] = useState<Record<string, any>>({});
    const [scanResults, setScanResults] = useState<ScanResult[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        if (isVisible) {
            const unsubscribe = apiTrackerService.subscribe(setLogs);
            return unsubscribe;
        }
    }, [isVisible]);
    
    useEffect(() => {
        if(selectedEndpoint) {
            const initialParams: Record<string, any> = {};
            selectedEndpoint.params.forEach(p => {
                initialParams[p.name] = p.default !== undefined ? p.default : '';
            });
            setParams(initialParams);
        }
    }, [selectedEndpoint]);
    
    const handleParamChange = (name: string, value: any) => {
        setParams(prev => ({ ...prev, [name]: value }));
    };

    const handleExecute = async () => {
        if (!selectedEndpoint) return;
        
        setIsScanning(true);
        const startTime = Date.now();
        const scanResult: ScanResult = { 
            id: `scan-${Date.now()}`, 
            method: selectedEndpoint.method, 
            endpoint: selectedEndpoint.path, 
            startTime, 
            status: 'Pending',
            paramsSent: params
        };
        setScanResults([scanResult]);

        try {
            const args = selectedEndpoint.params.map(p => params[p.name]);
            // Use buildPayload if it exists
            const payload = selectedEndpoint.buildPayload ? [selectedEndpoint.buildPayload(params)] : args;

            const response = await selectedEndpoint.func(...payload);
            scanResult.status = 'Success';
            scanResult.response = response;
        } catch (err: any) {
            scanResult.status = 'Error';
            scanResult.error = err.message;
        } finally {
            scanResult.duration = Date.now() - startTime;
            setScanResults([scanResult]);
            setIsScanning(false);
        }
    };
    
    const apiGroups = useMemo(() => getApiDefinitions(), []);

    return (
        <div className={`fixed inset-0 z-[150] bg-[#121212] flex flex-col font-mono transform transition-transform duration-300 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Main View */}
            <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${selectedEndpoint ? '-translate-x-full' : 'translate-x-0'}`}>
                <header className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
                    <button onClick={onClose}><ChevronLeftIcon className="w-6 h-6 text-white" /></button>
                    <h1 className="text-lg font-bold text-white">API Tracker</h1>
                    <button onClick={() => apiTrackerService.clearLogs()}><TrashIcon className="w-5 h-5 text-gray-400" /></button>
                </header>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {logs.map(log => (
                         <div key={log.id} className="bg-[#1C1C1E] p-2 rounded text-xs border border-transparent hover:border-white/10">
                            <div className="flex justify-between items-center">
                                <div><span className="font-bold text-purple-400">{log.method}</span> <span className="text-gray-300">{log.endpoint}</span></div>
                                <span className={`font-bold ${log.status === 'Success' ? 'text-green-500' : 'text-yellow-500'}`}>{log.status}</span>
                            </div>
                            <div className="text-gray-500 text-[10px]">{log.duration ? `${log.duration}ms` : '...'} {log.statusCode && `| ${log.statusCode}`}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Endpoint Detail View */}
            <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${selectedEndpoint ? 'translate-x-0' : 'translate-x-full'}`}>
                <header className="flex items-center p-4 border-b border-white/5 shrink-0">
                    <button onClick={() => setSelectedEndpoint(null)}><ChevronLeftIcon className="w-6 h-6 text-white" /></button>
                    <h1 className="text-base font-bold text-white truncate text-center flex-1 mx-4">{selectedEndpoint?.path}</h1>
                    <div className="w-6"></div>
                </header>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {selectedEndpoint?.params.map(p => (
                        <div key={p.name}>
                            <label className="text-gray-400 text-xs mb-1 block">{p.name}</label>
                            <input type="text" value={params[p.name] || ''} onChange={e => handleParamChange(p.name, e.target.value)} className="w-full bg-[#2C2C2E] text-white p-2 rounded text-xs outline-none" />
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-white/5">
                    <button onClick={handleExecute} disabled={isScanning} className="w-full bg-green-600 text-white font-bold py-3 rounded flex items-center justify-center gap-2">
                        {isScanning ? <LoadingSpinner /> : <PlayIcon className="w-4 h-4" />}
                        Executar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiTracker;
