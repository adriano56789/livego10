/**
 * CONFIGURAÇÃO DE CONEXÃO DA API
 * Aponta para o servidor real na VPS, tanto em desenvolvimento quanto em produção.
 */

// Vite substitui `process.env.NODE_ENV` por 'production' durante o build (`npm run build`)
// e 'development' ao rodar o servidor de desenvolvimento (`npm run dev`).
const isProduction = process.env.NODE_ENV === 'production';

// Domínio público da sua aplicação em produção.
const PRODUCTION_DOMAIN = 'https://livego.store';

// IP real da VPS para ser usado como base, conforme solicitado para o novo fluxo de desenvolvimento.
const DEVELOPMENT_VPS_URL = 'http://72.60.249.175:3000';

// Em produção, usamos a URL do domínio. Em desenvolvimento, apontamos diretamente para a VPS.
const backendHost = isProduction ? PRODUCTION_DOMAIN : DEVELOPMENT_VPS_URL;
const wsHost = isProduction ? PRODUCTION_DOMAIN.replace(/^http/, 'ws') : DEVELOPMENT_VPS_URL.replace(/^http/, 'ws');

export const API_CONFIG = {
    /**
     * URL base para chamadas HTTP (fetch).
     * - Em Produção: 'https://livego.store/api'
     * - Em Desenvolvimento: 'http://72.60.249.175:3000/api'
     */
    BASE_URL: `${backendHost}/api`,
    
    /**
     * URL para a conexão WebSocket.
     * - Em Produção: 'wss://livego.store'
     * - Em Desenvolvimento: 'ws://72.60.249.175:3000'
     */
    WS_URL: wsHost,
};