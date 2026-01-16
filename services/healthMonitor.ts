
import { apiTrackerService } from './apiTrackerService';

export type ConnectivityStatus = 'connected' | 'disconnected' | 'reconnecting' | 'scanning';

export interface HealthIncident {
    time: string;
    status: ConnectivityStatus;
    latency: number;
    cause: string;
    details?: string;
    isViolation?: boolean;
}

export interface ApiStatus {
    name: string;
    endpoint: string;
    status: 'online' | 'offline' | 'error';
    lastError?: string;
}

type HealthListener = (status: ConnectivityStatus, latency: number, lastIncident?: HealthIncident) => void;

class HealthMonitorService {
    private status: ConnectivityStatus = 'connected';
    private latency: number = 0;
    private listeners: HealthListener[] = [];
    private checkInterval: ReturnType<typeof setInterval> | null = null;
    private incidents: HealthIncident[] = [];
    
    public apiServices: ApiStatus[] = [
        { name: 'Gateway Principal', endpoint: '/status', status: 'online' },
        { name: 'Autenticação (Auth)', endpoint: '/auth/last-email', status: 'online' },
        { name: 'Banco de Dados (Data)', endpoint: '/gifts', status: 'online' },
        { name: 'Realtime (Socket)', endpoint: '/ws-handshake', status: 'online' }
    ];

    private readonly BASE_URL = '/api';
    private readonly REQUEST_TIMEOUT = 4000;

    constructor() {
        this.startMonitoring();
    }

    private async checkHealth() {
        if (this.status === 'scanning') return;

        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

            const response = await fetch(`${this.BASE_URL}/status`, { 
                method: 'GET',
                signal: controller.signal,
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json',
                }
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                this.latency = Date.now() - start;
                this.updateStatus('connected', 'Sinal Estável');
            } else {
                throw new Error(`HTTP_${response.status}`);
            }
        } catch (err: any) {
            this.handleVpsFailure(err);
        }
    }

    private handleVpsFailure(err: any) {
        this.latency = -1;
        let cause = 'VPS_OFFLINE';
        let details = 'A VPS não responde aos pings de integridade.';

        if (err.name === 'AbortError') {
            cause = 'TIMEOUT_REDE';
            details = 'A requisição para o servidor demorou muito para responder (timeout).';
        } else if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
            cause = 'FALHA_DE_REDE';
            details = 'Falha de rede ao tentar conectar. Verifique CORS, firewall ou conectividade com a internet.';
        }
        
        this.updateStatus('disconnected', cause, details);
    }

    async runApiForensics(): Promise<ApiStatus[]> {
        console.log("%c[PERÍCIA] Iniciando escaneamento profundo de APIs...", "color: #00E676; font-weight: bold");
        
        for (let i = 0; i < this.apiServices.length; i++) {
            const service = this.apiServices[i];
            
            try {
                const res = await fetch(`${this.BASE_URL}${service.endpoint}`, { 
                    method: 'GET', 
                    signal: AbortSignal.timeout(3000) 
                });

                this.apiServices[i] = {
                    ...service,
                    status: res.ok ? 'online' : 'error',
                    lastError: res.ok ? undefined : `Erro HTTP ${res.status}`
                };
            } catch (e: any) {
                let errorMsg = 'Desconectado';
                if (e.message.includes('fetch')) errorMsg = 'Violação de CORS ou Bloqueio de IP';
                if (e.name === 'AbortError') errorMsg = 'Instabilidade (Timeout)';

                this.apiServices[i] = {
                    ...service,
                    status: 'offline',
                    lastError: errorMsg
                };
            }
        }

        this.notify(this.incidents[0]);
        return this.apiServices;
    }

    private updateStatus(newStatus: ConnectivityStatus, cause: string, details?: string) {
        const isNew = this.status !== newStatus;
        this.status = newStatus;

        if (isNew && newStatus === 'disconnected') {
            const incident: HealthIncident = {
                time: new Date().toLocaleTimeString(),
                status: newStatus,
                latency: this.latency,
                cause,
                details
            };
            this.incidents.unshift(incident);
        }
        this.notify();
    }

    private async attemptAutoReconnect() {
        try {
            const ws = await import('./websocket');
            const apiMod = await import('./api');
            const user = apiMod.storage.getUser();
            if (user?.id) ws.webSocketManager.connect(user.id);
        } catch (e) {}
    }

    startMonitoring() {
        if (this.checkInterval) return;
        this.checkHealth();
        this.checkInterval = setInterval(() => this.checkHealth(), 5000);
    }

    subscribe(listener: HealthListener) {
        this.listeners.push(listener);
        listener(this.status, this.latency);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify(incident?: HealthIncident) {
        this.listeners.forEach(l => l(this.status, this.latency, incident));
    }

    getStatus() { return this.status; }
    getHistory() { return this.incidents; }
}

export const healthMonitor = new HealthMonitorService();