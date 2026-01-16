import { API_CONFIG } from './config';
import { User, PurchaseRecord, Gift, Streamer, RankedUser, MusicTrack, FeedPhoto, GiftSendPayload } from '@/types';
import { apiTrackerService } from './apiTrackerService';
import { mockData } from './mockData';
import { webSocketManager } from './websocket';


const USE_MOCK = false; // Ativado para usar dados de teste (mock) em vez da API real.
const TOKEN_KEY = '@LiveGo:token';
const USER_KEY = '@LiveGo:user';
const REQUEST_TIMEOUT = 10000; // 10 seconds

export const storage = {
    getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
    setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
    getUser: (): User | null => {
        const userJson = localStorage.getItem(USER_KEY);
        try {
            return userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            console.error("Failed to parse user from storage", e);
            return null;
        }
    },
    setUser: (user: User) => {
        if (user) {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        }
    },
    clear: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },
};

const handleMockRequest = async (method: string, endpoint: string, payload?: any): Promise<any> => {
    console.log(`[MOCK API] ${method} ${endpoint}`, payload);
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));
    const url = new URL(`http://mock.com${endpoint}`);
    const params = url.searchParams;

    // --- MOCK (New endpoint as requested) ---
    if (endpoint.startsWith('/mock/')) {
        if (endpoint === '/mock/view-history' && method === 'POST') {
            console.log(`[MOCK] Histórico de visualização salvo para streamerId: ${payload.streamerId}`);
            // In a real scenario, you'd find the stream and add it to a history array for the current user.
            return { success: true, message: 'Histórico de visualização mockado com sucesso.' };
        }
    }

    // --- AUTH ---
    if (endpoint.startsWith('/auth/')) {
        if (endpoint === '/auth/login' && method === 'POST') {
            return { user: mockData.currentUser, token: 'fake-jwt-token' };
        }
        if (endpoint === '/auth/register' && method === 'POST') {
            return { success: true };
        }
        if (endpoint === '/auth/logout' && method === 'POST') {
            return { success: true };
        }
        if (endpoint === '/auth/last-email' && method === 'GET') {
            return { email: 'adrianomdk5@gmail.com' };
        }
        if (endpoint === '/auth/save-last-email' && method === 'POST') {
            return { success: true };
        }
    }

    // --- USERS ---
    if (endpoint.startsWith('/users/')) {
        const parts = endpoint.split('/');
        const userId = parts[2];
        const action = parts[3];

        if (endpoint === '/users/me/history') {
            if (method === 'GET') {
                const history = mockData.streams.slice(3, 7).map(s => ({
                    id: s.id, // stream id
                    streamerId: s.hostId,
                    name: s.name,
                    avatar: s.avatar,
                    isLive: Math.random() > 0.5,
                    lastWatchedAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
                }));
                return history;
            }
            if (method === 'POST') {
                console.log('[MOCK] Histórico de visualização salvo:', payload);
                return { success: true };
            }
            if (method === 'DELETE') {
                console.log('[MOCK] Histórico de visualização limpo.');
                return { success: true };
            }
        }

        if (userId === 'me') {
            if (method === 'POST') {
                 const updatedUser = { ...mockData.currentUser, ...payload };
                 mockData.currentUser = updatedUser as User;
                 storage.setUser(updatedUser as User);
                 return { success: true, user: updatedUser };
            }
            if (!action) return mockData.currentUser;
            if (action === 'withdrawal-history') {
                 const mockHistory: PurchaseRecord[] = [
                    { id: 'wh-1', userId: 'me', amountBRL: 150.00, status: 'Con