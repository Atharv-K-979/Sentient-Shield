/**
 * Human Error Firewall - content-script.js
 * Intercepts risky actions and injects secure UI.
 */

// --- Configuration ---
const UI_ID = "hef-secure-overlay-root";
let isProcessing = false;

// --- Event Listeners ---

document.addEventListener("paste", handlePaste, true);
document.addEventListener("drop", handleDrop, true);
document.addEventListener("submit", handleSubmit, true);

// Monitor input for behavioral analysis (non-blocking)
document.addEventListener("input", handleInput, true);

// --- Event Handlers ---

async function handlePaste(event) {
    if (isProcessing) return; // Prevent loop if we replay

    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('text');

    if (!pastedData) return;

    // Fast path: if empty or very short, ignore? No, might be password.

    event.preventDefault();
    event.stopPropagation();

    await analyzeAndDecide(pastedData, 'paste', event.target, () => {
        // Replay Action
        isProcessing = true;
        const target = event.target;

        // Programmatic insert is safer than emulating paste event often
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const text = target.value;
            target.value = text.substring(0, start) + pastedData + text.substring(end);
            target.selectionStart = target.selectionEnd = start + pastedData.length;
        } else if (target.isContentEditable) {
            document.execCommand("insertText", false, pastedData);
        }

        isProcessing = false;
    });
}

async function handleDrop(event) {
    if (isProcessing) return;

    const draggedData = event.dataTransfer.getData('text');
    if (!draggedData) return; // Only handling text drops for now

    event.preventDefault();
    event.stopPropagation();

    await analyzeAndDecide(draggedData, 'drop', event.target, () => {
        // Replay drop is hard, easiest is to insert text at drop location
        // For MVP, we will treat it like a paste at the target
        isProcessing = true;
        const target = event.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            target.value += draggedData; // simplified for MVP
        } else if (target.isContentEditable) {
            document.execCommand("insertText", false, draggedData);
        }
        isProcessing = false;
    });
}

async function handleSubmit(event) {
    if (isProcessing) return;

    // Gather all form data
    const form = event.target;
    const formData = new FormData(form);
    let allContent = "";
    for (let [key, value] of formData.entries()) {
        allContent += value + " "; // clear text concatenation
    }

    event.preventDefault();
    event.stopPropagation();

    await analyzeAndDecide(allContent, 'submit', form, () => {
        isProcessing = true;
        form.submit();
        isProcessing = false;
    });
}

function handleInput(event) {
    // Passive monitoring for behavior score
    // TODO: Send occasional "activity" pings to SW if needed for sophisticated models
    // For this MVP, we rely on the specific actions (paste/drop/submit)
}

// --- Logic & Communication ---

async function analyzeAndDecide(content, actionType, target, replayCallback) {
    try {
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

        if (response.blocked) {
            showBlockingUI(response, replayCallback);
        } else {
            replayCallback();
        }
    } catch (e) {
        console.error("HEF: Message failure", e);
        // Fail safe? Or Fail open?
        // Security product -> Fail safe (Block) usually, but for UX maybe allow?
        // Let's allow but log error.
        replayCallback();
    }
}

// --- Secure UI Injection ---

function showBlockingUI(riskData, onProceed) {
    // Remove existing if any
    const existing = document.getElementById(UI_ID);
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = UI_ID;
    host.style.position = 'fixed';
    host.style.top = '0';
    host.style.left = '0';
    host.style.width = '100vw';
    host.style.height = '100vh';
    host.style.zIndex = '2147483647'; // Max Z-Index
    host.style.backgroundColor = 'rgba(0,0,0,0.8)';
    host.style.display = 'flex';
    host.style.justifyContent = 'center';
    host.style.alignItems = 'center'; // Center vertically
    host.style.backdropFilter = "blur(5px)";

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
        host.remove();
    };

    btnProceed.onclick = () => {
        host.remove();
        onProceed(); // Replay
    };

    btnCancel.focus();
}
