document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const filterInput = document.getElementById("filter-input");
  const sortSelect = document.getElementById("sort-select");

  let allActivities = {};

  // Helper function to escape HTML to prevent XSS attacks
  function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;
      renderActivities();
      populateActivitySelect();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function populateActivitySelect() {
    // Clear and repopulate the select dropdown
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    Object.keys(allActivities).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
  }

  function renderActivities() {
    let activitiesArr = Object.entries(allActivities);
    const filterValue = filterInput ? filterInput.value.trim().toLowerCase() : "";
    const sortValue = sortSelect ? sortSelect.value : "name-asc";

    // Filter by name or category (if available)
    if (filterValue) {
      activitiesArr = activitiesArr.filter(([name, details]) => {
        const nameMatch = name.toLowerCase().includes(filterValue);
        const categoryMatch = details.category && details.category.toLowerCase().includes(filterValue);
        return nameMatch || categoryMatch;
      });
    }

    // Sort
    activitiesArr.sort(([nameA, detailsA], [nameB, detailsB]) => {
      if (sortValue === "name-asc") {
        return nameA.localeCompare(nameB);
      } else if (sortValue === "name-desc") {
        return nameB.localeCompare(nameA);
      } else if (sortValue === "schedule-asc") {
        return (detailsA.schedule || "").localeCompare(detailsB.schedule || "");
      } else if (sortValue === "schedule-desc") {
        return (detailsB.schedule || "").localeCompare(detailsA.schedule || "");
      }
      return 0;
    });

    // Render
    activitiesList.innerHTML = "";
    if (activitiesArr.length === 0) {
      activitiesList.innerHTML = "<p>No activities found.</p>";
      return;
    }
    activitiesArr.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";
      const spotsLeft = details.max_participants - details.participants.length;
      const participantsHTML =
        details.participants.length > 0
          ? `<div class=\"participants-section\">\n              <h5>Participants:</h5>\n              <ul class=\"participants-list\">\n                ${details.participants
              .map(
                (email) =>
                  `<li><span class=\"participant-email\">${escapeHtml(email)}</span><button class=\"delete-btn\" data-activity=\"${escapeHtml(name)}\" data-email=\"${escapeHtml(email)}\">❌</button></li>`
              )
              .join("")}\n              </ul>\n            </div>`
          : `<p><em>No participants yet</em></p>`;
      activityCard.innerHTML = `
        <h4>${escapeHtml(name)}</h4>
        <p>${escapeHtml(details.description)}</p>
        <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
        ${details.category ? `<p><strong>Category:</strong> ${escapeHtml(details.category)}</p>` : ""}
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;
      activitiesList.appendChild(activityCard);
    });
    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    // ...existing code...
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Filter and sort event listeners
  if (filterInput) {
    filterInput.addEventListener("input", renderActivities);
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", renderActivities);
  }

  // Initialize app
  fetchActivities();
});

