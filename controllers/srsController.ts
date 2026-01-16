
// @ts-ignore
import { Request, Response, NextFunction } from 'express';
import config from '../config/settings.js';
import http from 'http';
import https from 'https';

/**
 * Helper function to proxy requests to the real SRS API.
 * This version uses the native Node.js http/https modules for robustness,
 * piping the request and response streams directly. This avoids potential issues with
 * the newer `fetch` API in different Node environments.
 */
const proxyToSrs = (req: Request, res: Response, next: NextFunction) => {
    const srsUrl = new URL(`${config.srsApiUrl}/api${req.url}`);
    
    console.log(`[SRS PROXY] Forwarding ${req.method} to: ${srsUrl.href}`);

    const protocol = srsUrl.protocol === 'https:' ? https : http;

    const options = {
        hostname: srsUrl.hostname,
        port: srsUrl.port,
        path: srsUrl.pathname + srsUrl.search,
        method: req.method,
        headers: {
            ...req.headers,
            host: srsUrl.host, // Crucial: Set the host header to the target's host
        },
    };
    
    // The 'connection' header is hop-by-hop and should not be forwarded.
    delete options.headers.connection;

    const proxyReq = protocol.request(options, (proxyRes) => {
        // Forward the headers from the SRS server to the client.
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        // Pipe the response body from the SRS server back to the client.
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        const errorMessage = `Failed to connect to SRS server at ${config.srsApiUrl}. Is it running and accessible?`;
        console.error(`[SRS PROXY] Network error while contacting SRS server:`, err);
        
        // Avoid trying to send a response if one has already been sent
        if (!res.headersSent) {
            res.status(502).json({
                code: -1,
                message: errorMessage,
                error: err.message
            });
        }
    });
    
    // Pipe the request body from the client to the SRS server.
    req.pipe(proxyReq, { end: true });
};


// All SRS controller functions now use the proxy helper, replacing the mock data.
export const srsController = {
    getVersions: proxyToSrs,
    getSummaries: proxyToSrs,
    getFeatures: proxyToSrs,
    getClients: proxyToSrs,
    getClientById: proxyToSrs,
    getStreams: proxyToSrs,
    getStreamById: proxyToSrs,
    deleteStreamById: proxyToSrs,
    getConnections: proxyToSrs,
    getConnectionById: proxyToSrs,
    deleteConnectionById: proxyToSrs,
    getConfigs: proxyToSrs,
    updateConfigs: proxyToSrs,
    getVhosts: proxyToSrs,
    getVhostById: proxyToSrs,
    getRequests: proxyToSrs,
    getSessions: proxyToSrs,
    getMetrics: proxyToSrs,
    rtcPublish: proxyToSrs,
    trickleIce: proxyToSrs,
};
