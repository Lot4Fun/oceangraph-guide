// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded "><a href="introduction/index.html"><strong aria-hidden="true">1.</strong> Introduction</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="introduction/features.html"><strong aria-hidden="true">1.1.</strong> Features</a></li></ol></li><li class="chapter-item expanded "><a href="app_guide/index.html"><strong aria-hidden="true">2.</strong> App Guide</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="app_guide/data_guide/index.html"><strong aria-hidden="true">2.1.</strong> Data guide</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="app_guide/data_guide/data_source.html"><strong aria-hidden="true">2.1.1.</strong> Data source</a></li><li class="chapter-item expanded "><a href="app_guide/data_guide/data_filtering_policy.html"><strong aria-hidden="true">2.1.2.</strong> Data filtering policy</a></li><li class="chapter-item expanded "><a href="app_guide/data_guide/limitations.html"><strong aria-hidden="true">2.1.3.</strong> Limitations</a></li></ol></li><li class="chapter-item expanded "><a href="app_guide/usage_guide/index.html"><strong aria-hidden="true">2.2.</strong> Usage guide</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="app_guide/usage_guide/searching_and_analyzing_argo_floats/index.html"><strong aria-hidden="true">2.2.1.</strong> Searching and Analyzing Argo Floats</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="app_guide/usage_guide/searching_and_analyzing_argo_floats/search_and_bookmark.html"><strong aria-hidden="true">2.2.1.1.</strong> Search and Bookmark</a></li><li class="chapter-item expanded "><a href="app_guide/usage_guide/searching_and_analyzing_argo_floats/trajectory_and_time_series_vertical_section.html"><strong aria-hidden="true">2.2.1.2.</strong> Trajectory and Time-Series Vertical Section</a></li><li class="chapter-item expanded "><a href="app_guide/usage_guide/searching_and_analyzing_argo_floats/t_s_diagram.html"><strong aria-hidden="true">2.2.1.3.</strong> θ-S Diagram</a></li><li class="chapter-item expanded "><a href="app_guide/usage_guide/searching_and_analyzing_argo_floats/clustering.html"><strong aria-hidden="true">2.2.1.4.</strong> Clustering</a></li><li class="chapter-item expanded "><a href="app_guide/usage_guide/searching_and_analyzing_argo_floats/mixed_layer_depth.html"><strong aria-hidden="true">2.2.1.5.</strong> Mixed Layer Depth (MLD)</a></li><li class="chapter-item expanded "><a href="app_guide/usage_guide/searching_and_analyzing_argo_floats/subsurface_oxygen_maximum.html"><strong aria-hidden="true">2.2.1.6.</strong> Subsurface Oxygen Maximum (SOM)</a></li></ol></li><li class="chapter-item expanded "><a href="app_guide/usage_guide/exploring_analysis_results/index.html"><strong aria-hidden="true">2.2.2.</strong> Exploring Analysis Results</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="app_guide/usage_guide/exploring_analysis_results/visual_lab/index.html"><strong aria-hidden="true">2.2.2.1.</strong> Visual Lab</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="app_guide/usage_guide/exploring_analysis_results/visual_lab/ocean_basins.html"><strong aria-hidden="true">2.2.2.1.1.</strong> Ocean Basins</a></li><li class="chapter-item expanded "><a href="app_guide/usage_guide/exploring_analysis_results/visual_lab/mode_water_analysis.html"><strong aria-hidden="true">2.2.2.1.2.</strong> Mode Water Analysis</a></li></ol></li></ol></li><li class="chapter-item expanded "><a href="app_guide/usage_guide/performing_custom_analysis/index.html"><strong aria-hidden="true">2.2.3.</strong> Performing Custom Analysis</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="app_guide/usage_guide/performing_custom_analysis/analysis_lab/index.html"><strong aria-hidden="true">2.2.3.1.</strong> Analysis Lab</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="app_guide/usage_guide/performing_custom_analysis/analysis_lab/vertical_profiles.html"><strong aria-hidden="true">2.2.3.1.1.</strong> Vertical Profiles</a></li></ol></li></ol></li></ol></li></ol></li><li class="chapter-item expanded "><a href="app_guide/legal_guide/index.html"><strong aria-hidden="true">3.</strong> Legal Guide</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="app_guide/legal_guide/terms_of_service_en.html"><strong aria-hidden="true">3.1.</strong> Terms of Service</a></li><li class="chapter-item expanded "><a href="app_guide/legal_guide/privacy_policy_en.html"><strong aria-hidden="true">3.2.</strong> Privacy Policy</a></li><li class="chapter-item expanded "><a href="app_guide/legal_guide/terms_of_service_ja.html"><strong aria-hidden="true">3.3.</strong> 利用規約</a></li><li class="chapter-item expanded "><a href="app_guide/legal_guide/privacy_policy_ja.html"><strong aria-hidden="true">3.4.</strong> プライバシーポリシー</a></li></ol></li><li class="chapter-item expanded "><a href="contact_information/index.html"><strong aria-hidden="true">4.</strong> Contact information</a></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split("#")[0].split("?")[0];
        if (current_page.endsWith("/")) {
            current_page += "index.html";
        }
        var links = Array.prototype.slice.call(this.querySelectorAll("a"));
        var l = links.length;
        for (var i = 0; i < l; ++i) {
            var link = links[i];
            var href = link.getAttribute("href");
            if (href && !href.startsWith("#") && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The "index" page is supposed to alias the first chapter in the book.
            if (link.href === current_page || (i === 0 && path_to_root === "" && current_page.endsWith("/index.html"))) {
                link.classList.add("active");
                var parent = link.parentElement;
                if (parent && parent.classList.contains("chapter-item")) {
                    parent.classList.add("expanded");
                }
                while (parent) {
                    if (parent.tagName === "LI" && parent.previousElementSibling) {
                        if (parent.previousElementSibling.classList.contains("chapter-item")) {
                            parent.previousElementSibling.classList.add("expanded");
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                sessionStorage.setItem('sidebar-scroll', this.scrollTop);
            }
        }, { passive: true });
        var sidebarScrollTop = sessionStorage.getItem('sidebar-scroll');
        sessionStorage.removeItem('sidebar-scroll');
        if (sidebarScrollTop) {
            // preserve sidebar scroll position when navigating via links within sidebar
            this.scrollTop = sidebarScrollTop;
        } else {
            // scroll sidebar to current active section when navigating via "next/previous chapter" buttons
            var activeSection = document.querySelector('#sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        var sidebarAnchorToggles = document.querySelectorAll('#sidebar a.toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(function (el) {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define("mdbook-sidebar-scrollbox", MDBookSidebarScrollbox);
