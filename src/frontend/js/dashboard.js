const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "./login.html";
}

const logoutBtn = document.getElementById("logoutBtn");

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "./login.html";
});

function loadDashboardStats() {
  // Mock inicial para o dashboard ficar “vivo”
  // Futuramente você pode trocar por chamadas reais da API
  const stats = {
    totalAthletes: 12,
    totalCoaches: 3,
    tests: 8,
    results: 27,
  };

  updateStat("totalAthletes", stats.totalAthletes);
  updateStat("totalCoaches", stats.totalCoaches);
  updateStat("tests", stats.tests);
  updateStat("results", stats.results);
}

function updateStat(elementId, value) {
  const element = document.getElementById(elementId);

  if (!element) return;

  element.textContent = value;
}

function initHeroAnimation() {
  const canvas = document.getElementById("heroCanvas");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function drawCourt() {
    ctx.save();

    ctx.strokeStyle = "rgba(78,143,255,0.1)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.strokeStyle = "rgba(78,143,255,0.06)";

    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.33, 0);
    ctx.lineTo(canvas.width * 0.33, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.67, 0);
    ctx.lineTo(canvas.width * 0.67, canvas.height);
    ctx.stroke();

    ctx.strokeStyle = "rgba(78,143,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 6);
    ctx.lineTo(canvas.width, canvas.height - 6);
    ctx.stroke();

    ctx.restore();
  }

  function drawMikasa(cx, cy, r, angle) {
    const S = 92;
    const scale = r / S;
    const ox = 128;
    const oy = 120;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.translate(-ox, -oy);

    ctx.beginPath();
    ctx.arc(ox, oy, S, 0, Math.PI * 2);
    ctx.save();
    ctx.clip();

    ctx.beginPath();
    ctx.arc(ox, oy, S, 0, Math.PI * 2);
    ctx.fillStyle = "#f2f4f7";
    ctx.fill();

    const panels = [
      { d: "M36,118 C44,70 74,38 114,30 C95,50 86,75 86,105 C86,130 76,152 58,172 C42,158 34,138 36,118Z", c: "#f0c800" },
      { d: "M76,40 C96,30 122,30 146,36 C130,52 120,72 116,98 C106,96 96,96 86,98 C86,74 92,54 76,40Z", c: "#e8eef8" },
      { d: "M118,34 C152,34 182,48 204,74 C190,80 176,94 164,112 C150,102 134,98 116,98 C120,72 130,52 146,36 C136,34 126,34 118,34Z", c: "#2a70e8" },
      { d: "M204,74 C218,92 224,114 220,138 C206,122 190,110 172,104 C180,92 192,82 204,74Z", c: "#e8eef8" },
      { d: "M32,112 C56,102 82,100 110,102 C128,104 144,110 158,120 C146,132 136,146 130,162 C102,152 70,148 34,148 C30,136 30,124 32,112Z", c: "#2a70e8" },
      { d: "M34,148 C70,148 102,152 130,162 C124,176 122,190 124,204 C96,208 70,202 48,188 C40,176 36,162 34,148Z", c: "#e8eef8" },
      { d: "M158,120 C180,134 196,156 206,182 C196,196 182,206 166,212 C158,190 146,174 130,162 C136,146 146,132 158,120Z", c: "#2a70e8" },
      { d: "M124,204 C146,202 166,204 186,198 C182,206 176,214 166,220 C142,228 116,230 92,224 C76,220 60,210 48,188 C70,202 96,208 124,204Z", c: "#f0c800" },
      { d: "M220,138 C218,156 214,170 206,182 C196,156 180,134 158,120 C164,112 168,108 172,104 C190,110 206,122 220,138Z", c: "#f0c800" },
    ];

    panels.forEach((panel) => {
      const path = new Path2D(panel.d);
      ctx.fillStyle = panel.c;
      ctx.fill(path);
      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = 3;
      ctx.stroke(path);
    });

    ctx.beginPath();
    ctx.arc(ox, oy, S, 0, Math.PI * 2);

    const gradient = ctx.createRadialGradient(
      ox - S * 0.35,
      oy - S * 0.42,
      2,
      ox,
      oy,
      S
    );

    gradient.addColorStop(0, "rgba(255,255,255,0.38)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.save();
    ctx.translate(86, 72);
    ctx.rotate((-25 * Math.PI) / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
    ctx.restore();

    ctx.restore();

    ctx.beginPath();
    ctx.arc(ox, oy, S, 0, Math.PI * 2);
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  const ball = {
    x: 120,
    y: 40,
    r: 34,
    vx: 2.0,
    vy: 0.5,
    angle: 0,
    spin: 0.018,
  };

  function updateBall() {
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vy += 0.045;
    ball.angle += ball.spin;

    const width = canvas.width;
    const height = canvas.height;

    if (ball.x + ball.r > width) {
      ball.vx = -Math.abs(ball.vx);
      ball.spin = -Math.abs(ball.spin);
    }

    if (ball.x - ball.r < 0) {
      ball.vx = Math.abs(ball.vx);
      ball.spin = Math.abs(ball.spin);
    }

    if (ball.y + ball.r > height) {
      ball.vy = -Math.abs(ball.vy) * 0.9;
      ball.y = height - ball.r;
    }

    if (ball.y - ball.r < 0) {
      ball.vy = Math.abs(ball.vy);
      ball.y = ball.r;
    }

    if (ball.vy > 4) {
      ball.vy = 4;
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCourt();
    updateBall();
    drawMikasa(ball.x, ball.y, ball.r, ball.angle);
    requestAnimationFrame(animate);
  }

  animate();
}
