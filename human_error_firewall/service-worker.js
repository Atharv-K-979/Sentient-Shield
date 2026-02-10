/**
 * Human Error Firewall - service-worker.js
 * Risk Engine & Central "Brain"
 *
 * R = (Sensitivity * Context) + Behavior
 */

// --- Constants & Config ---

const MAX_RISK_SCORE = 10;
const BEHAVIOR_WINDOW_MS = 60 * 60 * 1000; // 1 Hour
const RISK_THRESHOLD = 5; // Scores above this trigger the block

// Regex patterns for sensitive data
const SENSITIVE_PATTERNS = {
    CREDIT_CARD: {
        regex: /\b(?:\d[ -]*?){13,16}\b/,
        score: 8,
        name: "Credit Card Number"
    },
    AWS_KEY: {
        regex: /(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])/,
        score: 9,
        name: "AWS Access Key"
    },
    PRIVATE_KEY_HEADER: {
        regex: /-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/,
        score: 10,
        name: "Private Key"
    },
    IPV4_INTERNAL: {
        regex: /(^|\D)(10\.(\d{1,3}\.){2}\d{1,3}|192\.168\.(\d{1,3}\.){1}\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.(\d{1,3}\.){1}\d{1,3})($|\D)/,
        score: 6,
        name: "Internal IP Address"
    },
    PASSWORD_KEYWORD: {
        regex: /password|passwd|pwd|secret/i,
        score: 3,
        name: "Possible Password Context"
    }
};

// --- State Management (In-Memory for performance, Sync to Storage for persistence) ---
let behaviorLog = [];

// Initialize or load state
chrome.runtime.onStartup.addListener(loadState);
chrome.runtime.onInstalled.addListener(loadState);

function loadState() {
    chrome.storage.local.get(['behaviorLog'], (result) => {
        if (result.behaviorLog) {
            behaviorLog = result.behaviorLog;
            pruneOldBehavior();
        }
    });
}

function pruneOldBehavior() {
    const now = Date.now();
    behaviorLog = behaviorLog.filter(entry => (now - entry.timestamp) < BEHAVIOR_WINDOW_MS);
    saveState();
}

function saveState() {
    chrome.storage.local.set({ behaviorLog });
}

// --- Risk Calculation Logic ---

function calculateRisk(content, context) {
    console.log("HEF: Calculating risk for content length:", content.length, "Context:", context);
    let sensitivityScore = 0;
    let triggeredCategories = [];

    // 1. Sensitivity Analysis
    for (const key in SENSITIVE_PATTERNS) {
        const pattern = SENSITIVE_PATTERNS[key];
        if (pattern.regex.test(content)) {
            sensitivityScore = Math.max(sensitivityScore, pattern.score);
            triggeredCategories.push(pattern.name);
            console.log("HEF: Matched pattern:", pattern.name);
        }
    }

    // 2. Context Analysis
    if (context.inputType === 'password') {
        sensitivityScore += 2;
        triggeredCategories.push("Password Field");
    }

    // 3. Behavior Analysis
    pruneOldBehavior();
    const recentIncidents = behaviorLog.length;
    // Each recent incident adds 0.5 to the risk score, capped at +3
    const behaviorScore = Math.min(recentIncidents * 0.5, 3);

    let totalRisk = sensitivityScore + behaviorScore;

    // Normalize
    totalRisk = Math.min(totalRisk, MAX_RISK_SCORE);

    console.log("HEF: Risk Analysis Result:", { totalRisk, triggeredCategories });
    return {
        score: totalRisk,
        categories: triggeredCategories
    };
}

// --- Message Handling ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ANALYZE_RISK') {
        console.log("HEF: Received ANALYZE_RISK request.");
        const { content, context } = message.payload;
        const analysis = calculateRisk(content, context);

        const isBlocked = analysis.score >= RISK_THRESHOLD;

        if (isBlocked) {
            logIncident(analysis, context.domain);
            // Add to behavior log
            behaviorLog.push({ timestamp: Date.now(), score: analysis.score, domain: context.domain });
            saveState();
        }

        sendResponse({
            riskScore: analysis.score,
            blocked: isBlocked,
            reasons: analysis.categories
        });
        console.log("HEF: Sent response. Blocked?", isBlocked);
    }
    return true; // Keep channel open for async response - CRITICAL for MV3
});

// --- Incident Logging ---

function logIncident(analysis, domain) {
    chrome.storage.local.get(['incidents'], (result) => {
        const incidents = result.incidents || [];
        incidents.unshift({ // Add to beginning
            timestamp: Date.now(),
            score: analysis.score,
            domain: domain,
            categories: analysis.categories
        });
        // Keep only last 50 for storage efficiency
        if (incidents.length > 50) incidents.length = 50;
        chrome.storage.local.set({ incidents });
    });
}
