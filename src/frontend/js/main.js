document.addEventListener("DOMContentLoaded", () => {
  console.log("Volleyball System ready!");

  const bg = document.querySelector(".bg");

  if (bg && bg.classList.contains("login")) {
    bg.style.transition = "background-image 0.6s ease-in-out";
  }

  if (bg && bg.classList.contains("signup")) {
    bg.style.transition = "background-image 0.6s ease-in-out";
  }
});
