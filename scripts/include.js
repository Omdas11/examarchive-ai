// scripts/include.js
document.addEventListener("DOMContentLoaded", () => {
  // Load Header
  fetch("header.html")
    .then(response => response.text())
    .then(data => {
      document.body.insertAdjacentHTML("afterbegin", data);
    })
    .catch(error => console.error("Header load failed:", error));

  // Load Footer
  fetch("footer.html")
    .then(response => response.text())
    .then(data => {
      document.body.insertAdjacentHTML("beforeend", data);
    })
    .catch(error => console.error("Footer load failed:", error));
});