mermaid.initialize({ startOnLoad: true });

function hideArticleChildren(root = document) {
  const links = root.querySelectorAll('.chapter a[href$="articles/index.html"]');
  for (const link of links) {
    const wrapper = link.closest('.chapter-link-wrapper');
    const item = wrapper && wrapper.parentElement;
    if (!item || !item.classList.contains('chapter-item')) {
      continue;
    }

    for (const child of item.children) {
      if (child.tagName === 'OL' && child.classList.contains('section')) {
        child.style.display = 'none';
      }
    }
  }
}

function initArticleSidebarHiding() {
  hideArticleChildren();

  const observer = new MutationObserver(() => {
    hideArticleChildren();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initArticleSidebarHiding);
} else {
  initArticleSidebarHiding();
}
