// GitHub Dashboard JavaScript
class GitHubDashboard {
    constructor() {
        this.config = window.GitHubConfig;
        this.currentSection = 'pull-requests';
        this.currentRepository = null; // Changed from 'all' to null
        this.cache = new Map();
        this.isAuthenticated = false;
        this.rateLimitInfo = null;
        
        // Issue filtering properties
        this.issueFilters = {
            sortBy: 'newest', // 'newest' or 'oldest'
            userFilter: '', // username filter
            availableUsers: new Set() // unique users from current data
        };
        
        // Pull request filtering properties
        this.pullRequestFilters = {
            sortBy: 'newest', // 'newest' or 'oldest'
            userFilter: '', // username filter
            availableUsers: new Set() // unique users from current data
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.populateRepositorySelect();
        this.loadSection(this.currentSection);
    }

    setupEventListeners() {
        // Navigation menu
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });

        // Repository filter
        document.getElementById('repositorySelect').addEventListener('change', (e) => {
            this.currentRepository = e.target.value;
            
            // Clear both types of filters when switching repositories
            this.clearAllIssueFilters();
            this.clearAllPullRequestFilters();
            
            this.loadSection(this.currentSection);
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // Handle browser back/forward
        window.addEventListener('hashchange', () => {
            const section = window.location.hash.slice(1) || 'pull-requests';
            if (section !== this.currentSection) {
                this.switchSection(section);
            }
        });

        // Load initial hash
        if (window.location.hash) {
            const section = window.location.hash.slice(1);
            if (['pull-requests', 'issues', 'actions'].includes(section)) {
                this.currentSection = section;
            }
        }

        // Filter event listeners
        this.setupIssueFilterListeners();
        this.setupPullRequestFilterListeners();
    }

    populateRepositorySelect() {
        const select = document.getElementById('repositorySelect');
        
        // Clear existing options except "All Repositories"
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // Add repository options
        this.config.repositories.forEach(repo => {
            const option = document.createElement('option');
            option.value = repo.id;
            option.textContent = repo.displayName;
            select.appendChild(option);
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

        // Update section
        this.currentSection = section;
        
        // Update section title
        const titles = {
            'pull-requests': 'Pull Requests',
            'issues': 'Issues',
            'actions': 'GitHub Actions'
        };
        document.getElementById('sectionTitle').textContent = titles[section];

        // Clear previous content immediately when switching sections
        this.clearContent();

        // Show/hide section-specific filters
        if (section === 'issues') {
            this.showIssueFilters();
            this.hidePullRequestFilters();
        } else if (section === 'pull-requests') {
            this.showPullRequestFilters();
            this.hideIssueFilters();
        } else {
            this.hideIssueFilters();
            this.hidePullRequestFilters();
        }

        // Load section data
        this.loadSection(section);
    }

    async loadSection(section) {
        // Check if repository is selected
        if (!this.currentRepository) {
            this.showRepositorySelectionState(section);
            return;
        }
        
        this.showLoading();
        
        try {
            let data = [];
            
            // Load data for specific repository
            const repo = this.config.repositories.find(r => r.id === this.currentRepository);
            if (repo) {
                data = await this.fetchDataForRepository(section, repo);
            }

            // Apply section-specific filtering and sorting
            if (section === 'issues') {
                // Extract users for suggestions
                this.extractUsersFromIssues(data);
                
                // Apply filters and custom sorting
                data = this.filterAndSortIssues(data);
                
                // Update filter active state
                this.updateFilterActiveState();
            } else if (section === 'pull-requests') {
                // Extract users for suggestions
                this.extractUsersFromPullRequests(data);
                
                // Apply filters and custom sorting
                data = this.filterAndSortPullRequests(data);
                
                // Update filter active state
                this.updatePRFilterActiveState();
            } else if (section !== 'actions') {
                // Default sorting for other sections (newest first) - skip actions as it has custom sorting
                data.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
            }

            this.renderData(section, data);
            this.updateDataInfo(data.length);
            
        } catch (error) {
            console.error('Error loading section:', error);
            this.showError(`Failed to load ${section.replace('-', ' ')}`);
        }
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
                    url = `${this.config.apiBase}/repos/${repository.owner}/${repository.name}/pulls?state=open`;
                    data = await this.fetchFromGitHub(url);
                    break;
                
                case 'issues':
                    url = `${this.config.apiBase}/repos/${repository.owner}/${repository.name}/issues?state=open`;
                    data = await this.fetchFromGitHub(url);
                    break;
                
                case 'actions':
                    // Check if workflows are configured for this repository
                    if (!repository.workflows || repository.workflows.length === 0) {
                        // No workflows configured - return empty array, don't make API call
                        data = [];
                        break;
                    }
                    
                    url = `${this.config.apiBase}/repos/${repository.owner}/${repository.name}/actions/runs?per_page=20`;
                    const runs = await this.fetchFromGitHub(url);
                    const allRuns = runs.workflow_runs || [];
                    
                    // Filter workflow runs by configured workflow names (case-insensitive)
                    const configuredWorkflows = repository.workflows.map(w => w.toLowerCase());
                    data = allRuns.filter(run => 
                        run.name && configuredWorkflows.includes(run.name.toLowerCase())
                    );
                    
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

    async fetchFromGitHub(url) {
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

        return response.json();
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

    createPullRequestCard(pr) {
        const statusClass = pr.draft ? 'status-draft' : 'status-open';
        const statusText = pr.draft ? 'Draft' : 'Open';
        
        return `
            <div class="card-header">
                <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="18" r="3"/>
                    <circle cx="6" cy="6" r="3"/>
                    <path d="M18 6V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1"/>
                    <path d="M6 9v9"/>
                    <path d="M18 9v3"/>
                </svg>
                <div class="card-content">
                    <h3 class="card-title">
                        <a href="${pr.html_url}" target="_blank">${this.escapeHtml(pr.title)}</a>
                    </h3>
                    <div class="card-meta">
                        #${pr.number} by ${pr.user.login} • ${this.formatDate(pr.created_at)} • ${pr.repository.displayName}
                    </div>
                </div>
            </div>
            ${pr.body ? `<div class="card-description">${this.escapeHtml(pr.body)}</div>` : ''}
            <div class="card-footer">
                <div class="card-labels">
                    <span class="label ${statusClass}">${statusText}</span>
                    ${pr.mergeable_state ? `<span class="label">Mergeable: ${pr.mergeable_state}</span>` : ''}
                </div>
                <div>
                    <span style="font-size: 12px; color: #64748b;">
                        +${pr.additions || 0} -${pr.deletions || 0}
                    </span>
                </div>
            </div>
        `;
    }

    createIssueCard(issue) {
        return `
            <div class="card-header">
                <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6"/>
                    <path d="M12 16h.01"/>
                </svg>
                <div class="card-content">
                    <h3 class="card-title">
                        <a href="${issue.html_url}" target="_blank">${this.escapeHtml(issue.title)}</a>
                    </h3>
                    <div class="card-meta">
                        #${issue.number} by ${issue.user.login} • ${this.formatDate(issue.created_at)} • ${issue.repository.displayName}
                    </div>
                </div>
            </div>
            ${issue.body ? `<div class="card-description">${this.escapeHtml(issue.body)}</div>` : ''}
            <div class="card-footer">
                <div class="card-labels">
                    <span class="label status-open">Open</span>
                    ${issue.labels.map(label => 
                        `<span class="label" style="background-color: #${label.color}20; color: #${label.color};">${label.name}</span>`
                    ).join('')}
                </div>
                ${issue.assignee ? `<div style="font-size: 12px; color: #64748b;">Assigned to ${issue.assignee.login}</div>` : ''}
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
        document.getElementById('loadingSpinner').style.display = 'flex';
        document.getElementById('contentGrid').style.display = 'none';
        this.hideError();
        this.hideEmptyState();
    }

    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('contentGrid').style.display = 'grid';
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
        document.getElementById('contentGrid').style.display = 'none';
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
        document.getElementById('contentGrid').style.display = 'none';
        document.getElementById('loadingSpinner').style.display = 'none';
        this.hideError();
        
        // Reset data info
        document.getElementById('dataCount').textContent = '-';
        document.getElementById('lastUpdated').textContent = 'Never';
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

    refreshData() {
        // Clear cache
        this.cache.clear();
        
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
        const sortSelect = document.getElementById('sortSelect');
        const userFilter = document.getElementById('userFilter');
        const clearUserFilter = document.getElementById('clearUserFilter');
        const clearAllFilters = document.getElementById('clearAllFilters');
        const userSuggestions = document.getElementById('userSuggestions');

        // Sort dropdown
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.issueFilters.sortBy = e.target.value;
                if (this.currentSection === 'issues') {
                    this.applyIssueFilters();
                }
                this.updateFilterActiveState();
            });
        }

        // User filter input
        if (userFilter) {
            let debounceTimeout;
            
            userFilter.addEventListener('input', (e) => {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    this.issueFilters.userFilter = e.target.value.trim();
                    if (this.currentSection === 'issues') {
                        this.applyIssueFilters();
                        this.showUserSuggestions(e.target.value.trim());
                    }
                    this.updateFilterActiveState();
                }, 300);
            });

            userFilter.addEventListener('focus', () => {
                if (this.currentSection === 'issues') {
                    this.showUserSuggestions(userFilter.value.trim());
                }
            });

            userFilter.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideUserSuggestions();
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateUserSuggestions(e.key === 'ArrowDown' ? 1 : -1);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.selectHighlightedSuggestion();
                }
            });
        }

        // Clear user filter button
        if (clearUserFilter) {
            clearUserFilter.addEventListener('click', () => {
                userFilter.value = '';
                this.issueFilters.userFilter = '';
                if (this.currentSection === 'issues') {
                    this.applyIssueFilters();
                }
                this.hideUserSuggestions();
                this.updateFilterActiveState();
            });
        }

        // Clear all filters button
        if (clearAllFilters) {
            clearAllFilters.addEventListener('click', () => {
                this.clearAllIssueFilters();
            });
        }

        // Click outside to hide suggestions
        document.addEventListener('click', (e) => {
            if (!userFilter?.contains(e.target) && !userSuggestions?.contains(e.target)) {
                this.hideUserSuggestions();
            }
        });
    }

    showIssueFilters() {
        const filtersPanel = document.getElementById('issueFilters');
        if (filtersPanel) {
            filtersPanel.style.display = 'flex';
        }
    }

    hideIssueFilters() {
        const filtersPanel = document.getElementById('issueFilters');
        if (filtersPanel) {
            filtersPanel.style.display = 'none';
        }
        this.hideUserSuggestions();
    }

    applyIssueFilters() {
        // Get current issue data from cache or re-render
        this.loadSection('issues');
    }

    filterAndSortIssues(issues) {
        let filteredIssues = [...issues];

        // Apply user filter
        if (this.issueFilters.userFilter) {
            const userQuery = this.issueFilters.userFilter.toLowerCase();
            filteredIssues = filteredIssues.filter(issue => 
                issue.user.login.toLowerCase().includes(userQuery)
            );
        }

        // Apply sorting
        if (this.issueFilters.sortBy === 'newest') {
            filteredIssues.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (this.issueFilters.sortBy === 'oldest') {
            filteredIssues.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }

        return filteredIssues;
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

    showUserSuggestions(query) {
        const userSuggestions = document.getElementById('userSuggestions');
        if (!userSuggestions || !this.issueFilters.availableUsers.size) return;

        const matchingUsers = Array.from(this.issueFilters.availableUsers)
            .filter(user => !query || user.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 8); // Limit to 8 suggestions

        if (matchingUsers.length === 0 || (query && matchingUsers.length === 1 && matchingUsers[0].toLowerCase() === query.toLowerCase())) {
            this.hideUserSuggestions();
            return;
        }

        userSuggestions.innerHTML = matchingUsers.map((user, index) => `
            <div class="user-suggestion" data-user="${this.escapeHtml(user)}" data-index="${index}">
                <div class="user-avatar" style="background-image: url('https://github.com/${user}.png?size=40')"></div>
                <span>${this.escapeHtml(user)}</span>
            </div>
        `).join('');

        // Add click handlers
        userSuggestions.querySelectorAll('.user-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                this.selectUserSuggestion(suggestion.dataset.user);
            });
        });

        userSuggestions.classList.add('show');
    }

    hideUserSuggestions() {
        const userSuggestions = document.getElementById('userSuggestions');
        if (userSuggestions) {
            userSuggestions.classList.remove('show');
        }
    }

    navigateUserSuggestions(direction) {
        const userSuggestions = document.getElementById('userSuggestions');
        if (!userSuggestions || !userSuggestions.classList.contains('show')) return;

        const suggestions = userSuggestions.querySelectorAll('.user-suggestion');
        const currentHighlighted = userSuggestions.querySelector('.highlighted');
        let newIndex = 0;

        if (currentHighlighted) {
            const currentIndex = parseInt(currentHighlighted.dataset.index);
            newIndex = currentIndex + direction;
        } else {
            newIndex = direction > 0 ? 0 : suggestions.length - 1;
        }

        // Wrap around
        if (newIndex < 0) newIndex = suggestions.length - 1;
        if (newIndex >= suggestions.length) newIndex = 0;

        // Update highlighting
        suggestions.forEach(s => s.classList.remove('highlighted'));
        if (suggestions[newIndex]) {
            suggestions[newIndex].classList.add('highlighted');
        }
    }

    selectHighlightedSuggestion() {
        const highlighted = document.querySelector('.user-suggestion.highlighted');
        if (highlighted) {
            this.selectUserSuggestion(highlighted.dataset.user);
        }
    }

    selectUserSuggestion(username) {
        const userFilter = document.getElementById('userFilter');
        if (userFilter) {
            userFilter.value = username;
            this.issueFilters.userFilter = username;
            if (this.currentSection === 'issues') {
                this.applyIssueFilters();
            }
            this.hideUserSuggestions();
            this.updateFilterActiveState();
        }
    }

    clearAllIssueFilters() {
        const sortSelect = document.getElementById('sortSelect');
        const userFilter = document.getElementById('userFilter');

        // Reset to defaults
        this.issueFilters.sortBy = 'newest';
        this.issueFilters.userFilter = '';

        // Update UI
        if (sortSelect) sortSelect.value = 'newest';
        if (userFilter) userFilter.value = '';

        // Apply filters
        if (this.currentSection === 'issues') {
            this.applyIssueFilters();
        }

        this.hideUserSuggestions();
        this.updateFilterActiveState();
    }

    updateFilterActiveState() {
        const sortSelect = document.getElementById('sortSelect');
        const userFilter = document.getElementById('userFilter');
        const sortGroup = sortSelect?.closest('.filter-group');
        const userGroup = userFilter?.closest('.filter-group');

        // Update sort filter active state
        if (sortGroup) {
            if (this.issueFilters.sortBy !== 'newest') {
                sortGroup.classList.add('filter-active');
            } else {
                sortGroup.classList.remove('filter-active');
            }
        }

        // Update user filter active state
        if (userGroup) {
            if (this.issueFilters.userFilter) {
                userGroup.classList.add('filter-active');
            } else {
                userGroup.classList.remove('filter-active');
            }
        }
    }

    // Pull request filtering methods
    filterAndSortPullRequests(prs) {
        let filteredPRs = [...prs];

        // Apply user filter
        if (this.pullRequestFilters.userFilter) {
            const userQuery = this.pullRequestFilters.userFilter.toLowerCase();
            filteredPRs = filteredPRs.filter(pr => 
                pr.user.login.toLowerCase().includes(userQuery)
            );
        }

        // Apply sorting
        if (this.pullRequestFilters.sortBy === 'newest') {
            filteredPRs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (this.pullRequestFilters.sortBy === 'oldest') {
            filteredPRs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }

        return filteredPRs;
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

    updatePRFilterActiveState() {
        const prSortSelect = document.getElementById('prSortSelect');
        const prUserFilter = document.getElementById('prUserFilter');
        const prSortGroup = prSortSelect?.closest('.filter-group');
        const prUserGroup = prUserFilter?.closest('.filter-group');

        // Update sort filter active state
        if (prSortGroup) {
            if (this.pullRequestFilters.sortBy !== 'newest') {
                prSortGroup.classList.add('filter-active');
            } else {
                prSortGroup.classList.remove('filter-active');
            }
        }

        // Update user filter active state
        if (prUserGroup) {
            if (this.pullRequestFilters.userFilter) {
                prUserGroup.classList.add('filter-active');
            } else {
                prUserGroup.classList.remove('filter-active');
            }
        }
    }

    // Pull request filtering methods
    setupPullRequestFilterListeners() {
        const prSortSelect = document.getElementById('prSortSelect');
        const prUserFilter = document.getElementById('prUserFilter');
        const prClearUserFilter = document.getElementById('prClearUserFilter');
        const prClearAllFilters = document.getElementById('prClearAllFilters');
        const prUserSuggestions = document.getElementById('prUserSuggestions');

        // Sort dropdown
        if (prSortSelect) {
            prSortSelect.addEventListener('change', (e) => {
                this.pullRequestFilters.sortBy = e.target.value;
                if (this.currentSection === 'pull-requests') {
                    this.applyPullRequestFilters();
                }
                this.updatePRFilterActiveState();
            });
        }

        // User filter input
        if (prUserFilter) {
            let debounceTimeout;
            
            prUserFilter.addEventListener('input', (e) => {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    this.pullRequestFilters.userFilter = e.target.value.trim();
                    if (this.currentSection === 'pull-requests') {
                        this.applyPullRequestFilters();
                        this.showPRUserSuggestions(e.target.value.trim());
                    }
                    this.updatePRFilterActiveState();
                }, 300);
            });

            prUserFilter.addEventListener('focus', () => {
                if (this.currentSection === 'pull-requests') {
                    this.showPRUserSuggestions(prUserFilter.value.trim());
                }
            });

            prUserFilter.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hidePRUserSuggestions();
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigatePRUserSuggestions(e.key === 'ArrowDown' ? 1 : -1);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.selectHighlightedPRSuggestion();
                }
            });
        }

        // Clear user filter button
        if (prClearUserFilter) {
            prClearUserFilter.addEventListener('click', () => {
                prUserFilter.value = '';
                this.pullRequestFilters.userFilter = '';
                if (this.currentSection === 'pull-requests') {
                    this.applyPullRequestFilters();
                }
                this.hidePRUserSuggestions();
                this.updatePRFilterActiveState();
            });
        }

        // Clear all filters button
        if (prClearAllFilters) {
            prClearAllFilters.addEventListener('click', () => {
                this.clearAllPullRequestFilters();
            });
        }

        // Click outside to hide suggestions
        document.addEventListener('click', (e) => {
            if (!prUserFilter?.contains(e.target) && !prUserSuggestions?.contains(e.target)) {
                this.hidePRUserSuggestions();
            }
        });
    }

    showPullRequestFilters() {
        const filtersPanel = document.getElementById('pullRequestFilters');
        if (filtersPanel) {
            filtersPanel.style.display = 'flex';
        }
    }

    hidePullRequestFilters() {
        const filtersPanel = document.getElementById('pullRequestFilters');
        if (filtersPanel) {
            filtersPanel.style.display = 'none';
        }
        this.hidePRUserSuggestions();
    }

    applyPullRequestFilters() {
        // Get current PR data from cache or re-render
        this.loadSection('pull-requests');
    }

    showPRUserSuggestions(query) {
        const prUserSuggestions = document.getElementById('prUserSuggestions');
        if (!prUserSuggestions || !this.pullRequestFilters.availableUsers.size) return;

        const matchingUsers = Array.from(this.pullRequestFilters.availableUsers)
            .filter(user => !query || user.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 8); // Limit to 8 suggestions

        if (matchingUsers.length === 0 || (query && matchingUsers.length === 1 && matchingUsers[0].toLowerCase() === query.toLowerCase())) {
            this.hidePRUserSuggestions();
            return;
        }

        prUserSuggestions.innerHTML = matchingUsers.map((user, index) => `
            <div class="user-suggestion" data-user="${this.escapeHtml(user)}" data-index="${index}">
                <div class="user-avatar" style="background-image: url('https://github.com/${user}.png?size=40')"></div>
                <span>${this.escapeHtml(user)}</span>
            </div>
        `).join('');

        // Add click handlers
        prUserSuggestions.querySelectorAll('.user-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                this.selectPRUserSuggestion(suggestion.dataset.user);
            });
        });

        prUserSuggestions.classList.add('show');
    }

    hidePRUserSuggestions() {
        const prUserSuggestions = document.getElementById('prUserSuggestions');
        if (prUserSuggestions) {
            prUserSuggestions.classList.remove('show');
        }
    }

    navigatePRUserSuggestions(direction) {
        const prUserSuggestions = document.getElementById('prUserSuggestions');
        if (!prUserSuggestions || !prUserSuggestions.classList.contains('show')) return;

        const suggestions = prUserSuggestions.querySelectorAll('.user-suggestion');
        const currentHighlighted = prUserSuggestions.querySelector('.highlighted');
        let newIndex = 0;

        if (currentHighlighted) {
            const currentIndex = parseInt(currentHighlighted.dataset.index);
            newIndex = currentIndex + direction;
        } else {
            newIndex = direction > 0 ? 0 : suggestions.length - 1;
        }

        // Wrap around
        if (newIndex < 0) newIndex = suggestions.length - 1;
        if (newIndex >= suggestions.length) newIndex = 0;

        // Update highlighting
        suggestions.forEach(s => s.classList.remove('highlighted'));
        if (suggestions[newIndex]) {
            suggestions[newIndex].classList.add('highlighted');
        }
    }

    selectHighlightedPRSuggestion() {
        const highlighted = document.querySelector('#prUserSuggestions .user-suggestion.highlighted');
        if (highlighted) {
            this.selectPRUserSuggestion(highlighted.dataset.user);
        }
    }

    selectPRUserSuggestion(username) {
        const prUserFilter = document.getElementById('prUserFilter');
        if (prUserFilter) {
            prUserFilter.value = username;
            this.pullRequestFilters.userFilter = username;
            if (this.currentSection === 'pull-requests') {
                this.applyPullRequestFilters();
            }
            this.hidePRUserSuggestions();
            this.updatePRFilterActiveState();
        }
    }

    clearAllPullRequestFilters() {
        const prSortSelect = document.getElementById('prSortSelect');
        const prUserFilter = document.getElementById('prUserFilter');

        // Reset to defaults
        this.pullRequestFilters.sortBy = 'newest';
        this.pullRequestFilters.userFilter = '';

        // Update UI
        if (prSortSelect) prSortSelect.value = 'newest';
        if (prUserFilter) prUserFilter.value = '';

        // Apply filters
        if (this.currentSection === 'pull-requests') {
            this.applyPullRequestFilters();
        }

        this.hidePRUserSuggestions();
        this.updatePRFilterActiveState();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Show loading state
        document.getElementById('loadingSpinner').style.display = 'flex';
        document.getElementById('errorMessage').style.display = 'none';
        
        // Try to load GitHub token from AWS Secrets Manager (optional)
        if (window.GitHubConfig && window.GitHubConfig.loadToken) {
            // once we figure out how to hook up api gateway to github pages uncomment
            // the lines below.
            window.GitHubConfig.token = null;
            // try {
            //     console.log('Attempting to load GitHub token from AWS Secrets Manager...');
            //     await window.GitHubConfig.loadToken();
            //     console.log('GitHub token loaded successfully');
            // } catch (tokenError) {
            //     console.warn('Could not load GitHub token, continuing with public API:', tokenError.message);
            //     // Clear any existing token to ensure we use public API
            //     if (window.GitHubConfig) {
            //         window.GitHubConfig.token = null;
            //     }
            // }
        } else {
            console.log('No token loading configured, using public GitHub API');
        }
        
        // Initialize dashboard (works with or without token)
        new GitHubDashboard();
        
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        
        // Show error message but still try to initialize
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.style.display = 'flex';
            document.getElementById('errorText').textContent = 
                `Initialization warning: ${error.message}. Dashboard will use public GitHub API with rate limits.`;
            
            // Auto-hide error after 5 seconds since dashboard still works
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
        
        document.getElementById('loadingSpinner').style.display = 'none';
        
        // Initialize dashboard anyway - it should work with public API
        try {
            new GitHubDashboard();
        } catch (dashboardError) {
            console.error('Dashboard initialization failed:', dashboardError);
        }
    }
});
