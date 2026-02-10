/**
 * Human Error Firewall - content-script.js
 * Intercepts risky actions and injects secure UI.
 */

// --- Configuration ---
const UI_ID = "hef-secure-overlay-root";
let isProcessing = false;

// --- Event Listeners (Capture Phase is CRITICAL) ---
// We use {capture: true} to intercept events before page scripts see them.

console.log("HEF: Content script loaded. Attaching capture-phase listeners.");

document.addEventListener("paste", handlePaste, true);
document.addEventListener("drop", handleDrop, true);
document.addEventListener("submit", handleSubmit, true);

// Monitor input for behavioral analysis (non-blocking)
document.addEventListener("input", handleInput, true);

// --- Event Handlers ---

async function handlePaste(event) {
    if (isProcessing) return; // Prevent loop if we replay

    console.log("HEF: Paste event intercepted (Capture Phase).");

    // Attempt to get data
    let pastedData = null;
    if (event.clipboardData) {
        pastedData = event.clipboardData.getData('text');
    } else if (window.clipboardData) {
        pastedData = window.clipboardData.getData('Text');
    }

    if (!pastedData) {
        console.log("HEF: No text data found in paste.");
        return;
    }

    console.log("HEF: Blocking paste event for analysis.");
    // BLOCK IMMEDIATELY
    event.preventDefault();
    event.stopPropagation();

    // Analyze asynchronously
    await analyzeAndDecide(pastedData, 'paste', event.target, () => {
        console.log("HEF: Replaying paste action.");
        // Replay Action
        isProcessing = true;
        const target = event.target;

        // Programmatic insert
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const text = target.value;
            target.value = text.substring(0, start) + pastedData + text.substring(end);
            target.selectionStart = target.selectionEnd = start + pastedData.length;

            // Dispatch input event so frameworks like React detect the change
            target.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (target.isContentEditable) {
            document.execCommand("insertText", false, pastedData);
        }

        isProcessing = false;
    });
}

async function handleDrop(event) {
    if (isProcessing) return;

    console.log("HEF: Drop event intercepted.");
    const draggedData = event.dataTransfer.getData('text');
    if (!draggedData) return;

    event.preventDefault();
    event.stopPropagation();

    await analyzeAndDecide(draggedData, 'drop', event.target, () => {
        console.log("HEF: Replaying drop action.");
        isProcessing = true;
        const target = event.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            target.value += draggedData;
            target.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (target.isContentEditable) {
            document.execCommand("insertText", false, draggedData);
        }
        isProcessing = false;
    });
}

async function handleSubmit(event) {
    if (isProcessing) return;

    console.log("HEF: Submit event intercepted.");
    const form = event.target;
    // Basic FormData extraction
    const formData = new FormData(form);
    let allContent = "";
    for (let [key, value] of formData.entries()) {
        if (typeof value === 'string') {
            allContent += value + " ";
        }
    }

    event.preventDefault();
    event.stopPropagation();

    await analyzeAndDecide(allContent, 'submit', form, () => {
        console.log("HEF: Replaying submit action.");
        isProcessing = true;
        form.submit();
        isProcessing = false;
    });
}

function handleInput(event) {
    // Passive monitoring
}

// --- Logic & Communication ---

// async function analyzeAndDecide(content, actionType, target, replayCallback) {
//     console.log(`HEF: Sending content for analysis. Action: ${actionType}`);

//     // Context Validation - Fail open if extension is reloaded/invalid
//     if (!chrome.runtime?.id) {
//         console.warn("HEF: Extension context invalid (runtime.id missing). Failing open.");
//         replayCallback();
//         return;
//     }

//     try {
//         const response = await chrome.runtime.sendMessage({
//             type: 'ANALYZE_RISK',
//             payload: {
//                 content: content,
//                 context: {
//                     domain: window.location.hostname,
//                     inputType: target.type || 'text',
//                     action: actionType
//                 }
//             }
//         });

//         console.log("HEF: Received risk response:", response);

//         if (response && response.blocked) {
//             console.log("HEF: Action BLOCKED. Showing UI.");
//             showBlockingUI(response, replayCallback);
//         } else {
//             console.log("HEF: Action ALLOWED. Proceeding.");
//             replayCallback();
//         }
//     } catch (e) {
//         // Robust Error Catching
//         console.warn("HEF: Analysis failed (likely context invalid), allowing action.", e);
//         replayCallback();
//     }
// }

async function analyzeAndDecide(content, actionType, target, replayCallback) {
    // 1. Context Check: Prevent crash if extension reloaded
    if (!chrome.runtime?.id) {
        console.warn("HEF: Extension context invalidated. Please refresh the page.");
        replayCallback();
        return;
    }

    try {
        // 2. Async Call with Timeout Failsafe
        const response = await chrome.runtime.sendMessage({
            type: 'ANALYZE_RISK',
            payload: {
                content: content,
                context: {
                    domain: window.location.hostname,
                    inputType: target.type || 'text',
                    action: actionType
                }
            }
        });

        if (response && response.blocked) {
            showBlockingUI(response, replayCallback);
        } else {
            replayCallback();
        }
    } catch (e) {
        console.error("HEF: Message failure", e);
        replayCallback(); // Fail open for prototype UX
    }
}

// --- Secure UI Injection ---

function showBlockingUI(riskData, onProceed) {
    // Remove existing if any
    const existing = document.getElementById(UI_ID);
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = UI_ID;

    // HARDENED STYLES for Container
    Object.assign(host.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '2147483647', // Max integer
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: "blur(5px)",
        pointerEvents: 'auto' // Catch all clicks
    });

    const shadow = host.attachShadow({ mode: 'closed' });

    // Styles
    const style = document.createElement('style');
    style.textContent = `
        .modal {
            background: #fff;
            padding: 30px;
            border-radius: 12px;
            width: 400px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            text-align: center;
            border: 1px solid #e0e0e0;
            pointer-events: auto; /* Ensure modal is actionable */
        }
        h2 { margin-top: 0; color: #d32f2f; font-size: 20px; font-weight: 600;}
        .score-circle {
            width: 80px; height: 80px; border-radius: 50%;
            background: #ffebee; color: #d32f2f;
            display: flex; align-items: center; justify-content: center;
            font-size: 32px; font-weight: bold;
            margin: 0 auto 20px auto;
            border: 4px solid #ef5350;
        }
        .reasons {
            text-align: left; background: #fafafa; padding: 10px;
            border-radius: 6px; margin: 15px 0; font-size: 14px;
            color: #424242;
        }
        .reasons ul { margin: 5px 0 0 20px; padding: 0; }
        .actions { display: flex; gap: 10px; justify-content: center; margin-top: 25px; }
        button {
            padding: 10px 20px; border: none; border-radius: 6px;
            cursor: pointer; font-weight: 600; font-size: 14px;
            transition: background 0.2s;
        }
        .btn-cancel { background: #424242; color: #fff; }
        .btn-cancel:hover { background: #212121; }
        .btn-proceed { background: transparent; color: #757575; border: 1px solid #bdbdbd;}
        .btn-proceed:hover { background: #f5f5f5; color: #d32f2f; border-color: #ef5350; }
        p { color: #616161; line-height: 1.5; font-size: 15px;}
    `;

    // DOM Structure
    const modal = document.createElement('div');
    modal.className = "modal";

    modal.innerHTML = `
        <div class="score-circle">${Math.round(riskData.riskScore)}</div>
        <h2>Action Blocked</h2>
        <p>This action was flagged as high risk by Human Error Firewall.</p>
        <div class="reasons">
            <strong>Triggers:</strong>
            <ul>
                ${Array.isArray(riskData.reasons) ? riskData.reasons.map(r => `<li>${r}</li>`).join('') : '<li>High Risk Content</li>'}
            </ul>
        </div>
        <div class="actions">
            <button class="btn-cancel" id="btn-cancel">Cancel Action</button>
            <button class="btn-proceed" id="btn-proceed">Proceed Anyway</button>
        </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(modal);

    document.body.appendChild(host);

    // Focus Management
    const btnCancel = shadow.getElementById('btn-cancel');
    const btnProceed = shadow.getElementById('btn-proceed');

    btnCancel.onclick = () => {
        console.log("HEF: User clicked CANCEL.");
        host.remove();
    };

    btnProceed.onclick = () => {
        console.log("HEF: User clicked PROCEED.");
        host.remove();
        onProceed(); // Replay
    };

    btnCancel.focus();
}
