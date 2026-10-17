const menuToggle = document.getElementById("menuToggle");
const navbar = document.getElementById("navbar");

if (menuToggle && navbar) {
    menuToggle.addEventListener("click", function () {
        const isOpen = navbar.classList.toggle("open");

        menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    });

    navbar.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            navbar.classList.remove("open");
            menuToggle.setAttribute("aria-expanded", "false");
        });
    });
}

function createRepositoryCard(repository) {
    const card = document.createElement("article");
    card.className = "github-project-card";

    const heading = document.createElement("h3");
    const repositoryLink = document.createElement("a");
    repositoryLink.href = repository.html_url;
    repositoryLink.target = "_blank";
    repositoryLink.rel = "noopener noreferrer";
    repositoryLink.textContent = repository.name;
    heading.appendChild(repositoryLink);
    card.appendChild(heading);

    const description = document.createElement("p");
    description.className = "github-project-description";
    description.textContent = repository.description || "Explore this public project on GitHub.";
    card.appendChild(description);

    const metadata = document.createElement("div");
    metadata.className = "github-project-meta";

    if (repository.language) {
        const language = document.createElement("span");
        language.className = "github-project-language";
        language.textContent = repository.language;
        metadata.appendChild(language);
    }

    const updated = document.createElement("time");
    const updatedDate = new Date(repository.pushed_at || repository.updated_at);
    updated.dateTime = updatedDate.toISOString();
    updated.textContent = "Updated " + new Intl.DateTimeFormat("en", {
        month: "short",
        year: "numeric"
    }).format(updatedDate);
    metadata.appendChild(updated);
    card.appendChild(metadata);

    const actions = document.createElement("div");
    actions.className = "github-project-actions";
    const sourceLink = document.createElement("a");
    sourceLink.className = "text-link";
    sourceLink.href = repository.html_url;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";
    sourceLink.textContent = "View on GitHub ↗";
    actions.appendChild(sourceLink);

    if (typeof repository.homepage === "string" && repository.homepage.trim() !== "") {
        try {
            const demoUrl = new URL(repository.homepage);
            if (demoUrl.protocol === "https:" || demoUrl.protocol === "http:") {
                const demoLink = document.createElement("a");
                demoLink.className = "text-link";
                demoLink.href = demoUrl.href;
                demoLink.target = "_blank";
                demoLink.rel = "noopener noreferrer";
                demoLink.textContent = "Live demo ↗";
                actions.appendChild(demoLink);
            }
        } catch (error) {
            console.warn("Skipping an invalid GitHub repository homepage URL.", error);
        }
    }

    card.appendChild(actions);
    return card;
}

async function loadGithubProjects(container) {
    const username = container.dataset.githubUser;
    const projectLimit = Number.parseInt(container.dataset.projectLimit || "6", 10);
    const status = container.querySelector(".github-project-status");

    if (!username || !Number.isInteger(projectLimit) || projectLimit < 1) {
        status.textContent = "GitHub projects are not configured correctly.";
        return;
    }

    const apiUrl = new URL(
        "https://api.github.com/users/" + encodeURIComponent(username) + "/repos"
    );
    apiUrl.searchParams.set("type", "owner");
    apiUrl.searchParams.set("sort", "updated");
    apiUrl.searchParams.set("per_page", "100");

    try {
        const response = await fetch(apiUrl, {
            headers: { Accept: "application/vnd.github+json" }
        });

        if (!response.ok) {
            const message = response.status === 403
                ? "GitHub is temporarily limiting project requests. Please visit the GitHub profile directly."
                : "GitHub projects could not be loaded right now. Please visit the GitHub profile directly.";
            throw new Error(message);
        }

        const repositories = await response.json();
        if (!Array.isArray(repositories)) {
            throw new Error("GitHub returned an unexpected project list. Please visit the GitHub profile directly.");
        }

        const visibleRepositories = repositories
            .filter(function (repository) {
                return repository
                    && repository.private === false
                    && repository.fork === false
                    && repository.archived === false
                    && typeof repository.name === "string"
                    && typeof repository.html_url === "string"
                    && /^https:\/\/github\.com\//i.test(repository.html_url);
            })
            .slice(0, projectLimit);

        if (visibleRepositories.length === 0) {
            status.textContent = "No public repositories to display yet. Visit my GitHub profile to explore my work.";
            return;
        }

        const grid = document.createElement("div");
        grid.className = "github-project-grid";
        visibleRepositories.forEach(function (repository) {
            grid.appendChild(createRepositoryCard(repository));
        });

        status.textContent = "Showing the latest public repositories from GitHub.";
        container.appendChild(grid);
    } catch (error) {
        console.error("Unable to load public GitHub repositories.", error);
        status.classList.add("github-project-error");
        status.textContent = error instanceof Error
            ? error.message
            : "GitHub projects could not be loaded. Please visit the GitHub profile directly.";
    }
}

document.querySelectorAll(".github-projects").forEach(function (container) {
    loadGithubProjects(container);
});