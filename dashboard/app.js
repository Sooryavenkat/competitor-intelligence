/**
 * Securin Competitor Intelligence Dashboard
 * Reads JSON data from data/ directory and renders four views.
 */

const app = {
    manifest: null,
    currentMonth: null,
    currentView: 'overview',
    selectedCompetitor: null,
    cache: {}, // month -> { competitor -> data, insights -> data }

    async init() {
        try {
            const resp = await fetch('data/manifest.json');
            this.manifest = await resp.json();
        } catch (e) {
            this.manifest = { months: [], competitors: [], month_data: {} };
        }

        // Populate month selector
        const select = document.getElementById('monthSelect');
        if (this.manifest.months.length > 0) {
            this.manifest.months.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = this.formatMonth(m);
                select.appendChild(opt);
            });
            this.currentMonth = this.manifest.months[0];
            select.value = this.currentMonth;
        }

        // Setup nav
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', () => {
                this.setView(item.dataset.view);
            });
        });

        this.render();
    },

    formatMonth(m) {
        if (!m) return '';
        const [y, mo] = m.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[parseInt(mo) - 1]} ${y}`;
    },

    setView(view) {
        this.currentView = view;
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        this.render();
    },

    selectMonth(month) {
        this.currentMonth = month;
        document.getElementById('monthSelect').value = month;
        this.render();
    },

    prevMonth() {
        const idx = this.manifest.months.indexOf(this.currentMonth);
        if (idx < this.manifest.months.length - 1) {
            this.selectMonth(this.manifest.months[idx + 1]);
        }
    },

    nextMonth() {
        const idx = this.manifest.months.indexOf(this.currentMonth);
        if (idx > 0) {
            this.selectMonth(this.manifest.months[idx - 1]);
        }
    },

    async loadMonthData(month) {
        if (this.cache[month]) return this.cache[month];

        const monthData = this.manifest.month_data[month];
        if (!monthData) return null;

        const data = {};
        // Load each competitor
        for (const slug of (monthData.competitors || [])) {
            try {
                const resp = await fetch(`data/${month}/${slug}.json`);
                data[slug] = await resp.json();
            } catch (e) {
                console.warn(`Failed to load ${month}/${slug}.json`);
            }
        }
        // Load insights
        if (monthData.has_insights) {
            try {
                const resp = await fetch(`data/${month}/insights.json`);
                data._insights = await resp.json();
            } catch (e) {
                console.warn(`Failed to load ${month}/insights.json`);
            }
        }

        this.cache[month] = data;
        return data;
    },

    async render() {
        const main = document.getElementById('mainContent');

        if (!this.currentMonth) {
            main.innerHTML = this.renderEmpty('No Data Available', 'Run agent1_scrape.py to generate competitor intelligence data, then agent2_build.py to update the dashboard.');
            return;
        }

        main.innerHTML = '<div class="loading">Loading...</div>';
        const data = await this.loadMonthData(this.currentMonth);

        if (!data || Object.keys(data).length === 0) {
            main.innerHTML = this.renderEmpty('No Data for ' + this.formatMonth(this.currentMonth), 'Run the scraper for this month to populate data.');
            return;
        }

        switch (this.currentView) {
            case 'overview': main.innerHTML = this.renderOverview(data); break;
            case 'timeline': main.innerHTML = await this.renderTimeline(); break;
            case 'detail': main.innerHTML = this.renderDetail(data); break;
            case 'implications': main.innerHTML = this.renderImplications(data); break;
        }
    },

    renderEmpty(title, message) {
        return `<div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <h3>${title}</h3>
            <p>${message}</p>
        </div>`;
    },

    // ===== VIEW: MONTHLY OVERVIEW =====
    renderOverview(data) {
        const competitors = this.manifest.competitors;
        let cards = '';

        for (const comp of competitors) {
            const d = data[comp.slug];
            if (!d || d.parse_error) continue;

            const threat = d.securin_implications?.threat_level || 'medium';
            const theme = d.executive_strategic_insight?.core_theme || 'No data';
            const updates = d.engineering_capacity?.total_updates_shipped || '—';
            const ratio = d.engineering_capacity?.new_features_vs_maintenance_ratio || '—';
            const velocity = d.engineering_capacity?.velocity_assessment || '—';

            // Resource allocation tags
            let tags = '';
            if (d.resource_allocation) {
                for (const bucket of d.resource_allocation) {
                    const cls = this.bucketClass(bucket.bucket);
                    tags += `<span class="tag ${cls}">${bucket.bucket} (${bucket.effort_pct}%)</span>`;
                }
            }

            // Overlap badges
            let overlaps = '';
            for (const o of comp.securin_overlap) {
                overlaps += `<span class="overlap-badge">${o}</span>`;
            }

            cards += `
            <div class="competitor-card" onclick="app.showCompetitor('${comp.slug}')">
                <div class="card-header">
                    <span class="card-name">${comp.name}</span>
                    <span class="threat-badge threat-${threat}">${threat} threat</span>
                </div>
                <div class="card-body">
                    <div class="card-theme">${this.esc(theme)}</div>
                    <div class="card-metrics">
                        <div class="metric">
                            <div class="metric-value">${this.esc(String(updates))}</div>
                            <div class="metric-label">Updates</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${this.esc(String(ratio))}</div>
                            <div class="metric-label">New/Maint</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value" style="font-size:13px">${this.esc(String(velocity))}</div>
                            <div class="metric-label">Velocity</div>
                        </div>
                    </div>
                    <div class="card-tags">${tags}</div>
                    <div class="overlap-badges">${overlaps}</div>
                </div>
            </div>`;
        }

        return `
            <h1 class="view-title">Monthly Overview</h1>
            <div class="view-subtitle">${this.formatMonth(this.currentMonth)} — Competitor landscape at a glance</div>
            <div class="competitor-grid">${cards || this.renderEmpty('No competitor data', 'Data not yet available for this month.')}</div>
        `;
    },

    showCompetitor(slug) {
        this.selectedCompetitor = slug;
        this.setView('detail');
    },

    // ===== VIEW: TIMELINE =====
    async renderTimeline() {
        // Collect all available months (up to last 6)
        const months = this.manifest.months.slice(0, 6).reverse();
        const competitors = this.manifest.competitors;

        // Load all months data
        const allData = {};
        for (const m of months) {
            allData[m] = await this.loadMonthData(m);
        }

        // Header
        let headerCols = '<div class="timeline-label-col">Competitor</div>';
        for (const m of months) {
            headerCols += `<div class="timeline-month-col">${this.formatMonth(m)}</div>`;
        }

        // Rows
        let rows = '';
        for (const comp of competitors) {
            let cells = `<div class="timeline-competitor-name">${comp.name}</div>`;
            for (const m of months) {
                const d = allData[m]?.[comp.slug];
                let pills = '';
                if (d?.resource_allocation) {
                    for (const bucket of d.resource_allocation) {
                        const cls = this.bucketClass(bucket.bucket);
                        for (const item of (bucket.key_items || []).slice(0, 3)) {
                            pills += `<span class="timeline-pill ${cls}" title="${this.esc(item)}">${this.truncate(item, 25)}</span>`;
                        }
                    }
                }
                if (!pills) pills = '<span style="color:var(--text-muted);font-size:11px">No data</span>';
                cells += `<div class="timeline-cell">${pills}</div>`;
            }
            rows += `<div class="timeline-row">${cells}</div>`;
        }

        return `
            <h1 class="view-title">Feature Timeline</h1>
            <div class="view-subtitle">What competitors shipped across months — color-coded by category</div>
            <div class="timeline-container">
                <div class="timeline-header">${headerCols}</div>
                ${rows}
            </div>
        `;
    },

    // ===== VIEW: COMPETITOR DETAIL =====
    renderDetail(data) {
        // If no competitor selected, show selector
        if (!this.selectedCompetitor) {
            let options = '';
            for (const comp of this.manifest.competitors) {
                if (data[comp.slug]) {
                    options += `<div class="competitor-card" onclick="app.showCompetitor('${comp.slug}')" style="cursor:pointer">
                        <div class="card-header"><span class="card-name">${comp.name}</span></div>
                        <div class="card-body"><div class="card-theme">Click to view full report</div></div>
                    </div>`;
                }
            }
            return `
                <h1 class="view-title">Competitor Detail</h1>
                <div class="view-subtitle">Select a competitor to view the full intelligence report</div>
                <div class="competitor-grid">${options}</div>
            `;
        }

        const d = data[this.selectedCompetitor];
        const comp = this.manifest.competitors.find(c => c.slug === this.selectedCompetitor);
        if (!d || !comp) {
            return this.renderEmpty('No data', `No data for ${this.selectedCompetitor} in ${this.formatMonth(this.currentMonth)}`);
        }

        const exec = d.executive_strategic_insight || {};
        const eng = d.engineering_capacity || {};
        const intel = d.intelligence_signals || {};
        const secImpl = d.securin_implications || {};

        // Resource allocation bars
        let allocBars = '';
        if (d.resource_allocation) {
            for (const bucket of d.resource_allocation) {
                const cls = this.bucketClass(bucket.bucket);
                const pct = bucket.effort_pct || 0;
                const items = (bucket.key_items || []).join(', ');
                allocBars += `
                <div>
                    <div class="allocation-row">
                        <div class="allocation-label">${this.esc(bucket.bucket)}</div>
                        <div class="allocation-bar-bg">
                            <div class="allocation-bar-fill ${cls}" style="width:${pct}%">${pct}%</div>
                        </div>
                    </div>
                    <div class="allocation-items">${this.esc(items)}</div>
                </div>`;
            }
        }

        // Product-specific implications
        let prodImplications = '';
        if (secImpl.product_specific) {
            for (const [product, note] of Object.entries(secImpl.product_specific)) {
                prodImplications += `<p><strong>${this.esc(product)}:</strong> ${this.esc(note)}</p>`;
            }
        }

        // Gaps
        let gaps = '';
        if (secImpl.gaps_exposed) {
            gaps = secImpl.gaps_exposed.map(g => `<span class="tag security">${this.esc(g)}</span>`).join('');
        }

        return `
            <div class="detail-back" onclick="app.selectedCompetitor=null;app.render()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                Back to list
            </div>
            <div class="detail-header">
                <div>
                    <div class="detail-name">${comp.name}</div>
                    <div class="detail-overlap">Securin overlap: ${comp.securin_overlap.join(', ')}</div>
                </div>
                <span class="threat-badge threat-${secImpl.threat_level || 'medium'}">${secImpl.threat_level || 'medium'} threat</span>
            </div>

            <div class="detail-sections">
                <!-- 1. Executive Strategic Insight -->
                <div class="detail-section">
                    <div class="section-title">Executive Strategic Insight</div>
                    <div class="section-body">
                        <p><strong>Core Theme:</strong> ${this.esc(exec.core_theme || 'N/A')}</p>
                        <p><strong>Strategic Focus:</strong> ${this.esc(exec.strategic_focus || 'N/A')}</p>
                        <p><strong>Ecosystem Momentum:</strong> ${this.esc(exec.ecosystem_momentum || 'N/A')}</p>
                        <p><strong>Persona Shift:</strong> ${this.esc(exec.persona_shift || 'N/A')}</p>
                        <p><strong>Pricing Model:</strong> ${this.esc(exec.pricing_model_shift || 'N/A')}</p>
                    </div>
                </div>

                <!-- 2. Engineering Capacity -->
                <div class="detail-section">
                    <div class="section-title">Engineering Capacity & Output</div>
                    <div class="section-body">
                        <div class="kv-grid">
                            <div class="kv-label">Updates Shipped</div>
                            <div class="kv-value">${this.esc(String(eng.total_updates_shipped || 'N/A'))}</div>
                            <div class="kv-label">New vs Maintenance</div>
                            <div class="kv-value">${this.esc(String(eng.new_features_vs_maintenance_ratio || 'N/A'))}</div>
                            <div class="kv-label">Velocity</div>
                            <div class="kv-value">${this.esc(String(eng.velocity_assessment || 'N/A'))}</div>
                        </div>
                    </div>
                </div>

                <!-- 3. Resource Allocation -->
                <div class="detail-section">
                    <div class="section-title">Resource Allocation Breakdown</div>
                    <div class="section-body">
                        <div class="allocation-bars">${allocBars || '<p>No allocation data</p>'}</div>
                    </div>
                </div>

                <!-- 4. Intelligence Signals -->
                <div class="detail-section">
                    <div class="section-title">Intelligence Signals</div>
                    <div class="section-body">
                        <div class="kv-grid">
                            <div class="kv-label">Job Board Signals</div>
                            <div class="kv-value">${this.esc(intel.job_board_signals || 'N/A')}</div>
                            <div class="kv-label">Target Users</div>
                            <div class="kv-value">${this.esc(intel.target_users || 'N/A')}</div>
                            <div class="kv-label">Monetization</div>
                            <div class="kv-value">${this.esc(intel.monetization_approach || 'N/A')}</div>
                            <div class="kv-label">Differentiators</div>
                            <div class="kv-value">${this.esc(intel.differentiators || 'N/A')}</div>
                        </div>
                    </div>
                </div>

                <!-- 5. Securin Implications -->
                <div class="detail-section">
                    <div class="section-title">Securin Implications</div>
                    <div class="section-body">
                        ${prodImplications}
                        ${gaps ? `<p style="margin-top:12px"><strong>Gaps Exposed:</strong></p><div class="card-tags" style="margin-top:6px">${gaps}</div>` : ''}
                        ${secImpl.areas_of_focus ? `<p style="margin-top:12px"><strong>Recommended Focus Areas:</strong> ${secImpl.areas_of_focus.map(a => this.esc(a)).join(', ')}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    // ===== VIEW: SECURIN IMPLICATIONS =====
    renderImplications(data) {
        const insights = data._insights;

        if (!insights) {
            // Fall back: aggregate from individual competitors
            return this.renderImplicationsFromCompetitors(data);
        }

        // Priority matrix
        let cards = '';
        if (insights.securin_priority_matrix) {
            for (const item of insights.securin_priority_matrix) {
                const competitors = (item.competitors_ahead || []).map(c =>
                    `<span class="competitor-pill">${this.esc(c)}</span>`
                ).join('');
                cards += `
                <div class="implication-card">
                    <div class="implication-header">
                        <span class="implication-product">${this.esc(item.securin_product)}</span>
                        <span class="urgency-badge urgency-${item.urgency}">${item.urgency}</span>
                    </div>
                    <div class="implication-body">
                        <p>${this.esc(item.recommended_action)}</p>
                        ${competitors ? `<div class="implication-competitors">${competitors}</div>` : ''}
                    </div>
                </div>`;
            }
        }

        // Industry themes
        let themes = '';
        if (insights.industry_themes) {
            themes = insights.industry_themes.map(t => `<span class="tag">${this.esc(t)}</span>`).join('');
        }

        // Investment areas
        let investments = '';
        if (insights.hottest_investment_areas) {
            for (const area of insights.hottest_investment_areas) {
                const cls = area.intensity === 'high' ? 'security' : area.intensity === 'medium' ? 'integrations' : 'admin';
                investments += `<span class="tag ${cls}">${this.esc(area.area)} (${area.intensity})</span>`;
            }
        }

        return `
            <h1 class="view-title">Securin Strategic Impact</h1>
            <div class="view-subtitle">${this.formatMonth(this.currentMonth)} — What this means for Securin's next 2 quarters</div>

            ${insights.overall_threat_assessment ? `
            <div class="detail-section" style="margin-bottom:16px">
                <div class="section-title">Overall Threat Assessment</div>
                <div class="section-body"><p>${this.esc(insights.overall_threat_assessment)}</p></div>
            </div>` : ''}

            ${themes ? `
            <div class="detail-section" style="margin-bottom:16px">
                <div class="section-title">Industry Themes</div>
                <div class="section-body"><div class="card-tags">${themes}</div></div>
            </div>` : ''}

            ${investments ? `
            <div class="detail-section" style="margin-bottom:16px">
                <div class="section-title">Hottest Investment Areas</div>
                <div class="section-body"><div class="card-tags">${investments}</div></div>
            </div>` : ''}

            ${insights.talent_war_signals ? `
            <div class="detail-section" style="margin-bottom:16px">
                <div class="section-title">Talent & Hiring Signals</div>
                <div class="section-body"><p>${this.esc(insights.talent_war_signals)}</p></div>
            </div>` : ''}

            <div class="detail-section" style="margin-bottom:16px">
                <div class="section-title">Securin Product Priority Matrix</div>
                <div class="section-body">
                    <div class="implications-grid">${cards || '<p>No priority data</p>'}</div>
                </div>
            </div>
        `;
    },

    renderImplicationsFromCompetitors(data) {
        // Aggregate securin_implications from individual competitor reports
        let cards = '';
        for (const comp of this.manifest.competitors) {
            const d = data[comp.slug];
            if (!d?.securin_implications) continue;
            const impl = d.securin_implications;
            const threat = impl.threat_level || 'medium';

            let gaps = (impl.gaps_exposed || []).map(g => `<span class="tag security">${this.esc(g)}</span>`).join('');
            let focus = (impl.areas_of_focus || []).map(a => `<p>- ${this.esc(a)}</p>`).join('');

            cards += `
            <div class="implication-card">
                <div class="implication-header">
                    <span class="implication-product">${comp.name}</span>
                    <span class="urgency-badge urgency-${threat}">${threat}</span>
                </div>
                <div class="implication-body">
                    ${gaps ? `<div class="card-tags" style="margin-bottom:8px">${gaps}</div>` : ''}
                    ${focus}
                </div>
            </div>`;
        }

        return `
            <h1 class="view-title">Securin Strategic Impact</h1>
            <div class="view-subtitle">${this.formatMonth(this.currentMonth)} — Per-competitor implications (run full analysis for consolidated view)</div>
            <div class="implications-grid">${cards || this.renderEmpty('No implications data', 'Run the scraper to generate competitor analysis.')}</div>
        `;
    },

    // ===== HELPERS =====
    bucketClass(name) {
        const n = (name || '').toLowerCase();
        if (n.includes('ai') || n.includes('ml')) return 'ai';
        if (n.includes('core') || n.includes('ux') || n.includes('platform')) return 'core';
        if (n.includes('admin') || n.includes('security') || n.includes('compliance')) return 'admin';
        if (n.includes('integration') || n.includes('ecosystem') || n.includes('partner')) return 'integrations';
        if (n.includes('threat') || n.includes('detection')) return 'security';
        return 'core';
    },

    esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    truncate(str, max) {
        if (!str) return '';
        return str.length > max ? str.slice(0, max) + '...' : str;
    },
};

// Boot
document.addEventListener('DOMContentLoaded', () => app.init());
