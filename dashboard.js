// GitHub Dashboard JavaScript
class GitHubDashboard {
    constructor() {
        this.config = window.GitHubConfig;
        this.currentSection = 'dashboard'; // Start with dashboard
        this.currentRepository = null; // For detailed views
        this.cache = new Map();
        this.isAuthenticated = false;
        this.rateLimitInfo = null;
        
        // Dashboard data cache
        this.dashboardCache = {
            data: null,
            timestamp: null
        };
        
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
        // Load session token if available
        this.loadSessionToken();
        this.setupEventListeners();
        this.populateRepositorySelect();
        this.loadSection(this.currentSection);
        
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
                    
                    this.loadSection(this.currentSection);
                });
            }
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // Handle browser back/forward
        window.addEventListener('hashchange', () => {
            const section = window.location.hash.slice(1) || 'dashboard';
            if (section !== this.currentSection) {
                this.switchSection(section);
            }
        });

        // Load initial hash
        if (window.location.hash) {
            const section = window.location.hash.slice(1);
            if (['dashboard', 'pull-requests', 'issues', 'actions', 'duvet'].includes(section)) {
                this.currentSection = section;
            }
        }

        // Filter event listeners
        this.setupIssueFilterListeners();
        this.setupPullRequestFilterListeners();
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

        // For detailed views, check if repository is selected
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

            this.renderSectionData(section, data);
            this.updateSectionDataInfo(section, data.length);
            
        } catch (error) {
            console.error('Error loading section:', error);
            this.showError(`Failed to load ${section.replace('-', ' ')}`);
        }
    }

    async loadDashboard() {
        this.showLoading();
        
        try {
            // For shields.io badges, we don't need to fetch data - badges are live
            this.renderDashboard();
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Failed to load dashboard');
        }
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
                                    <img src="https://img.shields.io/github/actions/workflow/status/${repo.owner}/${repo.name}/${workflowFile}?style=flat&label=CI" 
                                         alt="Daily CI Status for ${repo.displayName}" 
                                         loading="lazy"
                                         onload="this.classList.add('loaded')"
                                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCA4MCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjOTk5Ii8+Cjx0ZXh0IHg9IjQwIiB5PSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNmZmYiPk4vQTwvdGV4dD4KPHN2Zz4K'" />
                                `;
                            } else {
                                // No workflows configured - show N/A badge
                                dailyCIBadge = `
                                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCA4MCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjOTk5Ii8+Cjx0ZXh0IHg9IjQwIiB5PSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNmZmYiPk4vQTwvdGV4dD4KPHN2Zz4K" 
                                         alt="NA" 
                                         loading="lazy"
                                         onload="this.classList.add('loaded')" />
                                `;
                            }
                            
                            return `
                                <tr>
                                    <td class="repo-name">${repo.displayName}</td>
                                    <td class="badge-cell">
                                        <img src="https://img.shields.io/github/issues/${repo.owner}/${repo.name}?style=flat" 
                                             alt="Open Issues for ${repo.displayName}" 
                                             loading="lazy"
                                             onload="this.classList.add('loaded')"
                                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCA4MCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjY2NjIi8+Cjx0ZXh0IHg9IjQwIiB5PSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNmZmYiPkVycm9yPC90ZXh0Pgo8L3N2Zz4K'" />
                                    </td>
                                    <td class="badge-cell">
                                        <img src="https://img.shields.io/github/issues-pr/${repo.owner}/${repo.name}?style=flat&label=PRs" 
                                             alt="Open Pull Requests for ${repo.displayName}" 
                                             loading="lazy"
                                             onload="this.classList.add('loaded')"
                                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCA4MCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjY2NjIi8+Cjx0ZXh0IHg9IjQwIiB5PSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiNmZmYiPkVycm9yPC90ZXh0Pgo8L3N2Zz4K'" />
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
