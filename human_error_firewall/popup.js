/**
 * Human Error Firewall - popup.js
 * Dashboard logic for visualizing extension status
 */

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
});

function loadStats() {
    chrome.storage.local.get(['incidents', 'behaviorLog'], (result) => {
        const incidents = result.incidents || [];

        updateSummaryStats(incidents);
        renderIncidentList(incidents);
    });
}

function updateSummaryStats(incidents) {
    // 1. Blocks Today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // We treat every "incident" in the log as a block/flag
    const blocksToday = incidents.filter(i => i.timestamp >= startOfDay).length;
    document.getElementById('blocks-today').textContent = blocksToday;

    // 2. Average Risk Score (last 50 incidents)
    if (incidents.length > 0) {
        const totalRisk = incidents.reduce((sum, i) => sum + i.score, 0);
        const avgRisk = (totalRisk / incidents.length).toFixed(1);
        document.getElementById('avg-risk').textContent = avgRisk;
    } else {
        document.getElementById('avg-risk').textContent = "0.0";
    }
}

function renderIncidentList(incidents) {
    const listContainer = document.getElementById('incident-list');

    if (incidents.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No recent incidents recorded.</div>';
        return;
    }

    listContainer.innerHTML = '';

    // Show last 5 incidents
    const recentIncidents = incidents.slice(0, 5);

    recentIncidents.forEach(incident => {
        const item = document.createElement('div');
        item.className = 'incident-item';

        const date = new Date(incident.timestamp);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const badgesHtml = incident.categories.map(cat =>
            `<span class="badge">${cat}</span>`
        ).join('');

        item.innerHTML = `
            <div class="incident-header">
                <span class="incident-domain">${incident.domain}</span>
                <span class="incident-time">${timeString}</span>
            </div>
            <div class="incident-badges">
                ${badgesHtml}
                <span class="badge" style="background:#e3f2fd; color:#1565c0">Risk: ${incident.score.toFixed(1)}</span>
            </div>
        `;

        listContainer.appendChild(item);
    });
}
