/* const GH_USER = 'Ianachi09'; 
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// ── PAGE ROUTING & UI ──
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.topnav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
  window.scrollTo(0, 0);
  if (page === 'projects' && !window._projLoaded) loadProjects();
  if (page === 'about') loadAboutStats();
}

// ── ENHANCED GITHUB API FETCHING WITH CACHING ──
async function ghFetch(path) {
  const cacheKey = `gh_cache_${path}`;
  const cachedData = localStorage.getItem(cacheKey);
  const cacheTimestamp = localStorage.getItem(`${cacheKey}_time`);

  // Check if we have valid cached data that is less than 1 hour old
  if (cachedData && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      console.log(`Loading ${path} from cache...`);
      return JSON.parse(cachedData);
  }

  // If no valid cache, fetch from the actual API
  console.log(`Fetching ${path} from GitHub API...`);
  const res = await fetch(`https://api.github.com/users/${GH_USER}${path}`, {
    headers: { 'Accept': 'application/vnd.github.v3+json' }
  });
  
  if (!res.ok) throw new Error(res.status);
  
  const data = await res.json();
  
  // Save the new data and timestamp to the cache
  localStorage.setItem(cacheKey, JSON.stringify(data));
  localStorage.setItem(`${cacheKey}_time`, Date.now());
  
  return data;
}

// ── FETCH ACTUAL CONTRIBUTIONS ──
async function fetchContributions(username) {
  const cacheKey = `gh_contrib_cache_${username}`;
  const cachedData = localStorage.getItem(cacheKey);
  const cacheTimestamp = localStorage.getItem(`${cacheKey}_time`);

  // 1. Check the local browser notebook (cache) first
  if (cachedData && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      console.log(`Loading contributions from cache...`);
      return JSON.parse(cachedData);
  }

  // 2. Fetch from a community scraper API
  console.log(`Fetching real contributions for ${username}...`);
  const res = await fetch(`https://github-contributions-api.deno.dev/${username}.json`);
  
  if (!res.ok) throw new Error('Failed to fetch contributions');
  
  const data = await res.json();
  // 3. Extract the total number
  const total = data.totalContributions || 0; 

  // 4. Save to cache
  localStorage.setItem(cacheKey, JSON.stringify(total));
  localStorage.setItem(`${cacheKey}_time`, Date.now());
  
  return total;
}

// ── DATA LOADING ──
async function loadHomeStats() {
  try {
    const user = await ghFetch('');
    const repos = await ghFetch('/repos?per_page=100&sort=updated');
    
    // Fetch the real contributions here
    const contribs = await fetchContributions(GH_USER); 

    document.getElementById('gh-repos').textContent = user.public_repos;
    
    // Update the DOM with the real number
    document.getElementById('contrib-count').textContent = contribs; 

    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
    document.getElementById('gh-stars').textContent = totalStars;
    document.getElementById('gh-streak').textContent = '🔥 active';
  } catch(e) {
    console.error("Failed to load home stats:", e);
  }
}

async function loadAboutStats() {
  if (window._aboutLoaded) return;
  window._aboutLoaded = true;
  try {
    const user = await ghFetch('');
    const repos = await ghFetch('/repos?per_page=100');
    
    // Fetch the real contributions here too
    const contribs = await fetchContributions(GH_USER);

    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
    document.getElementById('about-repos').textContent = user.public_repos;
    document.getElementById('about-stars').textContent = totalStars;
    
    // Update the DOM with the real number
    document.getElementById('about-contribs').textContent = contribs;
  } catch(e) {
    console.error("Failed to load about stats:", e);
  }
}

function catClass(cat) {
  if (cat === 'assignment') return 'cat-assignment';
  if (cat === 'open-source') return 'cat-open-source';
  return 'cat-personal';
}

async function loadProjects() {
  window._projLoaded = true;
  const list = document.getElementById('project-list');
  try {
    const repos = await ghFetch('/repos?per_page=100&sort=updated');
    const filtered = repos.filter(r => !r.fork && !r.private);

    window._allProjects = filtered.map((r, i) => ({
      name: r.name,
      desc: r.description || 'no description yet.',
      url: r.html_url,
      homepage: r.homepage,
      lang: r.language,
      stars: r.stargazers_count,
      topics: r.topics || [],
      cat: detectCategory(r),
      emoji: EMOJIS[i % EMOJIS.length],
      updated: r.updated_at,
    }));

    renderProjects('all');
  } catch(e) {
    list.innerHTML = '<div class="page-loading"><span>failed to fetch repositories. api limit reached?</span></div>';
  }
}

function renderProjects(filter) {
  const list = document.getElementById('project-list');
  const projects = window._allProjects || [];
  const shown = filter === 'all' ? projects : projects.filter(p => p.cat === filter);

  if (shown.length === 0) {
    list.innerHTML = '<div class="page-loading"><span>no projects in this category yet.</span></div>';
    return;
  }

  list.innerHTML = shown.map(p => `
    <div class="project-card" data-cat="${p.cat}">
      <div class="project-thumb">${p.emoji}</div>
      <div class="project-content">
        <div class="project-meta">
          <div class="project-title">${p.name}</div>
          <span class="project-cat ${catClass(p.cat)}">${p.cat}</span>
        </div>
        <p class="project-desc">${p.desc}</p>
        <div class="project-tags">
          ${p.lang ? `<span class="lang-tag">${p.lang}</span>` : ''}
          ${p.stars > 0 ? `<span class="lang-tag">★ ${p.stars}</span>` : ''}
          ${p.topics.slice(0, 3).map(t => `<span class="lang-tag">${t}</span>`).join('')}
        </div>
        <div class="project-links">
          <a href="${p.url}" target="_blank" class="project-link">⌨ view repo →</a>
          ${p.homepage ? `<a href="${p.homepage}" target="_blank" class="project-link">🌐 live demo →</a>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function filterProjects(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProjects(btn.dataset.filter);
}

function submitForm(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  const status = document.getElementById('form-status');
  btn.textContent = 'sending…';
  btn.disabled = true;
  
  // Note: Formspree or Web3Forms implementation goes here
  
  setTimeout(() => {
    btn.textContent = 'send message →';
    btn.disabled = false;
    status.style.display = 'block';
    status.textContent = '✓ message sent! i\'ll reply soon ♡';
    document.getElementById('contact-form').reset();
    setTimeout(() => status.style.display = 'none', 4000);
  }, 900);
}

// ── INIT ──
loadHomeStats(); */






// ── CONFIGURATION ──
const GH_USER = 'Ianachi09'; 
const PORTFOLIO_REPO = 'ianachi09/ianachi-website-portfolio';

// ⚠️ IMPORTANT: You must list the exact folder names from your repo here
const PROJECT_FOLDERS = [
  'project-one',  // Example: Change this to your real folder name
  'project-two'   // Example: Change this to your real folder name
];

const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// ── PAGE ROUTING & UI ──
// 1. Define the physical order of your pages
const pageOrder = ['home', 'about', 'padlet', 'projects', 'contact'];
let currentPage = 'home'; // Keep track of where the user is

function showPage(targetPage) {
  // Don't do anything if they click the button for the page they are already on
  if (targetPage === currentPage) return; 

  // Find out if we are moving forward (e.g. Home to About) or backward (About to Home)
  const currentIndex = pageOrder.indexOf(currentPage);
  const targetIndex = pageOrder.indexOf(targetPage);
  const isForward = targetIndex > currentIndex;

  const currentEl = document.getElementById('page-' + currentPage);
  const targetEl = document.getElementById('page-' + targetPage);

  // -- ANIMATION SETUP --
  // Temporarily turn off the animation transition to secretly move the target page into its starting position
  targetEl.style.transition = 'none';
  targetEl.classList.remove('out-left', 'out-right');
  
  // If moving forward, start the new page on the right. If backward, start on the left.
  targetEl.classList.add(isForward ? 'out-right' : 'out-left');

  // Trigger a browser reflow (Explanation below)
  void targetEl.offsetWidth;

  // Turn the smooth animation back on
  targetEl.style.transition = '';

  // -- EXECUTE SWIPE --
  // Slide the old page out
  currentEl.classList.remove('active');
  currentEl.classList.add(isForward ? 'out-left' : 'out-right');

  // Slide the new page in to the center
  targetEl.classList.remove('out-left', 'out-right');
  targetEl.classList.add('active');

  // -- UPDATE UI --
  document.querySelectorAll('.topnav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === targetPage);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (targetPage === 'projects' && !window._projLoaded) loadProjects();
  if (targetPage === 'about' && !window._aboutLoaded) loadFullAbout();
  if (targetPage === 'padlet' && !window._padletLoaded) loadPadletCards();

  // Update our tracker
  currentPage = targetPage;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

let footerVisible = false;
window.addEventListener('scroll', () => {
  const shouldShow = window.scrollY > 300;
  if (shouldShow !== footerVisible) {
    footerVisible = shouldShow;
    document.getElementById('sticky-footer').classList.toggle('visible', shouldShow);
  }
});

// ── ENHANCED GITHUB API FETCHING (STATS ONLY) ──
async function ghFetch(path) {
  const cacheKey = `gh_cache_${path}`;
  const cachedData = localStorage.getItem(cacheKey);
  const cacheTimestamp = localStorage.getItem(`${cacheKey}_time`);

  if (cachedData && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      return JSON.parse(cachedData);
  }

  const res = await fetch(`https://api.github.com/users/${GH_USER}${path}`, {
    headers: { 'Accept': 'application/vnd.github.v3+json' }
  });
  
  if (!res.ok) throw new Error(res.status);
  const data = await res.json();
  
  localStorage.setItem(cacheKey, JSON.stringify(data));
  localStorage.setItem(`${cacheKey}_time`, Date.now());
  return data;
}

async function fetchContributions(username) {
  const cacheKey = `gh_contrib_cache_${username}`;
  const cachedData = localStorage.getItem(cacheKey);
  const cacheTimestamp = localStorage.getItem(`${cacheKey}_time`);

  if (cachedData && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      return JSON.parse(cachedData);
  }

  const res = await fetch(`https://github-contributions-api.deno.dev/${username}.json`);
  if (!res.ok) return 0; // Fallback if scraper fails
  
  const data = await res.json();
  const total = data.totalContributions || 0; 

  localStorage.setItem(cacheKey, JSON.stringify(total));
  localStorage.setItem(`${cacheKey}_time`, Date.now());
  return total;
}

// ── DATA LOADING ──
async function loadHomeStats() {
  try {
    const user = await ghFetch('');
    const repos = await ghFetch('/repos?per_page=100&sort=updated');
    const contribs = await fetchContributions(GH_USER); 

    // We create an image tag using the avatar_url provided by GitHub
    const avatarHtml = `<img src="${user.avatar_url}" alt="Profile Picture">`;
    // We inject it into the sidebar
    document.getElementById('sidebar-avatar-img').innerHTML = avatarHtml;

    document.getElementById('gh-repos').textContent = user.public_repos;
    document.getElementById('contrib-count').textContent = contribs; 

    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
    document.getElementById('gh-stars').textContent = totalStars;
    document.getElementById('gh-streak').textContent = '🔥 active';
  } catch(e) {
    console.error("Failed to load home stats:", e);
  }
}

/* async function loadAboutStats() {
  if (window._aboutLoaded) return;
  window._aboutLoaded = true;
  try {
    const user = await ghFetch('');
    const repos = await ghFetch('/repos?per_page=100');
    const contribs = await fetchContributions(GH_USER);

    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
    document.getElementById('about-repos').textContent = user.public_repos;
    document.getElementById('about-stars').textContent = totalStars;
    document.getElementById('about-contribs').textContent = contribs;
  } catch(e) {}
} */

// 2. Replace the old loadAboutStats function with this:
async function loadFullAbout() {
  window._aboutLoaded = true;
  const container = document.getElementById('about-markdown-content');

  try {
    // 1. Load the compact stats (using our existing cache system)
    const user = await ghFetch('');
    const repos = await ghFetch('/repos?per_page=100');
    const contribs = await fetchContributions(GH_USER);
    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);

    // Inject the same image into the About page card
    const avatarHtml = `<img src="${user.avatar_url}" alt="Profile Picture">`;
    document.getElementById('about-avatar-img').innerHTML = avatarHtml;

    document.getElementById('about-repos-compact').textContent = user.public_repos;
    document.getElementById('about-stars-compact').textContent = totalStars;
    document.getElementById('about-contribs-compact').textContent = contribs;

    // 2. Fetch the about.md file directly from this website's repository
    const mdResponse = await fetch('src/about.md');
    
    if (!mdResponse.ok) throw new Error("Could not find about.md");
    
    const mdText = await mdResponse.text();

    // 3. Use Marked.js to translate the markdown into HTML and inject it
    container.innerHTML = marked.parse(mdText);

  } catch (e) {
    console.error(e);
    container.innerHTML = '<p style="color: red;">Failed to load about.md. Make sure the file exists in your repository!</p>';
  }
}

async function loadPadletCards() {
  window._padletLoaded = true;
  const container = document.getElementById('padlet-container');
  
  try {
    // 1. Download the text file
    const response = await fetch('src/padlet-data.txt');
    if (!response.ok) throw new Error("Could not find padlet-data.txt");
    
    // 2. Read the text inside the file
    const rawText = await response.text();
    
    // 3. Chop the text into blocks every time there is a "---"
    const blocks = rawText.split('---');
    
    let html = '';
    
    // 4. Loop through each block of text
    for (let block of blocks) {
      // Clean up empty spaces and split the block into individual lines
      const lines = block.trim().split('\n').map(line => line.trim()).filter(line => line !== '');
      
      // Safety check: Only build a card if we have at least a Title, Image, and Description
      if (lines.length >= 3) {
        const title = lines[0];       // The first line is the title
        const imageFile = lines[1];   // The second line is the image name
        const desc = lines.slice(2).join('<br>'); // Everything else is the description
        
        // Build the HTML for this specific card
        html += `
          <div class="padlet-card">
            <div class="padlet-header">
              <h3 class="padlet-title">${title}</h3>
            </div>
            
            <img src="src/${imageFile}" alt="${title}" class="padlet-img" loading="lazy">
            
            <div class="padlet-content">
              <p class="padlet-desc">${desc}</p>
            </div>
          </div>
        `;
      }
    }
    
    // 5. Inject all the generated cards into the page
    container.innerHTML = html;
    
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="page-loading"><span>failed to load padlet notes. make sure src/padlet-data.txt exists!</span></div>';
  }
}

// ── PROJECTS LOADING (FROM RAW GITHUB CONTENT) ──
// ── DYNAMIC PROJECTS LOADING ──
async function loadProjects() {
  window._projLoaded = true;
  const container = document.getElementById('project-list');
  container.innerHTML = '<div class="page-loading"><span>scanning all repositories for web_src...</span></div>';
  container.className = 'project-container'; 

  try {
    // Step A: Get a list of all your public repositories
    const allRepos = await ghFetch('/repos?per_page=100&sort=updated');
    const publicRepos = allRepos; //.filter(repo => !repo.fork); // filter is for forked project

    // Step B: Guess-and-check every repository for the info.md file
    const projectsHtml = await Promise.all(publicRepos.map(async (repo) => {
      const repoName = repo.name;

      const repoUrl = repo.html_url;
      
      // Look specifically for the web_src folder in the main branch
      const baseUrl = `https://raw.githubusercontent.com/${GH_USER}/${repoName}/main/web_src`;
      
      try {
        const mdResponse = await fetch(`${baseUrl}/info.md`);
        
        // If the file doesn't exist, silently return an empty string
        if (!mdResponse.ok) return ''; 
        
        const mdText = await mdResponse.text();
        const lines = mdText.split('\n').map(line => line.trim());
        
        // Safety check: skip if the file is empty or missing lines
        if (lines.length < 4) return '';

        const title = lines[0];
        const category = lines[1]; 
        const imageName = lines[2];
        const description = lines.slice(3).join('<br>'); 
        
        const imageUrl = `${baseUrl}/${imageName}`;
        const catClass = `cat-${category}`; 

        return `
          <div class="custom-project-card" data-cat="${category}" onclick="window.open('${repoUrl}', '_blank')">
            <div class="card-header">
              <h3 class="card-title">${title}</h3>
              <span class="card-category ${catClass}">${category}</span>
            </div>
            <img class="card-media" src="${imageUrl}" alt="${title} preview" loading="lazy" onerror="this.style.display='none'">
            <p class="card-description">${description}</p>
          </div>
        `;
      } catch (error) {
        // Catch network errors and ignore them
        return '';
      }
    }));

    // Step C: Filter out all the empty strings and display the ones we found
    const validProjects = projectsHtml.filter(html => html !== '');
    
    if (validProjects.length === 0) {
        container.innerHTML = '<div class="page-loading"><span>no projects with web_src/info.md found.</span></div>';
    } else {
        container.innerHTML = validProjects.join('');
    }
    
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="page-loading"><span>failed to load projects.</span></div>';
  }
}

// ── FILTERING LOGIC ──
function filterProjects(btn) {
  // Update active button styling
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  const filterValue = btn.dataset.filter; // 'all', 'personal', etc.
  const cards = document.querySelectorAll('.custom-project-card');

  // Show/Hide cards based on data-cat attribute
  cards.forEach(card => {
    if (filterValue === 'all' || card.dataset.cat === filterValue) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// ── CONTACT FORM ──
function submitForm(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  const status = document.getElementById('form-status');
  btn.textContent = 'sending…';
  btn.disabled = true;
  
  // Note: Replace with actual backend logic (like Formspree) later
  setTimeout(() => {
    btn.textContent = 'send message →';
    btn.disabled = false;
    status.style.display = 'block';
    status.textContent = '✓ message sent! i\'ll reply soon ♡';
    document.getElementById('contact-form').reset();
    setTimeout(() => status.style.display = 'none', 4000);
  }, 900);
}
// ── SCATTERED BACKGROUND LOGIC ──
function createFallingBackground() {
  const container = document.getElementById('falling-bg-container');
  const itemCount = 15; // The number of characters on screen at once

  for (let i = 0; i < itemCount; i++) {
    const img = document.createElement('img');
    img.src = 'src/cinna_bg.png'; // Points to your local image
    img.classList.add('falling-item');

    // Randomize the starting horizontal position (0% to 100% of screen width)
    const startPosX = Math.random() * 100; 
    
    // Randomize the size of each character (between 25px and 65px)
    const size = 100 + (Math.random() * 40); 
    
    // Randomize how slowly they fall (between 12 and 27 seconds)
    const fallDuration = 12 + (Math.random() * 15); 
    
    // Randomize the start delay so they don't all fall in a straight line
    const delay = Math.random() * -20; 

    // Apply the random math to the actual CSS of the image
    img.style.left = startPosX + 'vw';
    img.style.width = size + 'px';
    img.style.animationDuration = fallDuration + 's';
    img.style.animationDelay = delay + 's';

    // Add the newly created image into our HTML container
    container.appendChild(img);
  }
}

// ── INIT ──
loadHomeStats();
createFallingBackground(); // <--- Add this line to start the effect
// ── INIT ──
loadHomeStats();