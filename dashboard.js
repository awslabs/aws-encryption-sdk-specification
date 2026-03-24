// GitHub Dashboard JavaScript
class GitHubDashboard {
    constructor() {
        this.config = window.GitHubConfig;
        this.currentSection = 'dashboard'; // Start with dashboard
        this.currentRepository = null; // For detailed views
        this.cache = new Map();
        this.isAuthenticated = false;
        this.rateLimitInfo = null;
        this.viewMode = { 'issues': 'list', 'pull-requests': 'list' };
        
        // Dashboard data cache
        this.dashboardCache = {
            data: null,
            timestamp: null
        };
        
        // Issue filtering properties
        this.issueFilters = {
            keyword: '',
            author: '@last-reply-external',
            lastReplyTeam: null,
            sort: 'updated-desc',
            availableUsers: new Set()
        };
        
        // Pull request filtering properties
        this.pullRequestFilters = {
            keyword: '',
            author: '@external',
            sort: 'updated-desc',
            availableUsers: new Set()
        };
        
        this.init();
    }

    init() {
        // Load session token if available
        this.loadSessionToken();
        this.setupEventListeners();
        this.populateRepositorySelect();
        
        // If URL has a hash, switch to that section; otherwise load dashboard
        if (window.location.hash) {
            const section = window.location.hash.slice(1);
            if (['dashboard', 'pull-requests', 'issues', 'actions', 'duvet', 'settings'].includes(section)) {
                this.switchSection(section);
            } else {
                this.switchSection('dashboard');
            }
        } else {
            this.switchSection(this.currentSection);
        }
        
        // Update settings page with current token status
        this.updateSettingsDisplay();
    }

    loadSessionToken() {
        const token = this.config.loadSessionToken();
        if (token) {
            this.isAuthenticated = true;
            console.log('Session token loaded and ready');
        } else {
            this.isAuthenticated = false;
            console.log('No session token found, using public API');
        }
    }

    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });

        // Repository filters for detailed views
        const repoSelects = ['repositorySelect', 'issuesRepositorySelect', 'actionsRepositorySelect'];
        repoSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.addEventListener('change', (e) => {
                    this.currentRepository = e.target.value;
                    
                    // Clear filters when switching repositories
                    this.clearAllIssueFilters();
                    this.clearAllPullRequestFilters();
                    
                    // For issues and PRs, filter cached aggregate client-side
                    if (this.currentSection === 'issues' || this.currentSection === 'pull-requests') {
                        const cacheKey = `aggregate-${this.currentSection}`;
                        if (this.cache.has(cacheKey)) {
                            this.filterAggregateByRepo(this.currentSection);
                        } else {
                            this.loadSection(this.currentSection);
                        }
                    } else {
                        // Actions still requires full reload per repo
                        this.loadSection(this.currentSection);
                    }
                });
            }
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // Dashboard time range
        const timeRange = document.getElementById('dashboardTimeRange');
        if (timeRange) {
            timeRange.addEventListener('change', () => {
                if (this.currentSection === 'dashboard') this.loadDashboard();
            });
        }

        // CI date range
        const ciRange = document.getElementById('ciDateRange');
        if (ciRange) {
            ciRange.addEventListener('change', () => {
                if (this.currentSection === 'actions') this.loadDailyCI();
            });
        }

        // Handle browser back/forward
        window.addEventListener('hashchange', () => {
            const section = window.location.hash.slice(1) || 'dashboard';
            if (section !== this.currentSection) {
                this.switchSection(section);
            }
        });

        // Filter event listeners
        this.setupIssueFilterListeners();
        this.setupPullRequestFilterListeners();

        // View toggle buttons
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                const section = e.currentTarget.dataset.section;
                this.viewMode[section] = view;
                // Update active state
                e.currentTarget.closest('.view-toggle').querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                // Re-render with cached data
                this.filterAggregateByRepo(section);
            });
        });
    }

    populateRepositorySelect() {
        const selects = ['repositorySelect', 'issuesRepositorySelect', 'actionsRepositorySelect'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            
            // Clear existing options except the first one (placeholder)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }

            // For issues and PRs, add "All Repositories" as default selected option
            if (selectId === 'issuesRepositorySelect' || selectId === 'repositorySelect') {
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Repositories';
                select.appendChild(allOption);
                // Remove the disabled placeholder and select "All"
                if (select.children[0] && select.children[0].disabled) {
                    select.removeChild(select.children[0]);
                }
                allOption.selected = true;
            }

            // Add repository options
            this.config.repositories.forEach(repo => {
                const option = document.createElement('option');
                option.value = repo.id;
                option.textContent = repo.displayName;
                select.appendChild(option);
            });
        });
    }

    switchSection(section) {
        // Update navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update URL hash
        window.location.hash = section;

        // Hide all filter panels first when switching sections
        this.hideIssueFilters();
        this.hidePullRequestFilters();

        // Update section
        this.currentSection = section;
        
        // Hide all sections first
        document.querySelectorAll('.section').forEach(s => {
            s.style.display = 'none';
        });

        // Show current section - convert kebab-case to camelCase
        const sectionId = section.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase()) + 'Section';
        const sectionElement = document.getElementById(sectionId);
        if (sectionElement) {
            sectionElement.style.display = 'block';
        }

        // Clear shared elements
        this.hideLoading();
        this.hideError();
        this.hideEmptyState();

        // Load section data
        this.loadSection(section);
    }

    async loadSection(section) {
        if (section === 'dashboard') {
            await this.loadDashboard();
            return;
        }

        if (section === 'duvet') {
            // Duvet section is static, no data loading needed
            return;
        }

        if (section === 'settings') {
            return;
        }

        // Issues and PRs aggregate across all repos by default
        if (section === 'issues' || section === 'pull-requests') {
            await this.loadAggregatedSection(section);
            return;
        }

        // Actions still requires specific loading
        if (section === 'actions') {
            await this.loadDailyCI();
            return;
        }

        if (!this.currentRepository) {
            this.showRepositorySelectionState(section);
            return;
        }

        this.showLoading();
        
        try {
            let data = [];
            const repo = this.config.repositories.find(r => r.id === this.currentRepository);
            if (repo) {
                data = await this.fetchDataForRepository(section, repo);
            }

            if (section !== 'actions') {
                data.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
            }

            this.renderSectionData(section, data);
            this.updateSectionDataInfo(section, data.length);
            
        } catch (error) {
            console.error('Error loading section:', error);
            this.showError(`Failed to load ${section.replace('-', ' ')}`);
        }
    }

    async loadAggregatedSection(section) {
        // Show filters and overview sections immediately
        if (section === 'issues') {
            this.showIssueFilters();
        } else if (section === 'pull-requests') {
            this.showPullRequestFilters();
        }

        this.showLoading();

        try {
            // Fetch all repos in parallel, using per-repo cache
            const allData = await this.fetchAllReposForSection(section);

            // Store the aggregate for client-side filtering
            const cacheKey = `aggregate-${section}`;

            // Enrich issues with comment data for "last reply from team" filter
            if (section === 'issues') {
                const enriched = await this.enrichIssuesWithComments(allData);
                this.cache.set(cacheKey, { data: enriched, timestamp: Date.now() });
            } else {
                this.cache.set(cacheKey, { data: allData, timestamp: Date.now() });
            }

            // Filter by selected repo if one is chosen
            let data = this.cache.get(cacheKey).data;
            if (this.currentRepository && this.currentRepository !== 'all') {
                data = allData.filter(item => item.repository && item.repository.id === this.currentRepository);
            }

            // Apply section-specific filtering and sorting
            if (section === 'issues') {
                this.extractUsersFromIssues(data);
                data = this.filterAndSortIssues(data);
            } else if (section === 'pull-requests') {
                this.extractUsersFromPullRequests(data);
                data = this.filterAndSortPullRequests(data);
            }

            this.renderSectionData(section, data);
            this.updateSectionDataInfo(section, data.length);

        } catch (error) {
            console.error('Error loading section:', error);
            this.showError(`Failed to load ${section.replace('-', ' ')}`);
        }
    }

    async fetchAllReposForSection(section) {
        const cacheDuration = this.getCacheDuration();
        const cacheKey = `aggregate-${section}`;

        // Check aggregate cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < cacheDuration) {
                return cached.data;
            }
        }

        // Fetch all repos in parallel
        const promises = this.config.repositories.map(repo =>
            this.fetchDataForRepository(section, repo).catch(err => {
                console.error(`Error fetching ${section} for ${repo.name}:`, err);
                return [];
            })
        );

        const results = await Promise.all(promises);
        return results.flat();
    }

    async enrichIssuesWithComments(issues) {
        const teamUsernames = ALL_CRYPTO_TOOLS_USERNAMES.map(u => u.toLowerCase());
        const enriched = await Promise.all(issues.map(async (issue) => {
            if (issue.comments === 0) {
                return { ...issue, lastReplyIsFromTeam: false };
            }
            // Check cache first
            const cacheKey = `comments-${issue.repository?.owner}/${issue.repository?.name}#${issue.number}`;
            if (this.cache.has(cacheKey)) {
                return { ...issue, ...this.cache.get(cacheKey).data };
            }
            try {
                const url = `${this.config.apiBase}/repos/${issue.repository.owner}/${issue.repository.name}/issues/${issue.number}/comments?per_page=100`;
                const response = await this.fetchFromGitHubRaw(url);
                const comments = response.data || [];
                let lastReplyIsFromTeam = false;
                for (let i = comments.length - 1; i >= 0; i--) {
                    if (comments[i].user) {
                        lastReplyIsFromTeam = teamUsernames.includes(comments[i].user.login.toLowerCase());
                        break;
                    }
                }
                this.cache.set(cacheKey, { data: { lastReplyIsFromTeam }, timestamp: Date.now() });
                return { ...issue, lastReplyIsFromTeam };
            } catch (err) {
                console.error(`Error fetching comments for ${issue.number}:`, err);
                return { ...issue, lastReplyIsFromTeam: false };
            }
        }));
        return enriched;
    }

    filterAggregateByRepo(section) {
        // Use cached aggregate data and filter client-side — no new API calls
        const cacheKey = `aggregate-${section}`;
        if (!this.cache.has(cacheKey)) return;

        const allData = this.cache.get(cacheKey).data;

        let data = allData;
        if (this.currentRepository && this.currentRepository !== 'all') {
            data = allData.filter(item => item.repository && item.repository.id === this.currentRepository);
        }

        if (section === 'issues') {
            this.showIssueFilters();
            this.extractUsersFromIssues(data);
            data = this.filterAndSortIssues(data);
        } else if (section === 'pull-requests') {
            this.showPullRequestFilters();
            this.extractUsersFromPullRequests(data);
            data = this.filterAndSortPullRequests(data);
        }

        this.renderSectionData(section, data);
        this.updateSectionDataInfo(section, data.length);
    }

    async loadDashboard() {
            this.showLoading();

            try {
                const teamUsernames = ALL_CRYPTO_TOOLS_USERNAMES.map(u => u.toLowerCase());
                const days = parseInt(document.getElementById('dashboardTimeRange')?.value || '7');
                const cutoff = new Date(Date.now() - days * 86400000);

                // Fetch issues and PRs for all repos in parallel
                const [allIssues, allPRs] = await Promise.all([
                    this.fetchAllReposForSection('issues'),
                    this.fetchAllReposForSection('pull-requests')
                ]);

                // Enrich issues with comment data
                const enrichedIssues = await this.enrichIssuesWithComments(allIssues);

                // Cache aggregates for other pages
                this.cache.set('aggregate-issues', { data: enrichedIssues, timestamp: Date.now() });
                this.cache.set('aggregate-pull-requests', { data: allPRs, timestamp: Date.now() });

                // External issues updated in time range
                const newExternalIssues = enrichedIssues.filter(i => {
                    const isTeam = teamUsernames.includes(i.user.login.toLowerCase());
                    return !isTeam && new Date(i.updated_at) >= cutoff;
                }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

                // External PRs updated in time range (not dependabot, not team, not draft)
                const newExternalPRs = allPRs.filter(pr => {
                    const login = pr.user.login.toLowerCase();
                    const isDep = login === 'dependabot[bot]' || login === 'dependabot';
                    const isTeam = teamUsernames.includes(login);
                    return !isDep && !isTeam && !pr.draft && new Date(pr.updated_at) >= cutoff;
                }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

                // Pre-fetch CI runs (caches for Daily CI page) and get failures
                await this.fetchAllCIRuns(90);
                const ciFailures = await this.fetchWeeklyCIFailures(days);

                // Update stats
                document.getElementById('statExternalIssues').textContent = newExternalIssues.length;
                document.getElementById('statExternalPRs').textContent = newExternalPRs.length;
                document.getElementById('statFailedCI').textContent = ciFailures.length;

                // Render new external issues
                const issuesList = document.getElementById('dashNewIssuesList');
                issuesList.innerHTML = newExternalIssues.map(i => `
                    <div class="dash-item">
                        <div class="dash-item-title">
                            <a href="${i.html_url}" target="_blank">${this.escapeHtml(i.title)}</a>
                            <div class="dash-item-meta">#${i.number} · ${i.user.login} · updated ${this.formatDate(i.updated_at)} · ${i.comments || 0} comments</div>
                        </div>
                        <div class="dash-item-repo">${i.repository?.displayName || ''}</div>
                    </div>
                `).join('');

                // Render new external PRs
                const prsList = document.getElementById('dashNewPRsList');
                prsList.innerHTML = newExternalPRs.map(pr => `
                    <div class="dash-item">
                        <div class="dash-item-title">
                            <a href="${pr.html_url}" target="_blank">${this.escapeHtml(pr.title)}</a>
                            <div class="dash-item-meta">#${pr.number} · ${pr.user.login} · updated ${this.formatDate(pr.updated_at)}</div>
                        </div>
                        <div class="dash-item-repo">${pr.repository?.displayName || ''}</div>
                    </div>
                `).join('');

                // Update CI range label
                const ciRangeLabel = document.getElementById('dashCIRangeLabel');
                if (ciRangeLabel) ciRangeLabel.textContent = `last ${days} days`;

                // Render CI failures summary
                const ciList = document.getElementById('dashFailedCIList');
                ciList.innerHTML = ciFailures.map(r => `
                    <div class="dash-item">
                        <div class="dash-item-title">
                            <a href="https://github.com/${r.owner}/${r.name}/actions" target="_blank">${r.owner}/${r.name}</a>
                            <div class="dash-item-meta">${r.failureCount} failure${r.failureCount > 1 ? 's' : ''} / ${r.totalCount} runs this week · last failure ${this.formatDate(r.lastFailureDate)}</div>
                        </div>
                        <div class="dash-item-status failure">${r.failureRate}% failing</div>
                    </div>
                `).join('');

                document.getElementById('dashboardLastUpdated').textContent = new Date().toLocaleTimeString();
                this.hideLoading();
                this.hideError();
                this.hideEmptyState();

            } catch (error) {
                console.error('Error loading dashboard:', error);
                this.showError('Failed to load dashboard');
            }
        }

        async fetchCIStatus() {
                const results = [];
                const promises = this.config.repositories.filter(r => r.badgeWorkflows && r.badgeWorkflows.length > 0).map(async repo => {
                    try {
                        const url = `${this.config.apiBase}/repos/${repo.owner}/${repo.name}/actions/runs?per_page=5&status=completed`;
                        const response = await this.fetchFromGitHubRaw(url);
                        const runs = response.data?.workflow_runs || [];
                        const seen = new Set();
                        for (const run of runs) {
                            if (!seen.has(run.name)) {
                                seen.add(run.name);
                                results.push({
                                    repoName: repo.displayName,
                                    workflowName: run.name,
                                    failed: run.conclusion === 'failure',
                                    url: run.html_url,
                                    updatedAt: run.updated_at
                                });
                            }
                        }
                    } catch (err) {
                        console.error(`Error fetching CI for ${repo.name}:`, err);
                    }
                });
                await Promise.all(promises);
                return results;
            }
        async fetchAllCIRuns(days = 90) {
            const cacheKey = `ci-runs-${days}`;
            const cacheDuration = this.getCacheDuration();
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < cacheDuration) return cached.data;
            }

            const startDate = new Date(Date.now() - days * 86400000);
            const endDate = new Date();
            endDate.setUTCDate(endDate.getUTCDate() + 1);
            const repos = this.config.repositories.filter(r => r.badgeWorkflows && r.badgeWorkflows.length > 0);

            const results = await Promise.all(repos.map(async repo => {
                const workflowFile = repo.badgeWorkflows[0] + '.yml';
                try {
                    let runs = [];
                    let page = 1;
                    while (page <= 10) {
                        const url = `${this.config.apiBase}/repos/${repo.owner}/${repo.name}/actions/workflows/${workflowFile}/runs?per_page=100&page=${page}&event=schedule`;
                        const response = await this.fetchFromGitHubRaw(url);
                        const wfRuns = response.data?.workflow_runs || [];
                        if (!wfRuns.length) break;
                        const filtered = wfRuns.filter(r => new Date(r.created_at) >= startDate && new Date(r.created_at) < endDate);
                        runs.push(...filtered);
                        if (filtered.length < wfRuns.length) break;
                        page++;
                    }
                    return { repo, runs };
                } catch (err) {
                    console.error(`Error fetching CI for ${repo.name}:`, err);
                    return { repo, runs: [] };
                }
            }));

            this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        }
        async fetchWeeklyCIFailures(days = 7) {
                const cutoff = new Date(Date.now() - days * 86400000);
                // Reuse the shared CI cache — fetch at least as many days as needed
                const allResults = await this.fetchAllCIRuns(Math.max(days, 60));
                const results = [];

                for (const { repo, runs } of allResults) {
                    const weekRuns = runs.filter(r => new Date(r.created_at) >= cutoff);
                    const failures = weekRuns.filter(r => r.conclusion === 'failure');
                    if (failures.length > 0) {
                        const failureRate = ((failures.length / weekRuns.length) * 100).toFixed(0);
                        results.push({
                            owner: repo.owner,
                            name: repo.name,
                            displayName: repo.displayName,
                            totalCount: weekRuns.length,
                            failureCount: failures.length,
                            failureRate,
                            lastFailureDate: failures[0].created_at
                        });
                    }
                }

                results.sort((a, b) => b.failureRate - a.failureRate);
                return results;
            }

            async loadDailyCI() {
                    this.showLoading();
                    const days = parseInt(document.getElementById('ciDateRange')?.value || '60');
                    const startDate = new Date(Date.now() - days * 86400000);
                    const endDate = new Date();
                    endDate.setUTCDate(endDate.getUTCDate() + 1);

                    // Use shared CI run cache
                    const results = await this.fetchAllCIRuns(days);

                    const repoResults = results.map(({ repo, runs }) => {
                        // Filter to the requested date range (cache may have wider range)
                        const filtered = runs.filter(r => new Date(r.created_at) >= startDate && new Date(r.created_at) < endDate);
                        const success = filtered.filter(r => r.conclusion === 'success').length;
                        const failure = filtered.filter(r => r.conclusion === 'failure').length;
                        const completed = filtered.filter(r => r.status !== 'in_progress' && r.status !== 'queued').length;
                        const total = filtered.length;
                        const rate = completed ? ((success / completed) * 100).toFixed(1) : 0;
                        return { repo, runs: filtered, success, failure, total, rate: parseFloat(rate) };
                    }).sort((a, b) => a.rate - b.rate);

                    const container = document.getElementById('ciRepoResults');
                    container.innerHTML = repoResults.map(({ repo, runs, success, failure, total, rate }) => {
                        const dayMap = {};
                        runs.forEach(run => {
                            const dateStr = new Date(run.created_at).toISOString().split('T')[0];
                            if (!dayMap[dateStr]) dayMap[dateStr] = [];
                            dayMap[dateStr].push(run);
                        });

                        let timeline = '';
                        const cur = new Date(startDate);
                        while (cur < endDate) {
                            const dateStr = cur.toISOString().split('T')[0];
                            const dayRuns = dayMap[dateStr] || [];
                            let cls = 'none', onclick = '', title = `${cur.toLocaleDateString()}: no runs`;
                            if (dayRuns.length > 0) {
                                const hasSuccess = dayRuns.some(r => r.conclusion === 'success');
                                const hasFailure = dayRuns.some(r => r.conclusion && r.conclusion !== 'success');
                                const allInProgress = dayRuns.every(r => r.status === 'in_progress' || r.status === 'queued');
                                if (allInProgress) cls = 'in-progress';
                                else if (hasSuccess && !hasFailure) cls = 'success';
                                else if (hasFailure) cls = 'failure';
                                else cls = 'in-progress';
                                onclick = `onclick="window.open('${dayRuns[0].html_url}','_blank')"`;
                                title = `${cur.toLocaleDateString()}: ${dayRuns.length} run(s) - ${cls}`;
                            }
                            timeline += `<div class="ci-day ${cls}" title="${title}" ${onclick}></div>`;
                            cur.setUTCDate(cur.getUTCDate() + 1);
                        }

                        const repoId = `${repo.owner}-${repo.name}`.replace(/[^a-zA-Z0-9-]/g, '');
                        const rateClass = rate >= 90 ? 'good' : 'bad';
                        const runsTable = runs.slice(0, 30).map(run => {
                            const isRunning = run.status === 'in_progress' || run.status === 'queued';
                            const conclusion = isRunning ? 'in progress' : (run.conclusion || 'failed');
                            const cls = run.conclusion === 'success' ? 'ci-run-success' : isRunning ? 'ci-run-in-progress' : 'ci-run-failure';
                            return `<tr><td>${new Date(run.created_at).toLocaleString()}</td><td class="${cls}">${conclusion}</td><td><a href="${run.html_url}" target="_blank">View</a></td></tr>`;
                        }).join('');

                        return `<div class="ci-repo-section" id="ci-${repoId}">
                            <div class="ci-repo-header" onclick="document.getElementById('ci-${repoId}').classList.toggle('expanded')">
                                <div class="ci-repo-info">
                                    <span class="ci-repo-name">${repo.owner}/${repo.name}</span>
                                    <span class="ci-repo-rate ${rateClass}">(${rate}%)</span>
                                </div>
                                <div class="ci-timeline">${timeline}</div>
                                <span class="ci-repo-toggle">▼</span>
                            </div>
                            <div class="ci-repo-details">
                                <div class="ci-metrics-row">
                                    <div class="ci-metric-card"><div class="ci-metric-card-label">Total Runs</div><div class="ci-metric-card-value">${total}</div></div>
                                    <div class="ci-metric-card"><div class="ci-metric-card-label">Success Rate</div><div class="ci-metric-card-value ${rateClass === 'good' ? 'ci-success' : 'ci-failure'}">${rate}%</div></div>
                                    <div class="ci-metric-card"><div class="ci-metric-card-label">Successes</div><div class="ci-metric-card-value ci-success">${success}</div></div>
                                    <div class="ci-metric-card"><div class="ci-metric-card-label">Failures</div><div class="ci-metric-card-value ci-failure">${failure}</div></div>
                                </div>
                                <table class="ci-runs-table"><thead><tr><th>Date</th><th>Conclusion</th><th>Link</th></tr></thead><tbody>${runsTable}</tbody></table>
                            </div>
                        </div>`;
                    }).join('');

                    document.getElementById('actionsDataCount').textContent = `${results.length} repos`;
                    document.getElementById('actionsLastUpdated').textContent = new Date().toLocaleTimeString();
                    this.hideLoading();
                    this.hideError();
                    this.hideEmptyState();
                }

    async fetchMergedPRsLastWeek(repository) {
        // Calculate date for one week ago
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const since = oneWeekAgo.toISOString();

        const url = `${this.config.apiBase}/repos/${repository.owner}/${repository.name}/pulls?state=closed&sort=updated&direction=desc&since=${since}&per_page=100`;
        const data = await this.fetchAllPages(url);

        // Filter to only merged PRs from the last week
        return data.filter(pr => {
            if (!pr.merged_at) return false;
            const mergedDate = new Date(pr.merged_at);
            return mergedDate >= oneWeekAgo;
        });
    }

    renderDashboard(dashboardData) {
        // Create shields.io badge table
        this.createBadgeTable();

        // Update last updated time
        document.getElementById('dashboardLastUpdated').textContent = new Date().toLocaleTimeString();

        this.hideLoading();
        this.hideError();
        this.hideEmptyState();
    }

    createBadgeTable() {
        const container = document.getElementById('badgeTableContainer');
        
        const tableHTML = `
            <div class="badge-table-wrapper">
                <table class="badge-table" id="badgeTable">
                    <thead>
                        <tr>
                            <th>Repository</th>
                            <th>Open Issues</th>
                            <th>Open Pull Requests</th>
                            <th>Daily CI Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.config.repositories.map(repo => {
                            // Generate DailyCI Status badge
                            let dailyCIBadge = '';
                            if (repo.badgeWorkflows && repo.badgeWorkflows.length > 0) {
                                // Find Daily CI workflow (prioritize exact match, then partial)
                                const dailyCIWorkflow = repo.badgeWorkflows.find(w => 
                                    w.toLowerCase() === 'daily ci' || 
                                    w.toLowerCase().includes('daily') || 
                                    w.toLowerCase().includes('ci')
                                ) || repo.workflows[0]; // Fallback to first workflow
                                
                                // Convert workflow name to filename (replace spaces with hyphens, add .yml)
                                const workflowFile = dailyCIWorkflow.toLowerCase().replace(/\s+/g, '-') + '.yml';
                                console.log(repo.name + " " + workflowFile);
                                
                                dailyCIBadge = `
                                    <a href="https://github.com/${repo.owner}/${repo.name}/actions" 
                                       target="_blank" 
                                       rel="noopener noreferrer"
                                       title="View GitHub Actions for ${repo.displayName}">
                                        <img src="https://img.shields.io/github/actions/workflow/status/${repo.owner}/${repo.name}/${workflowFile}?style=flat&label=CI" 
                                             alt="Daily CI Status for ${repo.displayName}" 
                                             loading="lazy"
                                             onload="this.classList.add('loaded')"
                                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCA4MCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjOTk5Ii8+Cjx0ZXh0IHg9IjQwIiB5PSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNmZmYiPk4vQTwvdGV4dD4KPHN2Zz4K'" />
                                    </a>
                                `;
                            } else {
                                // No workflows configured - show N/A badge (still link to actions page)
                                dailyCIBadge = `
                                    <a href="https://github.com/${repo.owner}/${repo.name}/actions" 
                                       target="_blank" 
                                       rel="noopener noreferrer"
                                       title="View GitHub Actions for ${repo.displayName}">
                                        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCA4MCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjOTk5Ii8+Cjx0ZXh0IHg9IjQwIiB5PSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNmZmYiPk4vQTwvdGV4dD4KPHN2Zz4K" 
                                             alt="NA" 
                                             loading="lazy"
                                             onload="this.classList.add('loaded')" />
                                    </a>
                                `;
                            }
                            
                            return `
                                <tr>
                                    <td class="repo-name">${repo.displayName}</td>
                                    <td class="badge-cell">
                                        <a href="https://github.com/${repo.owner}/${repo.name}/issues" 
                                           target="_blank" 
                                           rel="noopener noreferrer"
                                           title="View open issues for ${repo.displayName} on GitHub">
                                            <img src="https://img.shields.io/github/issues/${repo.owner}/${repo.name}?style=flat" 
                                                 alt="Open Issues for ${repo.displayName}" 
                                                 loading="lazy"
                                                 onload="this.classList.add('loaded')"
                                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCA4MCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjY2NjIi8+Cjx0ZXh0IHg9IjQwIiB5PSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNmZmYiPkVycm9yPC90ZXh0Pgo8L3N2Zz4K'" />
                                        </a>
                                    </td>
                                    <td class="badge-cell">
                                        <a href="https://github.com/${repo.owner}/${repo.name}/pulls" 
                                           target="_blank" 
                                           rel="noopener noreferrer"
                                           title="View open pull requests for ${repo.displayName} on GitHub">
                                            <img src="https://img.shields.io/github/issues-pr/${repo.owner}/${repo.name}?style=flat&label=PRs" 
                                                 alt="Open Pull Requests for ${repo.displayName}" 
                                                 loading="lazy"
                                                 onload="this.classList.add('loaded')"
                                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCA4MCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjY2NjIi8+Cjx0ZXh0IHg9IjQwIiB5PSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNmZmYiPkVycm9yPC90ZXh0Pgo8L3N2Zz4K'" />
                                        </a>
                                    </td>
                                    <td class="badge-cell">
                                        ${dailyCIBadge}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = tableHTML;
        
        // Add dynamic table functionality
        this.enhanceBadgeTable();
    }

    enhanceBadgeTable() {
        const table = document.getElementById('badgeTable');
        if (!table) return;

        // Add responsive behavior
        this.makeTableResponsive(table);
        
        // Add loading states and error handling
        this.enhanceBadgeImages(table);
        
        // Optimize column widths
        this.optimizeTableLayout(table);
    }

    makeTableResponsive(table) {
        // Add resize observer to handle dynamic layout changes
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                this.optimizeTableLayout(table);
            });
            resizeObserver.observe(table);
        }
        
        // Handle window resize for older browsers
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.optimizeTableLayout(table);
            }, 150);
        });
    }

    enhanceBadgeImages(table) {
        const images = table.querySelectorAll('img');
        
        images.forEach(img => {
            // Add loading indicator
            img.style.opacity = '0.5';
            img.style.transition = 'opacity 0.3s ease';
            
            // Handle successful load
            img.addEventListener('load', () => {
                img.style.opacity = '1';
                img.classList.add('loaded');
            });
            
            // Handle error with retry mechanism
            img.addEventListener('error', () => {
                if (!img.hasAttribute('data-retried')) {
                    img.setAttribute('data-retried', 'true');
                    // Retry after 2 seconds
                    setTimeout(() => {
                        const originalSrc = img.src.split('?')[0]; // Remove any query params
                        img.src = `${originalSrc}?retry=${Date.now()}`;
                    }, 2000);
                }
            });
        });
    }

    optimizeTableLayout(table) {
        if (!table) return;
        
        const container = table.closest('.badge-table-wrapper') || table.parentElement;
        const containerWidth = container.offsetWidth;
        
        // Dynamic column sizing based on container width
        if (containerWidth < 600) {
            // Mobile: Stack badges vertically or make them smaller
            table.classList.add('compact-mode');
            // On mobile, use a simpler layout with smaller fixed widths
            table.style.setProperty('--repo-column-width', '140px');
            table.style.setProperty('--badge-column-width', 'auto');
        } else {
            table.classList.remove('compact-mode');
            
            // Calculate optimal repository column width
            const optimalRepoWidth = this.calculateOptimalRepositoryColumnWidth();
            
            // Calculate remaining space for badge columns
            const reservedSpace = 100; // Reserve space for borders, padding, etc.
            const availableWidth = containerWidth - optimalRepoWidth - reservedSpace;
            const badgeColumnWidth = Math.max(100, Math.floor(availableWidth / 3)); // Three badge columns
            
            // Apply dynamic styles with smooth transitions
            table.style.setProperty('--repo-column-width', `${optimalRepoWidth}px`);
            table.style.setProperty('--badge-column-width', `${badgeColumnWidth}px`);
            
            // Add transition class for smooth width changes
            table.classList.add('optimizing');
            
            // Remove the transition class after animation completes
            setTimeout(() => {
                table.classList.remove('optimizing');
            }, 300);
        }
        
        // Ensure table maintains good proportions
        this.validateTableProportions(table, containerWidth);
    }

    validateTableProportions(table, containerWidth) {
        // Ensure the table doesn't exceed container width and maintains good UX
        const repoWidth = parseInt(table.style.getPropertyValue('--repo-column-width') || '140');
        const badgeWidth = parseInt(table.style.getPropertyValue('--badge-column-width') || '100');
        const totalEstimatedWidth = repoWidth + (badgeWidth * 3) + 60; // Add margin for borders/padding
        
        if (totalEstimatedWidth > containerWidth * 0.95) {
            // If table would be too wide, scale it down proportionally
            const scaleFactor = (containerWidth * 0.95) / totalEstimatedWidth;
            const newRepoWidth = Math.floor(repoWidth * scaleFactor);
            const newBadgeWidth = Math.floor(badgeWidth * scaleFactor);
            
            table.style.setProperty('--repo-column-width', `${newRepoWidth}px`);
            table.style.setProperty('--badge-column-width', `${newBadgeWidth}px`);
        }
    }

    getTextWidth(text, element) {
        // Create a temporary element to measure text width
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Get computed styles from the element or use defaults
        if (element) {
            const computedStyle = window.getComputedStyle(element);
            context.font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;
        } else {
            // Use default font settings for badge table repository names
            context.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        }
        
        return Math.ceil(context.measureText(text).width);
    }

    calculateOptimalRepositoryColumnWidth() {
        // Calculate the optimal width for repository name column based on content
        let maxWidth = 0;
        let minWidth = 140; // Minimum usable width
        let maxAllowedWidth = 300; // Maximum width to prevent excessive column size
        
        // Check if we have a cached result that's still valid
        if (this.repositoryColumnCache && 
            this.repositoryColumnCache.timestamp > Date.now() - 30000) { // Cache for 30 seconds
            return this.repositoryColumnCache.width;
        }
        
        // Calculate width needed for each repository name
        this.config.repositories.forEach(repo => {
            const textWidth = this.getTextWidth(repo.displayName);
            maxWidth = Math.max(maxWidth, textWidth);
        });
        
        // Add padding (32px total - 16px each side)
        const paddingWidth = 32;
        const calculatedWidth = maxWidth + paddingWidth;
        
        // Apply constraints
        const finalWidth = Math.max(minWidth, Math.min(maxAllowedWidth, calculatedWidth));
        
        // Cache the result
        this.repositoryColumnCache = {
            width: finalWidth,
            timestamp: Date.now()
        };
        
        return finalWidth;
    }

    async fetchDataForRepository(section, repository) {
        const cacheKey = `${section}-${repository.id}`;
        
        // Determine cache duration based on authentication status
        const cacheDuration = this.getCacheDuration();
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < cacheDuration) {
                return cached.data;
            }
        }

        let url;
        let data = [];

        try {
            switch (section) {
                case 'pull-requests':
                    url = `${this.config.apiBase}/repos/${repository.owner}/${repository.name}/pulls?state=open&per_page=100`;
                    data = await this.fetchAllPages(url);
                    break;
                
                case 'issues':
                    url = `${this.config.apiBase}/repos/${repository.owner}/${repository.name}/issues?state=open&per_page=100`;
                    const allIssues = await this.fetchAllPages(url);
                    // Filter out pull requests from issues (GitHub API returns both)
                    data = allIssues.filter(issue => !issue.pull_request);
                    break;
                
                case 'actions':
                    // Check if workflows are configured for this repository
                    if (!repository.workflows || repository.workflows.length === 0) {
                        // No workflows configured - return empty array, don't make API call
                        data = [];
                        break;
                    }
                    
                    url = `${this.config.apiBase}/repos/${repository.owner}/${repository.name}/actions/runs?per_page=100`;
                    const runs = await this.fetchAllPages(url);
                    const allRuns = runs.workflow_runs ? runs : { workflow_runs: runs };
                    
                    // Filter workflow runs by configured workflow names (case-insensitive)
                    const configuredWorkflows = repository.workflows.map(w => w.toLowerCase());
                    data = (allRuns.workflow_runs || runs).filter(run => 
                        run.name && configuredWorkflows.includes(run.name.toLowerCase())
                    );
                    
                    // Limit actions to recent runs to avoid performance issues
                    data = data.slice(0, 50);
                    
                    // Enhanced sorting: first by date (newest), then by workflow name (alphabetical)
                    data.sort((a, b) => {
                        // Primary sort: by created_at date (newest first)
                        const dateComparison = new Date(b.created_at) - new Date(a.created_at);
                        
                        // If dates are very close (within 1 hour), use workflow name as secondary sort
                        if (Math.abs(dateComparison) < 3600000) { // 1 hour in milliseconds
                            return (a.name || '').localeCompare(b.name || '');
                        }
                        
                        return dateComparison;
                    });
                    break;
            }

            // Add repository info to each item
            data = data.map(item => ({
                ...item,
                repository: repository
            }));

            // Cache the results
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            return data;
            
        } catch (error) {
            console.error(`Error fetching ${section} for ${repository.name}:`, error);
            return [];
        }
    }

    async fetchAllPages(baseUrl) {
        let allData = [];
        let url = baseUrl;
        let pageCount = 0;
        const maxPages = 10; // Safety limit to prevent infinite loops

        try {
            while (url && pageCount < maxPages) {
                console.log(`Fetching page ${pageCount + 1} from: ${url}`);
                
                const response = await this.fetchFromGitHubRaw(url);
                const data = response.data;
                
                // Handle different response formats
                if (Array.isArray(data)) {
                    allData = allData.concat(data);
                } else if (data.workflow_runs) {
                    // GitHub Actions API returns wrapped data
                    allData = allData.concat(data.workflow_runs);
                } else {
                    // Fallback: assume it's an array or convert to array
                    allData = allData.concat(Array.isArray(data) ? data : [data]);
                }

                // Check for next page in Link header
                const linkHeader = response.linkHeader;
                url = this.getNextPageUrl(linkHeader);
                pageCount++;

                // If we got less than per_page items, we're at the end
                if (Array.isArray(data) && data.length < 100) {
                    break;
                } else if (data.workflow_runs && data.workflow_runs.length < 100) {
                    break;
                }
            }

            console.log(`Fetched ${allData.length} items across ${pageCount} pages`);
            return allData;

        } catch (error) {
            console.error('Error in fetchAllPages:', error);
            return allData; // Return what we've got so far
        }
    }

    async fetchFromGitHubRaw(url) {
        // Build headers conditionally based on token availability
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Dashboard'
        };

        // Add authorization header only if token is available
        if (this.config && this.config.token) {
            headers['Authorization'] = `token ${this.config.token}`;
            this.isAuthenticated = true;
        } else {
            this.isAuthenticated = false;
        }

        const response = await fetch(url, { headers });

        // Parse rate limit information from response headers
        this.rateLimitInfo = {
            limit: parseInt(response.headers.get('X-RateLimit-Limit')) || 0,
            remaining: parseInt(response.headers.get('X-RateLimit-Remaining')) || 0,
            reset: parseInt(response.headers.get('X-RateLimit-Reset')) || 0,
            used: parseInt(response.headers.get('X-RateLimit-Used')) || 0
        };

        this.updateRateLimitDisplay();

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid GitHub token. Please check your configuration.');
            } else if (response.status === 403) {
                const resetTime = new Date(this.rateLimitInfo.reset * 1000);
                const message = this.isAuthenticated 
                    ? `API rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}.`
                    : `Rate limit exceeded (60 requests/hour for unauthenticated requests). Resets at ${resetTime.toLocaleTimeString()}. Consider adding a GitHub token for 5000 requests/hour.`;
                throw new Error(message);
            } else {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }
        }

        const data = await response.json();
        const linkHeader = response.headers.get('Link');

        return {
            data,
            linkHeader
        };
    }

    getNextPageUrl(linkHeader) {
        if (!linkHeader) return null;

        // Parse the Link header to find the "next" URL
        // Link header format: <url>; rel="next", <url>; rel="last"
        const links = linkHeader.split(',');
        
        for (const link of links) {
            const parts = link.trim().split(';');
            if (parts.length >= 2) {
                const url = parts[0].trim().replace(/^<|>$/g, ''); // Remove < >
                const rel = parts[1].trim();
                
                if (rel.includes('rel="next"')) {
                    return url;
                }
            }
        }
        
        return null;
    }

    async fetchFromGitHub(url) {
        const result = await this.fetchFromGitHubRaw(url);
        return result.data;
    }

    renderData(section, data) {
        const container = document.getElementById('contentGrid');
        
        if (data.length === 0) {
            this.showEmptyState(section);
            return;
        }

        container.innerHTML = '';
        
        // Apply actions-layout class for GitHub Actions to use row-based layout
        if (section === 'actions') {
            container.classList.add('actions-layout');
            this.renderActionsWithSections(container, data);
        } else {
            container.classList.remove('actions-layout');
            data.forEach(item => {
                const card = this.createCard(section, item);
                container.appendChild(card);
            });
        }

        this.hideLoading();
        this.hideError();
        this.hideEmptyState();
    }

    createCard(section, item) {
        const card = document.createElement('div');
        card.className = 'card';

        switch (section) {
            case 'pull-requests':
                card.innerHTML = this.createPullRequestCard(item);
                break;
            case 'issues':
                card.innerHTML = this.createIssueCard(item);
                break;
            case 'actions':
                card.innerHTML = this.createActionCard(item);
                break;
        }

        return card;
    }

    createListItem(section, item) {
        const el = document.createElement('div');
        el.className = 'card';

        const labels = (item.labels || []).map(label =>
            `<span class="gh-label" style="background-color: #${label.color}30; color: #${label.color}; border: 1px solid #${label.color}50;">${label.name}</span>`
        ).join('');

        const repoName = item.repository?.displayName || '';
        const body = item.body ? (typeof marked !== 'undefined' ? marked.parse(item.body) : this.escapeHtml(item.body)) : '<em>No description</em>';
        const commentCount = item.comments || 0;
        const isDraft = section === 'pull-requests' && item.draft;

        let line2 = '';
        if (section === 'pull-requests') {
            const suffix = isDraft ? ' · Draft' : ' · Review required';
            line2 = `#${item.number} opened ${this.formatDate(item.created_at)} by ${item.user.login}${suffix}`;
        } else {
            line2 = `#${item.number} · ${item.user.login} opened on ${this.formatDateFull(item.created_at)} · Updated on ${this.formatDateFull(item.updated_at)}`;
        }

        el.innerHTML = `
            <div class="list-item-toggle">
                <div class="gh-list-line1">
                    <div class="gh-list-title-area">
                        <a href="${item.html_url}" target="_blank" onclick="event.stopPropagation()" class="gh-list-title">${this.escapeHtml(item.title)}</a>
                        ${labels}
                    </div>
                    ${commentCount > 0 ? `<span class="gh-list-comments">💬 ${commentCount}</span>` : ''}
                    <span class="card-expand-icon">▶</span>
                </div>
                <div class="gh-list-line2">
                    ${line2}
                    <span class="gh-list-repo">${this.escapeHtml(repoName)}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="card-body-content markdown-body">${body}</div>
                <a href="${item.html_url}" target="_blank" class="card-body-link">View on GitHub →</a>
            </div>
        `;

        return el;
    }

    createPullRequestCard(pr) {
        const statusClass = pr.draft ? 'status-draft' : 'status-open';
        const statusText = pr.draft ? 'Draft' : 'Open';
        const body = pr.body ? (typeof marked !== 'undefined' ? marked.parse(pr.body) : this.escapeHtml(pr.body)) : '<em>No description</em>';
        
        return `
            <div class="card-header card-toggle">
                <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="18" r="3"/>
                    <circle cx="6" cy="6" r="3"/>
                    <path d="M18 6V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1"/>
                    <path d="M6 9v9"/>
                    <path d="M18 9v3"/>
                </svg>
                <div class="card-content">
                    <h3 class="card-title">
                        <a href="${pr.html_url}" target="_blank" onclick="event.stopPropagation()">${this.escapeHtml(pr.title)}</a>
                    </h3>
                    <div class="card-meta">
                        #${pr.number} by ${pr.user.login} • ${this.formatDate(pr.created_at)} • ${pr.repository.displayName}
                    </div>
                </div>
                <span class="card-expand-icon">▶</span>
            </div>
            <div class="card-body">
                <div class="card-body-content markdown-body">${body}</div>
                <a href="${pr.html_url}" target="_blank" class="card-body-link">View on GitHub →</a>
            </div>
            <div class="card-footer">
                <div class="card-labels">
                    <span class="label ${statusClass}">${statusText}</span>
                    ${pr.labels ? pr.labels.map(label => 
                        `<span class="label" style="background-color: #${label.color}20; color: #${label.color};">${label.name}</span>`
                    ).join('') : ''}
                </div>
            </div>
        `;
    }

    createIssueCard(issue) {
        const body = issue.body ? (typeof marked !== 'undefined' ? marked.parse(issue.body) : this.escapeHtml(issue.body)) : '<em>No description</em>';
        
        return `
            <div class="card-header card-toggle">
                <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6"/>
                    <path d="M12 16h.01"/>
                </svg>
                <div class="card-content">
                    <h3 class="card-title">
                        <a href="${issue.html_url}" target="_blank" onclick="event.stopPropagation()">${this.escapeHtml(issue.title)}</a>
                    </h3>
                    <div class="card-meta">
                        #${issue.number} by ${issue.user.login} • ${this.formatDate(issue.created_at)} • ${issue.repository.displayName}
                    </div>
                </div>
                <span class="card-expand-icon">▶</span>
            </div>
            <div class="card-body">
                <div class="card-body-content markdown-body">${body}</div>
                <a href="${issue.html_url}" target="_blank" class="card-body-link">View on GitHub →</a>
            </div>
            <div class="card-footer">
                <div class="card-labels">
                    <span class="label status-open">Open</span>
                    ${issue.labels.map(label => 
                        `<span class="label" style="background-color: #${label.color}20; color: #${label.color};">${label.name}</span>`
                    ).join('')}
                </div>
                ${issue.assignee ? `<div style="font-size: 12px; color: var(--text-muted);">Assigned to ${issue.assignee.login}</div>` : ''}
            </div>
        `;
    }

    createActionCard(run) {
        const statusClass = `status-${run.conclusion || run.status}`;
        const statusText = run.conclusion || run.status;
        
        return `
            <div class="card-header">
                <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6"/>
                    <path d="M12 17v6"/>
                    <path d="M4.22 4.22l4.24 4.24"/>
                    <path d="M15.54 15.54l4.24 4.24"/>
                    <path d="M1 12h6"/>
                    <path d="M17 12h6"/>
                    <path d="M4.22 19.78l4.24-4.24"/>
                    <path d="M15.54 8.46l4.24-4.24"/>
                </svg>
                <div class="card-content">
                    <h3 class="card-title">
                        <a href="${run.html_url}" target="_blank">${this.escapeHtml(run.name || 'Workflow Run')}</a>
                    </h3>
                    <div class="card-meta">
                        Run #${run.run_number} • ${run.head_commit ? run.head_commit.message.split('\n')[0] : ''} • ${this.formatDate(run.created_at)} • ${run.repository.displayName}
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <div class="card-labels">
                    <span class="status-indicator ${statusClass}">
                        <span class="status-dot"></span>
                        ${this.capitalizeFirst(statusText)}
                    </span>
                </div>
                <div style="font-size: 12px; color: #64748b;">
                    Branch: ${run.head_branch}
                </div>
            </div>
        `;
    }

    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        
        if (spinner) spinner.style.display = 'flex';
        
        // Hide all section-specific grids
        const grids = ['pullRequestsGrid', 'issuesGrid', 'actionsGrid'];
        grids.forEach(gridId => {
            const grid = document.getElementById(gridId);
            if (grid) grid.style.display = 'none';
        });
        
        this.hideError();
        this.hideEmptyState();
    }

    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        
        if (spinner) spinner.style.display = 'none';
        
        // Show the appropriate section grid
        const grids = {
            'pull-requests': 'pullRequestsGrid',
            'issues': 'issuesGrid',
            'actions': 'actionsGrid'
        };
        
        const gridId = grids[this.currentSection];
        if (gridId) {
            const grid = document.getElementById(gridId);
            if (grid) grid.style.display = 'grid';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        errorText.textContent = message;
        errorElement.style.display = 'flex';
        this.hideLoading();
        this.hideEmptyState();
    }

    hideError() {
        document.getElementById('errorMessage').style.display = 'none';
    }

    showEmptyState(section) {
        const emptyState = document.getElementById('emptyState');
        const message = document.getElementById('emptyStateMessage');
        
        let messageText;
        
        if (section === 'actions') {
            // Check if the current repository has workflows configured
            const repo = this.config.repositories.find(r => r.id === this.currentRepository);
            if (!repo || !repo.workflows || repo.workflows.length === 0) {
                messageText = 'No workflows configured for this repository. Add workflow names to the repository configuration to display GitHub Actions.';
            } else {
                messageText = `No workflow runs found for the configured workflows: ${repo.workflows.join(', ')}.`;
            }
        } else {
            const messages = {
                'pull-requests': 'No open pull requests found for the selected repository.',
                'issues': 'No open issues found for the selected repository.'
            };
            messageText = messages[section] || 'No items found.';
        }
        
        message.textContent = messageText;
        emptyState.style.display = 'block';
        
        // Hide the appropriate section grid
        const grids = {
            'pull-requests': 'pullRequestsGrid',
            'issues': 'issuesGrid',
            'actions': 'actionsGrid'
        };
        
        const gridId = grids[section];
        if (gridId) {
            const gridElement = document.getElementById(gridId);
            if (gridElement) gridElement.style.display = 'none';
        }
        
        this.hideLoading();
    }

    hideEmptyState() {
        document.getElementById('emptyState').style.display = 'none';
    }

    renderActionsWithSections(container, data) {
        // Process data for "Latest Runs" section - one per workflow
        const latestRunsMap = new Map();
        data.forEach(run => {
            const workflowName = run.name;
            const existing = latestRunsMap.get(workflowName);
            if (!existing || new Date(run.created_at) > new Date(existing.created_at)) {
                latestRunsMap.set(workflowName, run);
            }
        });
        const latestRuns = Array.from(latestRunsMap.values())
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        // Process data for "All Runs" section - sorted by workflow name, then date
        const allRuns = [...data].sort((a, b) => {
            // Primary sort by workflow name
            const nameComparison = (a.name || '').localeCompare(b.name || '');
            if (nameComparison !== 0) return nameComparison;
            
            // Secondary sort by date (newest first within same workflow)
            return new Date(b.created_at) - new Date(a.created_at);
        });

        // Create "Latest Workflow Status" section
        if (latestRuns.length > 0) {
            const latestSection = document.createElement('div');
            latestSection.className = 'actions-section';
            latestSection.innerHTML = `
                <div class="section-header">
                    <h3 class="section-title">Latest Workflow Status</h3>
                    <span class="section-subtitle">${latestRuns.length} workflow${latestRuns.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="section-content" id="latestRunsGrid"></div>
            `;
            container.appendChild(latestSection);

            const latestGrid = document.getElementById('latestRunsGrid');
            latestRuns.forEach(run => {
                const card = this.createCard('actions', run);
                latestGrid.appendChild(card);
            });
        }

        // Create "All Workflow Runs" section
        if (allRuns.length > 0) {
            const allSection = document.createElement('div');
            allSection.className = 'actions-section';
            allSection.innerHTML = `
                <div class="section-header">
                    <h3 class="section-title">All Workflow Runs</h3>
                    <span class="section-subtitle">${allRuns.length} run${allRuns.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="section-content" id="allRunsGrid"></div>
            `;
            container.appendChild(allSection);

            const allGrid = document.getElementById('allRunsGrid');
            allRuns.forEach(run => {
                const card = this.createCard('actions', run);
                allGrid.appendChild(card);
            });
        }
    }

    showRepositorySelectionState(section) {
        // Ensure the section header is visible first
        this.ensureSectionHeaderVisible(section);
        
        const emptyState = document.getElementById('emptyState');
        const message = document.getElementById('emptyStateMessage');
        
        const sectionNames = {
            'pull-requests': 'pull requests',
            'issues': 'issues',
            'actions': 'GitHub Actions'
        };
        
        message.innerHTML = `
            <strong>Please select a repository to view ${sectionNames[section] || 'data'}.</strong><br>
            Choose a repository from the dropdown above to get started.
        `;
        emptyState.style.display = 'block';
        
        // Use section-specific grid IDs
        const grids = {
            'pull-requests': 'pullRequestsGrid',
            'issues': 'issuesGrid',
            'actions': 'actionsGrid'
        };
        
        const gridId = grids[section];
        const gridElement = document.getElementById(gridId);
        if (gridElement) {
            gridElement.style.display = 'none';
        }
        
        document.getElementById('loadingSpinner').style.display = 'none';
        this.hideError();
        
        // Reset section-specific data info
        const infoElements = {
            'pull-requests': { count: 'dataCount', updated: 'lastUpdated' },
            'issues': { count: 'issuesDataCount', updated: 'issuesLastUpdated' },
            'actions': { count: 'actionsDataCount', updated: 'actionsLastUpdated' }
        };
        
        const elements = infoElements[section];
        if (elements) {
            const countElement = document.getElementById(elements.count);
            const updatedElement = document.getElementById(elements.updated);
            
            if (countElement) countElement.textContent = '-';
            if (updatedElement) updatedElement.textContent = 'Never';
        }
    }

    ensureSectionHeaderVisible(section) {
        // Force display of section headers and repository dropdowns - convert kebab-case to camelCase
        const sectionId = section.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase()) + 'Section';
        const sectionElement = document.getElementById(sectionId);
        if (sectionElement) {
            const sectionHeader = sectionElement.querySelector('.section-header');
            const headerControls = sectionElement.querySelector('.header-controls');
            const repositoryFilter = sectionElement.querySelector('.repository-filter');
            
            if (sectionHeader) sectionHeader.style.display = 'flex';
            if (headerControls) headerControls.style.display = 'flex';
            if (repositoryFilter) repositoryFilter.style.display = 'block';
            
            // Ensure the specific repository select is visible
            const selectIds = {
                'pull-requests': 'repositorySelect',
                'issues': 'issuesRepositorySelect', 
                'actions': 'actionsRepositorySelect'
            };
            
            const selectId = selectIds[section];
            if (selectId) {
                const selectElement = document.getElementById(selectId);
                if (selectElement) {
                    selectElement.style.display = 'block';
                    selectElement.style.visibility = 'visible';
                }
            }
        }
    }

    updateDataInfo(count) {
        document.getElementById('dataCount').textContent = `${count} items`;
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
    }

    getCacheDuration() {
        // Use longer cache for unauthenticated requests to conserve rate limit
        if (this.isAuthenticated) {
            return this.config?.cacheDuration || 300000; // 5 minutes default for authenticated
        } else {
            return 1800000; // 30 minutes for unauthenticated to preserve rate limit
        }
    }

    updateRateLimitDisplay() {
        if (!this.rateLimitInfo) return;

        const statusElement = document.getElementById('authStatus');
        if (statusElement) {
            const { limit, remaining, reset } = this.rateLimitInfo;
            const resetTime = new Date(reset * 1000);
            const isLowOnRequests = remaining < 10;

            statusElement.innerHTML = `
                <span class="auth-indicator ${this.isAuthenticated ? 'authenticated' : 'unauthenticated'}">
                    ${this.isAuthenticated ? '🔑' : '🌐'} ${this.isAuthenticated ? 'Authenticated' : 'Public API'}
                </span>
                <span class="rate-limit ${isLowOnRequests ? 'warning' : ''}">
                    ${remaining}/${limit} requests remaining
                </span>
                ${isLowOnRequests ? `<span class="reset-time">Resets at ${resetTime.toLocaleTimeString()}</span>` : ''}
            `;
            
            // Show the status bar
            statusElement.style.display = 'flex';
        }
        
        // Show authentication suggestion if rate limit is low and not authenticated
        this.showAuthenticationSuggestion();
    }

    showAuthenticationSuggestion() {
        if (!this.isAuthenticated && this.rateLimitInfo && this.rateLimitInfo.remaining < 20) {
            const suggestion = document.getElementById('authSuggestion');
            if (suggestion) {
                suggestion.style.display = 'block';
                suggestion.innerHTML = `
                    <div class="suggestion-content">
                        <h4>💡 Tip: Add GitHub Token for Better Performance</h4>
                        <p>You're using the public API (60 requests/hour). Add a GitHub token to increase this to 5,000 requests/hour.</p>
                        <button onclick="this.parentElement.parentElement.style.display='none'" class="dismiss-btn">Dismiss</button>
                    </div>
                `;
            }
        }
    }

    clearContent() {
        // Hide all content states
        this.hideLoading();
        this.hideError();
        this.hideEmptyState();
        
        // Clear the content grid
        const contentGrid = document.getElementById('contentGrid');
        if (contentGrid) {
            contentGrid.innerHTML = '';
            contentGrid.style.display = 'none';
        }
        
        // Reset data info
        document.getElementById('dataCount').textContent = '-';
        document.getElementById('lastUpdated').textContent = 'Never';
    }

    // Helper methods for section-specific rendering
    renderSectionData(section, data) {
        const grids = {
            'pull-requests': 'pullRequestsGrid',
            'issues': 'issuesGrid',
            'actions': 'actionsGrid'
        };
        
        const gridId = grids[section];
        const container = document.getElementById(gridId);
        
        if (!container) return;

        // Always clear the grid and expanded container first
        container.innerHTML = '';
        const expandIds = { 'pullRequestsGrid': 'pullRequestsExpanded', 'issuesGrid': 'issuesExpanded' };
        const expandContainer = document.getElementById(expandIds[gridId]);
        if (expandContainer) {
            expandContainer.innerHTML = '';
            expandContainer.classList.remove('active');
        }
        
        if (data.length === 0) {
            this.showEmptyState(section);
            return;
        }
        
        const viewMode = this.viewMode[section] || 'card';
        
        if (section === 'actions') {
            container.classList.add('actions-layout');
            container.classList.remove('list-view');
            this.renderActionsWithSections(container, data);
        } else if (viewMode === 'list') {
            container.classList.remove('actions-layout');
            container.classList.add('list-view');
            data.forEach(item => {
                const row = this.createListItem(section, item);
                container.appendChild(row);
            });
        } else {
            container.classList.remove('actions-layout', 'list-view');
            data.forEach(item => {
                const card = this.createCard(section, item);
                container.appendChild(card);
            });
        }

        this.hideLoading();
        this.hideError();
        this.hideEmptyState();
        
        // Add click-to-expand handlers — whole card is clickable
        container.querySelectorAll('.card').forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                if (e.target.closest('a') || e.target.closest('.card-body')) return;
                const icon = card.querySelector('.card-expand-icon');
                const wasOpen = card.classList.contains('expanded');

                if (container.classList.contains('list-view')) {
                    if (icon) icon.textContent = wasOpen ? '▶' : '▼';
                    card.classList.toggle('expanded', !wasOpen);
                } else {
                    // Card view: pull card out into expanded container above grid
                    const expandedContainers = { 'pullRequestsGrid': 'pullRequestsExpanded', 'issuesGrid': 'issuesExpanded' };
                    const expandContainer = document.getElementById(expandedContainers[container.id]);
                    
                    if (wasOpen) {
                        // Collapse: move card back into grid at its original position
                        card.classList.remove('expanded', 'expanding');
                        card.style.width = '';
                        card.style.marginLeft = '';
                        if (icon) icon.textContent = '▶';
                        const placeholder = container.querySelector(`[data-placeholder="${card.dataset.expandId}"]`);
                        if (placeholder) {
                            container.insertBefore(card, placeholder);
                            placeholder.remove();
                        } else {
                            container.appendChild(card);
                        }
                        if (expandContainer) expandContainer.classList.remove('active');
                    } else {
                        // Collapse any previously expanded
                        if (expandContainer && expandContainer.classList.contains('active')) {
                            const prev = expandContainer.querySelector('.card');
                            if (prev) {
                                prev.classList.remove('expanded', 'expanding');
                                prev.style.width = '';
                                prev.style.marginLeft = '';
                                const pi = prev.querySelector('.card-expand-icon');
                                if (pi) pi.textContent = '▶';
                                const ph = container.querySelector(`[data-placeholder="${prev.dataset.expandId}"]`);
                                if (ph) {
                                    container.insertBefore(prev, ph);
                                    ph.remove();
                                } else {
                                    container.appendChild(prev);
                                }
                            }
                            expandContainer.classList.remove('active');
                        }
                        
                        // Mark position with placeholder, move card to expand container
                        const id = 'exp-' + Date.now();
                        card.dataset.expandId = id;
                        const placeholder = document.createElement('div');
                        placeholder.dataset.placeholder = id;
                        placeholder.style.display = 'none';
                        container.insertBefore(placeholder, card);
                        
                        // Capture original width and position before moving
                        const originalWidth = card.offsetWidth + 'px';
                        const cardRect = card.getBoundingClientRect();
                        const containerRect = container.getBoundingClientRect();
                        const originalLeft = (cardRect.left - containerRect.left) + 'px';
                        
                        if (expandContainer) {
                            expandContainer.innerHTML = '';
                            expandContainer.appendChild(card);
                            // Set starting width and position to match grid card
                            card.style.width = originalWidth;
                            card.style.marginLeft = originalLeft;
                            // Force reflow then animate to full width from left edge
                            expandContainer.offsetHeight;
                            expandContainer.classList.add('active');
                            card.classList.add('expanded');
                            card.style.width = '100%';
                            card.style.marginLeft = '0px';
                        }
                        if (icon) icon.textContent = '▼';
                    }
                }
            });
        });
    }

    updateSectionDataInfo(section, count) {
        const infoElements = {
            'pull-requests': { count: 'dataCount', updated: 'lastUpdated' },
            'issues': { count: 'issuesDataCount', updated: 'issuesLastUpdated' },
            'actions': { count: 'actionsDataCount', updated: 'actionsLastUpdated' }
        };
        
        const elements = infoElements[section];
        if (elements) {
            const countElement = document.getElementById(elements.count);
            const updatedElement = document.getElementById(elements.updated);
            
            if (countElement) countElement.textContent = `${count} items`;
            if (updatedElement) updatedElement.textContent = new Date().toLocaleTimeString();
        }
    }

    refreshData() {
        // Clear all caches
        this.cache.clear();
        this.dashboardCache = { data: null, timestamp: null };
        
        // Reload current section
        this.loadSection(this.currentSection);
        
        // Visual feedback
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            refreshBtn.style.transform = '';
        }, 500);
    }

    // Utility methods
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 30) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    formatDateFull(dateString) {
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Issue filtering methods
    setupIssueFilterListeners() {
            this.setupGhToolbar('issue', this.issueFilters, () => this.applyIssueFilters());
        }

    showIssueFilters() {
        const filtersPanel = document.getElementById('issueFilters');
        if (filtersPanel) {
            filtersPanel.style.display = 'block';
        }
    }

    hideIssueFilters() {
        const filtersPanel = document.getElementById('issueFilters');
        if (filtersPanel) {
            filtersPanel.style.display = 'none';
        }
    }




    showPullRequestFilters() {
        const filtersPanel = document.getElementById('pullRequestFilters');
        if (filtersPanel) {
            filtersPanel.style.display = 'block';
        }
    }

    hidePullRequestFilters() {
        const filtersPanel = document.getElementById('pullRequestFilters');
        if (filtersPanel) {
            filtersPanel.style.display = 'none';
        }
    }

    applyIssueFilters() {
        this.filterAggregateByRepo('issues');
    }

    filterAndSortIssues(issues) {
            let filtered = [...issues];
            const f = this.issueFilters;
            const teamUsernames = ALL_CRYPTO_TOOLS_USERNAMES.map(u => u.toLowerCase());

            if (f.keyword) {
                const keywords = f.keyword.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
                filtered = filtered.filter(issue => {
                    const text = `${issue.title || ''} ${issue.body || ''}`.toLowerCase();
                    return keywords.every(kw => text.includes(kw));
                });
            }

            if (f.author) {
                if (f.author === '@team') {
                    filtered = filtered.filter(i => teamUsernames.includes(i.user.login.toLowerCase()));
                } else if (f.author === '@external') {
                    filtered = filtered.filter(i => !teamUsernames.includes(i.user.login.toLowerCase()));
                } else if (f.author === '@last-reply-team') {
                    filtered = filtered.filter(i => !!i.lastReplyIsFromTeam);
                } else if (f.author === '@last-reply-external') {
                    filtered = filtered.filter(i => !i.lastReplyIsFromTeam);
                } else {
                    filtered = filtered.filter(i => i.user.login.toLowerCase() === f.author.toLowerCase());
                }
            }

            filtered = this.applySorting(filtered, f.sort);
            return filtered;
        }

    extractUsersFromIssues(issues) {
        const users = new Set();
        issues.forEach(issue => {
            if (issue.user && issue.user.login) {
                users.add(issue.user.login);
            }
        });
        this.issueFilters.availableUsers = users;
    }

    applySorting(items, sort) {
        switch (sort) {
            case 'updated-desc': return items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            case 'updated-asc': return items.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
            case 'created-desc': return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            case 'created-asc': return items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            case 'comments-desc': return items.sort((a, b) => (b.comments || 0) - (a.comments || 0));
            case 'comments-asc': return items.sort((a, b) => (a.comments || 0) - (b.comments || 0));
            default: return items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        }
    }






    clearAllIssueFilters() {
            this.issueFilters.keyword = '';
            this.issueFilters.author = '@last-reply-external';
            this.issueFilters.sort = 'updated-desc';
            const input = document.getElementById('issueKeywordSearch');
            if (input) input.value = '';
            this.renderActiveFilters('issue', this.issueFilters, () => this.applyIssueFilters());
            this.applyIssueFilters();
        }


    // Pull request filtering methods
    filterAndSortPullRequests(prs) {
            let filtered = [...prs];
            const f = this.pullRequestFilters;
            const teamUsernames = ALL_CRYPTO_TOOLS_USERNAMES.map(u => u.toLowerCase());

            if (f.keyword) {
                const keywords = f.keyword.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
                filtered = filtered.filter(pr => {
                    const text = `${pr.title || ''} ${pr.body || ''}`.toLowerCase();
                    return keywords.every(kw => text.includes(kw));
                });
            }

            if (f.author) {
                if (f.author === '@team') {
                    filtered = filtered.filter(pr => teamUsernames.includes(pr.user.login.toLowerCase()));
                } else if (f.author === '@external') {
                    filtered = filtered.filter(pr => {
                        const login = pr.user.login.toLowerCase();
                        return !teamUsernames.includes(login) && login !== 'dependabot[bot]' && login !== 'dependabot';
                    });
                } else if (f.author === '@dependabot') {
                    filtered = filtered.filter(pr => {
                        const login = pr.user.login.toLowerCase();
                        return login === 'dependabot[bot]' || login === 'dependabot';
                    });
                } else {
                    filtered = filtered.filter(pr => pr.user.login.toLowerCase() === f.author.toLowerCase());
                }
            }

            filtered = this.applySorting(filtered, f.sort);
            return filtered;
        }

    extractUsersFromPullRequests(prs) {
        const users = new Set();
        prs.forEach(pr => {
            if (pr.user && pr.user.login) {
                users.add(pr.user.login);
            }
        });
        this.pullRequestFilters.availableUsers = users;
    }


    // Pull request filtering methods
    setupPullRequestFilterListeners() {
        this.setupGhToolbar('pr', this.pullRequestFilters, () => this.applyPullRequestFilters());
    }

    setupGhToolbar(prefix, filters, apply) {
        const authorBtn = document.getElementById(`${prefix}AuthorBtn`);
        const authorDropdown = document.getElementById(`${prefix}AuthorDropdown`);
        const authorSearch = document.getElementById(`${prefix}AuthorSearch`);
        const sortBtn = document.getElementById(`${prefix}SortBtn`);
        const sortDropdown = document.getElementById(`${prefix}SortDropdown`);
        const keywordInput = document.getElementById(prefix === 'issue' ? 'issueKeywordSearch' : 'prKeywordSearch');

        if (authorBtn) {
            authorBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sortDropdown?.classList.remove('open');
                authorDropdown.classList.toggle('open');
                if (authorDropdown.classList.contains('open')) {
                    this.populateAuthorDropdown(prefix, filters);
                    authorSearch?.focus();
                }
            });
        }
        if (sortBtn) {
            sortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                authorDropdown?.classList.remove('open');
                sortDropdown.classList.toggle('open');
            });
        }

        document.addEventListener('click', (e) => {
            if (!authorDropdown?.contains(e.target) && e.target !== authorBtn) authorDropdown?.classList.remove('open');
            if (!sortDropdown?.contains(e.target) && e.target !== sortBtn) sortDropdown?.classList.remove('open');
        });

        sortDropdown?.querySelectorAll('.gh-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                sortDropdown.querySelectorAll('.gh-dropdown-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                filters.sort = item.dataset.sort;
                sortDropdown.classList.remove('open');
                apply();
            });
        });

        if (authorSearch) {
            authorSearch.addEventListener('input', () => {
                this.populateAuthorDropdown(prefix, filters, authorSearch.value);
            });
        }

        if (keywordInput) {
            let t;
            keywordInput.addEventListener('input', (e) => {
                clearTimeout(t);
                t = setTimeout(() => {
                    filters.keyword = e.target.value.trim();
                    this.renderActiveFilters(prefix, filters, apply);
                    apply();
                }, 300);
            });
        }

        // Render initial active filter tags
        this.renderActiveFilters(prefix, filters, apply);
    }

    populateAuthorDropdown(prefix, filters, searchQuery) {
        const container = document.getElementById(`${prefix}AuthorItems`);
        if (!container) return;
        const q = (searchQuery || '').toLowerCase();
        const apply = prefix === 'issue' ? () => this.applyIssueFilters() : () => this.applyPullRequestFilters();

        const shorthands = [
            { value: '@team', label: 'Crypto Tools team', badge: 'team' },
            { value: '@external', label: 'External contributors', badge: 'external' },
        ];
        if (prefix === 'pr') {
            shorthands.push({ value: '@dependabot', label: 'Dependabot', badge: 'bot' });
        }
        if (prefix === 'issue') {
            shorthands.push({ value: '@last-reply-team', label: 'Last reply from team', badge: 'filter' });
            shorthands.push({ value: '@last-reply-external', label: 'Last reply not from team', badge: 'filter' });
        }

        const filteredShorthands = shorthands.filter(s => !q || s.label.toLowerCase().includes(q) || s.value.includes(q));

        container.innerHTML = '';

        filteredShorthands.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'gh-dropdown-item' + (filters.author === s.value ? ' active' : '');
            btn.innerHTML = `${s.label} <span class="gh-author-badge">${s.badge}</span>`;
            btn.addEventListener('click', () => {
                filters.author = filters.author === s.value ? null : s.value;
                document.getElementById(`${prefix}AuthorDropdown`)?.classList.remove('open');
                this.renderActiveFilters(prefix, filters, apply);
                apply();
            });
            container.appendChild(btn);
        });

        // Only show individual users when there's a search query
        if (q) {
            const users = Array.from(filters.availableUsers)
                .filter(u => u.toLowerCase().includes(q))
                .sort()
                .slice(0, 10);
            const teamUsernames = ALL_CRYPTO_TOOLS_USERNAMES.map(u => u.toLowerCase());

            users.forEach(user => {
                const isTeam = teamUsernames.includes(user.toLowerCase());
                const btn = document.createElement('button');
                btn.className = 'gh-dropdown-item' + (filters.author === user ? ' active' : '');
                btn.textContent = user;
                if (isTeam) btn.innerHTML += ' <span class="gh-author-badge">team</span>';
                btn.addEventListener('click', () => {
                    filters.author = filters.author === user ? null : user;
                    document.getElementById(`${prefix}AuthorDropdown`)?.classList.remove('open');
                    this.renderActiveFilters(prefix, filters, apply);
                    apply();
                });
                container.appendChild(btn);
            });
        }
    }

    renderActiveFilters(prefix, filters, apply) {
        const container = document.getElementById(`${prefix}ActiveFilters`);
        if (!container) return;
        container.innerHTML = '';

        const addTag = (label, onRemove) => {
            const tag = document.createElement('span');
            tag.className = 'gh-filter-tag';
            tag.innerHTML = `${this.escapeHtml(label)} <button class="gh-filter-tag-remove">×</button>`;
            tag.querySelector('button').addEventListener('click', onRemove);
            container.appendChild(tag);
        };

        if (filters.author) {
            const label = filters.author.startsWith('@') ? filters.author.slice(1).replace(/-/g, ' ') : `author: ${filters.author}`;
            addTag(label, () => { filters.author = null; this.renderActiveFilters(prefix, filters, apply); apply(); });
        }

        if (filters.keyword) {
            addTag(`"${filters.keyword}"`, () => {
                filters.keyword = '';
                const input = document.getElementById(prefix === 'issue' ? 'issueKeywordSearch' : 'prKeywordSearch');
                if (input) input.value = '';
                this.renderActiveFilters(prefix, filters, apply);
                apply();
            });
        }

        if (container.children.length > 0) {
            const clear = document.createElement('button');
            clear.className = 'gh-clear-filters';
            clear.textContent = 'Clear filters';
            clear.addEventListener('click', () => {
                filters.author = null;
                filters.keyword = '';
                const input = document.getElementById(prefix === 'issue' ? 'issueKeywordSearch' : 'prKeywordSearch');
                if (input) input.value = '';
                this.renderActiveFilters(prefix, filters, apply);
                apply();
            });
            container.appendChild(clear);
        }
    }



    applyPullRequestFilters() {
        this.filterAggregateByRepo('pull-requests');
    }






    clearAllPullRequestFilters() {
            this.pullRequestFilters.keyword = '';
            this.pullRequestFilters.author = '@external';
            this.pullRequestFilters.sort = 'updated-desc';
            const input = document.getElementById('prKeywordSearch');
            if (input) input.value = '';
            this.renderActiveFilters('pr', this.pullRequestFilters, () => this.applyPullRequestFilters());
            this.applyPullRequestFilters();
        }

    // Pull request categorization and overview methods
    categorizePullRequests(prs) {
        const dependabotPRs = prs.filter(pr => 
            pr.user && pr.user.login === 'dependabot[bot]'
        );

        // Get ALL_CRYPTO_TOOLS_USERNAMES from global scope
        const cryptoToolsUsernames = typeof ALL_CRYPTO_TOOLS_USERNAMES !== 'undefined' ? ALL_CRYPTO_TOOLS_USERNAMES : [];

        const teamMemberPRs = prs.filter(pr => 
            pr.user && 
            pr.user.login !== 'dependabot[bot]' && 
            cryptoToolsUsernames.includes(pr.user.login)
        );

        const externalPRs = prs.filter(pr => 
            pr.user && 
            pr.user.login !== 'dependabot[bot]' && 
            !cryptoToolsUsernames.includes(pr.user.login)
        );

        return {
            dependabot: dependabotPRs,
            teamMembers: teamMemberPRs,
            external: externalPRs,
            total: prs.length
        };
    }

    // Issues categorization and overview methods
    categorizeIssues(issues) {
        // Get ALL_CRYPTO_TOOLS_USERNAMES from global scope
        const cryptoToolsUsernames = typeof ALL_CRYPTO_TOOLS_USERNAMES !== 'undefined' ? ALL_CRYPTO_TOOLS_USERNAMES : [];

        const teamMemberIssues = issues.filter(issue => 
            issue.user && 
            cryptoToolsUsernames.includes(issue.user.login)
        );

        const externalIssues = issues.filter(issue => 
            issue.user && 
            !cryptoToolsUsernames.includes(issue.user.login)
        );

        return {
            teamMembers: teamMemberIssues,
            external: externalIssues,
            total: issues.length
        };
    }

    renderPROverview(categorizedData) {
        // Update the count displays
        const dependabotCount = document.getElementById('dependabotCount');
        const teamMembersCount = document.getElementById('teamMembersCount');
        const externalCount = document.getElementById('externalCount');

        if (dependabotCount) {
            dependabotCount.textContent = categorizedData.dependabot.length;
        }

        if (teamMembersCount) {
            teamMembersCount.textContent = categorizedData.teamMembers.length;
        }

        if (externalCount) {
            externalCount.textContent = categorizedData.external.length;
        }
    }

    renderIssueOverview(categorizedData) {
        // Update the count displays for issues
        const issuesTeamMembersCount = document.getElementById('issuesTeamMembersCount');
        const issuesExternalCount = document.getElementById('issuesExternalCount');

        if (issuesTeamMembersCount) {
            issuesTeamMembersCount.textContent = categorizedData.teamMembers.length;
        }

        if (issuesExternalCount) {
            issuesExternalCount.textContent = categorizedData.external.length;
        }
    }

    showPROverviewSection() {
        const overviewSection = document.getElementById('prOverviewSection');
        if (overviewSection) {
            overviewSection.style.display = 'block';
        }
    }

    hidePROverviewSection() {
        const overviewSection = document.getElementById('prOverviewSection');
        if (overviewSection) {
            overviewSection.style.display = 'none';
        }
    }

    showIssuesOverviewSection() {
        const overviewSection = document.getElementById('issuesOverviewSection');
        if (overviewSection) {
            overviewSection.style.display = 'block';
        }
    }

    hideIssuesOverviewSection() {
        const overviewSection = document.getElementById('issuesOverviewSection');
        if (overviewSection) {
            overviewSection.style.display = 'none';
        }
    }
    // Settings page functionality
    updateSettingsDisplay() {
        // Update authentication status
        const authStatusIndicator = document.getElementById('authStatusIndicator');
        const authStatusDot = document.getElementById('authStatusDot');
        const authStatusText = document.getElementById('authStatusText');
        const authInfo = document.getElementById('authInfo');
        const rateLimitInfo = document.getElementById('rateLimitInfo');
        const clearTokenBtn = document.getElementById('clearToken');

        if (authStatusIndicator) {
            if (this.isAuthenticated) {
                authStatusIndicator.classList.add('authenticated');
                if (authStatusDot) authStatusDot.style.background = '#22c55e';
                if (authStatusText) authStatusText.textContent = 'Personal Token';
                if (clearTokenBtn) clearTokenBtn.style.display = 'inline-flex';
                
                if (authInfo) {
                    authInfo.innerHTML = `
                        <p>Using your personal access token with a limit of <strong>5,000 requests per hour</strong>.</p>
                        <p>Token is stored in session storage and will be cleared when you close this tab.</p>
                    `;
                }
                
                // Show rate limit info if available
                if (this.rateLimitInfo && rateLimitInfo) {
                    rateLimitInfo.style.display = 'block';
                    this.updateRateLimitSettings();
                }
            } else {
                authStatusIndicator.classList.remove('authenticated');
                if (authStatusDot) authStatusDot.style.background = '#94a3b8';
                if (authStatusText) authStatusText.textContent = 'Public API';
                if (clearTokenBtn) clearTokenBtn.style.display = 'none';
                
                if (authInfo) {
                    authInfo.innerHTML = `
                        <p>Currently using GitHub's public API with a limit of <strong>60 requests per hour</strong>.</p>
                        <p>Add a personal access token to increase the limit to <strong>5,000 requests per hour</strong>.</p>
                    `;
                }
                
                if (rateLimitInfo) {
                    rateLimitInfo.style.display = 'none';
                }
            }
        }
    }

    updateRateLimitSettings() {
        const requestsRemaining = document.getElementById('requestsRemaining');
        const resetTime = document.getElementById('resetTime');
        
        if (this.rateLimitInfo && requestsRemaining && resetTime) {
            requestsRemaining.textContent = `${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit}`;
            const resetDate = new Date(this.rateLimitInfo.reset * 1000);
            resetTime.textContent = resetDate.toLocaleTimeString();
        }
    }

    setupSettingsEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const currentTheme = localStorage.getItem('dashboard-theme') || 'dark';
            themeToggle.checked = currentTheme === 'dark';

            themeToggle.addEventListener('change', () => {
                const theme = themeToggle.checked ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('dashboard-theme', theme);
            });
        }

        const tokenInput = document.getElementById('githubToken');
        const toggleVisibilityBtn = document.getElementById('toggleTokenVisibility');
        const saveTokenBtn = document.getElementById('saveToken');
        const testTokenBtn = document.getElementById('testToken');
        const clearTokenBtn = document.getElementById('clearToken');

        // Toggle token visibility
        if (toggleVisibilityBtn && tokenInput) {
            toggleVisibilityBtn.addEventListener('click', () => {
                const isPassword = tokenInput.type === 'password';
                tokenInput.type = isPassword ? 'text' : 'password';
                
                const svg = toggleVisibilityBtn.querySelector('svg');
                if (isPassword) {
                    // Show eye-off icon
                    svg.innerHTML = `
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                    `;
                } else {
                    // Show eye icon
                    svg.innerHTML = `
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    `;
                }
            });
        }

        // Save token
        if (saveTokenBtn) {
            saveTokenBtn.addEventListener('click', async () => {
                await this.saveGitHubToken();
            });
        }

        // Test token
        if (testTokenBtn) {
            testTokenBtn.addEventListener('click', async () => {
                await this.testGitHubToken();
            });
        }

        // Clear token
        if (clearTokenBtn) {
            clearTokenBtn.addEventListener('click', () => {
                this.clearGitHubToken();
            });
        }

        // Auto-validate on input
        if (tokenInput) {
            let validateTimeout;
            tokenInput.addEventListener('input', () => {
                clearTimeout(validateTimeout);
                validateTimeout = setTimeout(() => {
                    const token = tokenInput.value.trim();
                    if (token.length > 10) { // Basic length check
                        this.showValidationState('loading', 'Validating token...', '');
                    } else {
                        this.hideValidation();
                    }
                }, 500);
            });
        }
    }

    async saveGitHubToken() {
        const tokenInput = document.getElementById('githubToken');
        const saveBtn = document.getElementById('saveToken');
        
        if (!tokenInput || !saveBtn) return;
        
        const token = tokenInput.value.trim();
        
        if (!token) {
            this.showValidationState('error', 'Please enter a token', '');
            return;
        }

        // Disable button and show loading
        saveBtn.disabled = true;
        this.showValidationState('loading', 'Validating and saving token...', '');

        try {
            // Validate token first
            const isValid = await this.validateToken(token);
            
            if (isValid) {
                // Save to session storage
                const success = this.config.setSessionToken(token);
                
                if (success) {
                    this.isAuthenticated = true;
                    this.showValidationState('success', 'Token saved successfully!', 'You can now use the enhanced API rate limits.');
                    this.showToast('success', 'Token Saved', 'GitHub token saved and validated successfully.');
                    this.updateSettingsDisplay();
                    
                    // Clear the input for security
                    tokenInput.value = '';
                    
                    // Refresh current data
                    this.refreshData();
                } else {
                    this.showValidationState('error', 'Failed to save token', 'Unable to save token to session storage.');
                }
            }
        } catch (error) {
            console.error('Error saving token:', error);
            this.showValidationState('error', 'Token validation failed', error.message);
        } finally {
            saveBtn.disabled = false;
        }
    }

    async testGitHubToken() {
        const tokenInput = document.getElementById('githubToken');
        const testBtn = document.getElementById('testToken');
        
        if (!tokenInput || !testBtn) return;
        
        const token = tokenInput.value.trim();
        
        if (!token) {
            this.showValidationState('error', 'Please enter a token to test', '');
            return;
        }

        testBtn.disabled = true;
        this.showValidationState('loading', 'Testing token...', '');

        try {
            const isValid = await this.validateToken(token);
            
            if (isValid) {
                this.showValidationState('success', 'Token is valid!', 'This token can be used with the GitHub API.');
            }
        } catch (error) {
            console.error('Error testing token:', error);
            this.showValidationState('error', 'Token test failed', error.message);
        } finally {
            testBtn.disabled = false;
        }
    }

    clearGitHubToken() {
        const success = this.config.clearSessionToken();
        
        if (success) {
            this.isAuthenticated = false;
            this.rateLimitInfo = null;
            this.showToast('info', 'Token Cleared', 'GitHub token removed. Using public API.');
            this.updateSettingsDisplay();
            this.hideValidation();
            
            // Clear the input
            const tokenInput = document.getElementById('githubToken');
            if (tokenInput) tokenInput.value = '';
            
            // Refresh current data
            this.refreshData();
        } else {
            this.showToast('error', 'Error', 'Failed to clear token from session storage.');
        }
    }

    async validateToken(token) {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'GitHub-Dashboard'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
                const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
                
                this.rateLimitInfo = {
                    limit: parseInt(rateLimitLimit) || 0,
                    remaining: parseInt(rateLimitRemaining) || 0,
                    reset: parseInt(response.headers.get('X-RateLimit-Reset')) || 0,
                    used: parseInt(response.headers.get('X-RateLimit-Used')) || 0
                };
                
                return true;
            } else if (response.status === 401) {
                throw new Error('Invalid token. Please check your GitHub personal access token.');
            } else if (response.status === 403) {
                throw new Error('Token access denied. Please check token permissions.');
            } else {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your internet connection.');
            }
            throw error;
        }
    }

    showValidationState(type, message, details) {
        const validation = document.getElementById('tokenValidation');
        const validationMessage = document.getElementById('validationMessage');
        const validationDetails = document.getElementById('validationDetails');
        
        if (!validation || !validationMessage || !validationDetails) return;
        
        validation.className = `token-validation ${type}`;
        validation.style.display = 'block';
        validationMessage.textContent = message;
        validationDetails.textContent = details;
    }

    hideValidation() {
        const validation = document.getElementById('tokenValidation');
        if (validation) {
            validation.style.display = 'none';
        }
    }

    showToast(type, title, message) {
        // Remove any existing toasts
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconSvg = {
            success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>',
            error: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/>',
            info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
        };
        
        toast.innerHTML = `
            <svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${iconSvg[type] || iconSvg.info}
            </svg>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        
        document.body.appendChild(toast);
        
        // Add close functionality
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            });
        }
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.classList.contains('show')) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    // Enhanced fetchFromGitHubRaw with automatic fallback
    async fetchFromGitHubRaw(url) {
        // Build headers conditionally based on token availability
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Dashboard'
        };

        // Add authorization header only if token is available
        if (this.config && this.config.token) {
            headers['Authorization'] = `token ${this.config.token}`;
            this.isAuthenticated = true;
        } else {
            this.isAuthenticated = false;
        }

        try {
            const response = await fetch(url, { headers });

            // Parse rate limit information from response headers
            this.rateLimitInfo = {
                limit: parseInt(response.headers.get('X-RateLimit-Limit')) || 0,
                remaining: parseInt(response.headers.get('X-RateLimit-Remaining')) || 0,
                reset: parseInt(response.headers.get('X-RateLimit-Reset')) || 0,
                used: parseInt(response.headers.get('X-RateLimit-Used')) || 0
            };

            this.updateRateLimitDisplay();
            this.updateRateLimitSettings();

            if (!response.ok) {
                if (response.status === 401) {
                    // Invalid token - clear it and fall back to public API
                    console.warn('Invalid GitHub token detected, clearing and falling back to public API');
                    this.config.clearSessionToken();
                    this.isAuthenticated = false;
                    this.showToast('error', 'Invalid Token', 'GitHub token was invalid and has been cleared. Using public API.');
                    this.updateSettingsDisplay();
                    
                    // Retry with public API
                    return this.fetchFromGitHubRaw(url);
                } else if (response.status === 403) {
                    const resetTime = new Date(this.rateLimitInfo.reset * 1000);
                    const message = this.isAuthenticated 
                        ? `API rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}.`
                        : `Rate limit exceeded (60 requests/hour for unauthenticated requests). Resets at ${resetTime.toLocaleTimeString()}. Consider adding a GitHub token for 5000 requests/hour.`;
                    throw new Error(message);
                } else {
                    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
                }
            }

            const data = await response.json();
            const linkHeader = response.headers.get('Link');

            return {
                data,
                linkHeader
            };
        } catch (error) {
            // If there's a token error and we haven't already fallen back, try without token
            if (this.config.token && (error.message.includes('401') || error.message.includes('Invalid token'))) {
                console.warn('Token error detected, falling back to public API');
                this.config.clearSessionToken();
                this.isAuthenticated = false;
                this.updateSettingsDisplay();
                
                // Retry without token
                return this.fetchFromGitHubRaw(url);
            }
            
            throw error;
        }
    }
}
// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Show loading state
        document.getElementById('loadingSpinner').style.display = 'flex';
        document.getElementById('errorMessage').style.display = 'none';
        
        // Initialize dashboard with session token support
        const dashboard = new GitHubDashboard();
        
        // Setup settings page event listeners
        dashboard.setupSettingsEventListeners();
        
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        
        // Show error message but still try to initialize
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.style.display = 'flex';
            document.getElementById('errorText').textContent = 
                `Initialization error: ${error.message}`;
            
            // Auto-hide error after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
        
        document.getElementById('loadingSpinner').style.display = 'none';
    }
});
