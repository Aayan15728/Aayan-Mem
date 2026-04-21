document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Add Copy Buttons to all <pre> blocks
  document.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    if (!code) return;

    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.innerHTML = `<i data-lucide="copy"></i><span>Copy</span>`;
    pre.appendChild(btn);

    if (window.lucide) {
      window.lucide.createIcons({
        attrs: { 'stroke-width': 2, 'stroke': 'currentColor' },
        name: 'copy',
        node: btn.querySelector('i')
      });
    }

    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        btn.classList.add('copied');
        btn.innerHTML = `<i data-lucide="check"></i><span>Copied!</span>`;
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = `<i data-lucide="copy"></i><span>Copy</span>`;
          if (window.lucide) window.lucide.createIcons();
        }, 2000);
      } catch (err) { console.error('Failed to copy!', err); }
    });
  });

  // --- SEARCH FUNCTIONALITY ---
  // Embedded Index to support local file:/// access
  const rawIndex = [
  {
    "title": "Accountability Engine",
    "h1": "Accountability Engine",
    "content": "The Accountability Engine is the reasoning core of .Aayan-Mem. It is designed to slow down the agent's impulse to code and force a rigorous analysis of the architectural impact.",
    "path": "accountability.html"
  },
  {
    "title": "Agent Integration",
    "h1": "Agent Integration",
    "content": "Learn how to \"teach\" any AI agent (Claude, GPT-4, Gemini) to utilize the .Aayan-Mem framework effectively.",
    "path": "agent-integration.html"
  },
  {
    "title": "Best Practices",
    "h1": "Best Practices",
    "content": "To get the most out of .Aayan-Mem, you and your agent must maintain a high level of \"Memory Discipline.\"",
    "path": "best-practices.html"
  },
  {
    "title": "Command List",
    "h1": "Command List (v2.0.0)",
    "content": "The a-mem CLI is the primary bridge between the AI agent and the memory framework. Commands: init, coldstart, new, close, sync, find, status, log.",
    "path": "commands.html"
  },
  {
    "title": "A-MEM vs RAG",
    "h1": "A-MEM vs RAG",
    "content": "Standard RAG systems treat your codebase as a \"bag of words\". .Aayan-Mem treats your codebase as a living logic system to be audited.",
    "path": "comparisons.html"
  },
  {
    "title": "Features",
    "h1": "Key Features",
    "content": "Explore the advanced capabilities of .Aayan-Mem: Zero Token Leaks, Hallucination Guard, Decision Matrices, Contradiction Engine.",
    "path": "features.html"
  },
  {
    "title": "Stopping Hallucinations",
    "h1": "Stopping Hallucinations",
    "content": "Hallucination is the single biggest failure point of AI agents. .Aayan-Mem solves this using a physical and logical tethering system.",
    "path": "hallucinations.html"
  },
  {
    "title": "Introduction",
    "h1": "Introduction",
    "content": "Welcome to .Aayan-Mem, a high-performance memory and reasoning framework built to eliminate AI agent hallucinations and logic drift.",
    "path": "index.html"
  },
  {
    "title": "Installation",
    "h1": "Installation",
    "content": "Setting up .Aayan-Mem is a matter of seconds. Zero-dependency architecture running on Node.js.",
    "path": "installation.html"
  },
  {
    "title": "Decision Matrices",
    "h1": "Decision Matrices",
    "content": "A Decision Matrix is a rigorous simulation framework used to evaluate multiple implementation strategies.",
    "path": "matrices.html"
  },
  {
    "title": "Quick Start",
    "h1": "Quick Start Guide",
    "content": "Follow these steps to initialize .Aayan-Mem v2.0.0: Init, Coldstart, New, Close.",
    "path": "quickstart.html"
  },
  {
    "title": "Recall Engine",
    "h1": "Recall Engine",
    "content": "The Recall Engine provides the \"Static Truth\" for your project: App-Goal.md, Stack.md, rules.md.",
    "path": "recall.html"
  },
  {
    "title": "Operational Rules",
    "h1": "The 8 Operational Rules",
    "content": "To ensure a zero-hallucination environment, all AI agents must strictly adhere to the 8 operational rules.",
    "path": "rules.html"
  },
  {
    "title": "Security & Privacy",
    "h1": "Security & Privacy",
    "content": "Data sovereignty is at the heart of .Aayan-Mem. Local-First Architecture. Zero-Telemetry Guarantee.",
    "path": "security-privacy.html"
  },
  {
    "title": "Token Optimization",
    "h1": "Token Optimization",
    "content": "Reduce token consumption by up to 90% compared to traditional methods using surgical snippet searches.",
    "path": "token-optimization.html"
  }
];

  const isDocsPage = window.location.pathname.includes('/docs/');
  const searchIndex = rawIndex.map(item => ({
    ...item,
    path: isDocsPage ? item.path : 'docs/' + item.path
  }));

  const modal = document.createElement('div');
  modal.className = 'search-modal';
  modal.innerHTML = `
    <div class="search-modal-content">
      <div class="search-modal-header">
        <i data-lucide="search"></i>
        <input type="text" placeholder="Search documentation..." id="search-input" autocomplete="off">
      </div>
      <div class="search-results" id="search-results"></div>
    </div>
  `;
  document.body.appendChild(modal);
  if (window.lucide) window.lucide.createIcons();

  const input = modal.querySelector('#search-input');
  const resultsContainer = modal.querySelector('#search-results');
  const triggers = document.querySelectorAll('.search-trigger');

  const openSearch = () => {
    modal.classList.add('active');
    setTimeout(() => input.focus(), 10);
  };

  const closeSearch = () => {
    modal.classList.remove('active');
    input.value = '';
    resultsContainer.innerHTML = '';
  };

  triggers.forEach(t => t.addEventListener('click', openSearch));

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape') closeSearch();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSearch();
  });

  input.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    if (!term) {
      resultsContainer.innerHTML = '';
      return;
    }

    const filtered = searchIndex.filter(item => 
      (item.title && item.title.toLowerCase().includes(term)) || 
      (item.h1 && item.h1.toLowerCase().includes(term)) || 
      (item.content && item.content.toLowerCase().includes(term))
    ).slice(0, 8);

    if (filtered.length === 0) {
      resultsContainer.innerHTML = '<div style="padding: 20px; color: var(--text-dim); text-align: center;">No results found.</div>';
      return;
    }

    resultsContainer.innerHTML = filtered.map((res, i) => `
      <a href="${res.path}" class="search-result-item ${i === 0 ? 'selected' : ''}">
        <span class="res-title">${res.title}</span>
        <span class="res-snippet">${res.content}</span>
        <span class="res-path">${res.path}</span>
      </a>
    `).join('');
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const selected = resultsContainer.querySelector('.search-result-item.selected');
      if (selected) {
        window.location.href = selected.href;
      }
    }
    // Simple up/down navigation
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = Array.from(resultsContainer.querySelectorAll('.search-result-item'));
      const currentIndex = items.findIndex(item => item.classList.contains('selected'));
      if (items.length > 0) {
        items[currentIndex]?.classList.remove('selected');
        let nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= items.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = items.length - 1;
        items[nextIndex].classList.add('selected');
        e.preventDefault();
      }
    }
  });
});
