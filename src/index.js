import "./styles.scss";
import playSound from "./libs/playSound.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let score = 0;
let lives = 3;

canvas.width = 800;
canvas.height = 600;

// Wąż jako tablica segmentów
const snake = [{ x: canvas.width / 2, y: canvas.height - 40 }];
const snakeWidth = 20;
const snakeHeight = 20;
let snakeDx = 2; // prędkość w poziomie
let snakeDy = 0; // prędkość w pionie

// Bloki
const blocks = [];
const blockSize = 20;

// Bomby
const bombs = [];
const bombSize = 20;

const bullets = [];
let bulletsCount = 3; // Liczba początkowych nabojów
const bulletSpeed = 4; // 2x szybciej niż wąż
const blocksNeededForBullets = 5; // Liczba bloków potrzebna do otrzymania nabojów
let collectedBlocks = 0; // Liczba zebranych bloków
let level = 1;

let isGameActive = false;
let animationFrameId = null;
let safePeriodEndTime = 0;

let bonusBlock = null;

// Funkcja do generowania bonusowego bloku
function generateBonusBlock() {
  bonusBlock = {
    x: Math.random() * (canvas.width - blockSize),
    y: Math.random() * (canvas.height - blockSize),
    status: 1,
  };
}

// Rysowanie bonusowego bloku
function drawBonusBlock() {
  if (bonusBlock && bonusBlock.status === 1) {
    ctx.beginPath();
    ctx.rect(bonusBlock.x, bonusBlock.y, blockSize, blockSize);
    ctx.fillStyle = "gold"; // Wyraźny kolor dla bonusowego bloku
    ctx.fill();
    ctx.closePath();
  }
}

// Sprawdzanie kolizji z bonusowym blokiem
function checkBonusBlockCollision() {
  if (bonusBlock && bonusBlock.status === 1) {
    if (
      snake[0].x < bonusBlock.x + blockSize &&
      snake[0].x + snakeWidth > bonusBlock.x &&
      snake[0].y < bonusBlock.y + blockSize &&
      snake[0].y + snakeHeight > bonusBlock.y
    ) {
      bonusBlock.status = 0; // Usuń bonusowy blok po kolizji
      playSound(600, "square");
      safePeriodEndTime = Date.now() + 15000; // Wyłącz bomby na 15 sekund
    }
  }
}

function drawBullets() {
  bullets.forEach((bullet) => {
    if (bullet.status === 1) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "black";
      ctx.fill();
      ctx.closePath();
    }
  });
}

function moveBullets() {
  bullets.forEach((bullet) => {
    if (bullet.status === 1) {
      bullet.x += bullet.dx;
      bullet.y += bullet.dy;
      // Sprawdzanie, czy nabój opuścił planszę
      if (
        bullet.x > canvas.width ||
        bullet.x < 0 ||
        bullet.y > canvas.height ||
        bullet.y < 0
      ) {
        bullet.status = 0; // Usuń nabój
      }
    }
  });
}

function shootBullet() {
  if (bulletsCount > 0 && snake.length > 0) {
    const head = snake[0];
    let bulletX = head.x + snakeWidth / 2; // Start z centrum głowy węża
    let bulletY = head.y + snakeHeight / 2;

    // Ajust initial bullet position based on the direction of the snake to avoid immediate self-collision
    if (snakeDx > 0) {
      // Moving right
      bulletX += snakeWidth;
    } else if (snakeDx < 0) {
      // Moving left
      bulletX -= snakeWidth;
    } else if (snakeDy > 0) {
      // Moving down
      bulletY += snakeHeight;
    } else if (snakeDy < 0) {
      // Moving up
      bulletY -= snakeHeight;
    }

    const newBullet = {
      x: bulletX,
      y: bulletY,
      dx: snakeDx > 0 ? bulletSpeed : snakeDx < 0 ? -bulletSpeed : 0,
      dy: snakeDy > 0 ? bulletSpeed : snakeDy < 0 ? -bulletSpeed : 0,
      status: 1,
    };
    bullets.push(newBullet);
    bulletsCount--;
  }
}

// Funkcja sprawdzająca nakładanie się
function isOverlapping(x, y, size, array) {
  return array.some((item) => {
    return (
      x < item.x + size &&
      x + size > item.x &&
      y < item.y + size &&
      y + size > item.y &&
      item.status === 1
    );
  });
}

// Generowanie bloków
function generateBlocks() {
  blocks.length = 0; // Wyczyść obecną listę bloków
  let attempts = 0;
  for (let i = 0; i < level * 5; i++) {
    let x, y, overlapping;
    do {
      x = Math.random() * (canvas.width - blockSize);
      y = Math.random() * (canvas.height - blockSize);
      overlapping = isOverlapping(x, y, blockSize, blocks);
      attempts++;
      if (attempts > 10) break; // Zabezpieczenie przed zbyt długą pętlą
    } while (overlapping);

    if (!overlapping) {
      blocks.push({ x, y, status: 1 });
    }
  }
}

// Generowanie bomb
function generateBombs() {
  bombs.length = 0; // Wyczyść obecną listę bomb
  let attempts = 0;
  for (let i = 0; i < 5 + level; i++) {
    let x, y, overlapping;
    do {
      x = Math.random() * (canvas.width - bombSize);
      y = Math.random() * (canvas.height / 2); // Generuje bomby w górnej połowie ekranu
      overlapping =
        isOverlapping(x, y, bombSize, bombs) ||
        isOverlapping(x, y, bombSize, blocks);
      attempts++;
      if (attempts > 10) break; // Zabezpieczenie przed zbyt długą pętlą
    } while (overlapping);

    if (!overlapping) {
      bombs.push({ x, y, status: 1 });
    }
  }
  // Ustaw czas zakończenia okresu bezpieczeństwa na 2 sekund od teraz
  safePeriodEndTime = Date.now() + 2000;
}

function drawSnake() {
  // Rysowanie reszty ciała węża
  snake.slice(1).forEach((segment) => {
    ctx.fillStyle = "green";
    ctx.fillRect(segment.x, segment.y, snakeWidth, snakeHeight);
  });

  // Rysowanie głowy węża
  ctx.fillStyle = "lightgreen"; // Jasnozielony kolor dla głowy
  ctx.fillRect(snake[0].x, snake[0].y, snakeWidth, snakeHeight);
}

function moveSnake() {
  const head = { x: snake[0].x + snakeDx, y: snake[0].y + snakeDy };

  snake.unshift(head); // Dodaje nowy segment na początku węża

  // Usuwa ostatni segment węża
  snake.pop();
}

// Funkcja rysująca bloki
function drawBlocks() {
  blocks.forEach((block) => {
    if (block.status === 1) {
      ctx.beginPath();
      ctx.rect(block.x, block.y, blockSize, blockSize);
      ctx.fillStyle = "#0095DD";
      ctx.fill();
      ctx.closePath();
    }
  });
}

// Funkcja rysująca bomby
function drawBombs() {
  bombs.forEach((bomb) => {
    if (bomb.status === 1) {
      ctx.beginPath();
      ctx.arc(bomb.x, bomb.y, bombSize / 2, 0, Math.PI * 2);
      // Rysuj bomby w innym kolorze, jeśli jesteśmy w okresie bezpieczeństwa
      ctx.fillStyle = Date.now() < safePeriodEndTime ? "gray" : "red";
      ctx.fill();
      ctx.closePath();
    }
  });
}

// Funkcja rysująca wynik
function drawScore() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#0375ad";
  ctx.fillText("Score: " + score, 8, 20);
  ctx.fillText("Bullets: " + bulletsCount, 8, 40);
  ctx.fillText("Level: " + level, 8, 60);
  ctx.fillText("Lives: " + lives, canvas.width - 65, 20);
}

function growSnake() {
  const newSegment = {
    x: snake[snake.length - 1].x,
    y: snake[snake.length - 1].y,
  };
  snake.push(newSegment);
}

// Detekcja kolizji z bombami
function bombCollisionDetection() {
  if (Date.now() > safePeriodEndTime) {
    // Sprawdź kolizje tylko poza okresem bezpieczeństwa
    bombs.forEach((bomb) => {
      if (bomb.status === 1) {
        if (
          snake[0].x < bomb.x + bombSize - 5 &&
          snake[0].x + snakeWidth > bomb.x &&
          snake[0].y < bomb.y + bombSize - 5 &&
          snake[0].y + snakeHeight > bomb.y
        ) {
          bomb.status = 0; // Usuwa bombę po kolizji
          lives--; // Odejmuje życie
          playSound(400, "sawtooth");
          if (lives > 0) {
            generateBlocks(); // Regeneruje bloki jeśli gracz ma jeszcze życia
            generateBombs(); // Generuje nowe bomby
          }
        }
      }
    });
  }
}

// Sprawdź, czy wszystkie bloki zostały zniszczone
function checkBlocks() {
  if (blocks.every((block) => block.status === 0)) {
    level++;
    generateBlocks(); // Wygeneruj nowe bloki
    generateBombs(); // Wygeneruj nowe bomby
  }
}

// Obsługa zdarzeń klawiatury
document.addEventListener("keydown", (event) => {
  event.preventDefault();

  if ((event.key === "Right" || event.key === "ArrowRight") && snakeDx === 0) {
    snakeDx = 2; // porusza się w prawo
    snakeDy = 0;
  } else if (
    (event.key === "Left" || event.key === "ArrowLeft") &&
    snakeDx === 0
  ) {
    snakeDx = -2; // porusza się w lewo
    snakeDy = 0;
  } else if ((event.key === "Up" || event.key === "ArrowUp") && snakeDy === 0) {
    snakeDy = -2; // porusza się w górę
    snakeDx = 0;
  } else if (
    (event.key === "Down" || event.key === "ArrowDown") &&
    snakeDy === 0
  ) {
    snakeDy = 2; // porusza się w dół
    snakeDx = 0;
  }

  if (event.key === "x" || event.key === "X") {
    shootBullet();
  }
});

function checkSelfCollision() {
  if (Date.now() > safePeriodEndTime) {
    for (let i = 1; i < snake.length; i++) {
      if (snake[0].x === snake[i].x && snake[0].y === snake[i].y) {
        //   return true; // Wąż ugryzł samego siebie
        lives--; // Odejmuje życie
        resetSnake(); // Resetuje węża
        return;
      }
    }
    return false;
  }
}

function resetSnake() {
  snake.length = 0; // Wyczyść węża
  snake.push({ x: canvas.width / 2, y: canvas.height - 40 }); // Dodaj początkowy segment
  snakeDx = 2; // Ustaw początkowy kierunek
  snakeDy = 0;
}

function reverseSnake() {
  snake.reverse(); // Odwraca segmenty węża
  const head = snake[0];
  // Zmienia kierunek na przeciwny
  if (snakeDx !== 0) {
    snakeDx = -snakeDx;
  } else if (snakeDy !== 0) {
    snakeDy = -snakeDy;
  }
}

// Funkcja do sprawdzania kolizji pomiędzy dwoma obiektami
function isCollision(a, b, sizeA, sizeB) {
  return (
    a.x < b.x + sizeB &&
    a.x + sizeA > b.x &&
    a.y < b.y + sizeB &&
    a.y + sizeA > b.y
  );
}

// Sprawdzenie kolizji nabojów z blokami i wężem
function bulletCollisionDetection() {
  bullets.forEach((bullet) => {
    if (bullet.status === 1) {
      // Kolizja z blokami
      blocks.forEach((block) => {
        if (block.status === 1 && isCollision(bullet, block, 5, blockSize)) {
          block.status = 0; // Usuń blok
          score += 15; // Dodaj punkty
          playSound(600, "square");
          bullet.status = 0; // Usuń nabój
          collectedBlocks++; // Zwiększ liczbę zebranych bloków
          if (collectedBlocks % blocksNeededForBullets === 0) {
            bulletsCount += 3; // Dodaj naboje
            generateBonusBlock();
          }
        }
      });

      // Kolizja nabojów z wężem
      if (isCollision(bullet, snake[0], 5, snakeWidth)) {
        bullet.status = 0; // Usuń nabój
        lives--; // Odejmij życie
        resetSnake(); // Resetuj węża
      }
    }
  });
}

function collisionDetection() {
  blocks.forEach((block, index) => {
    if (
      block.status === 1 &&
      isCollision(snake[0], block, snakeWidth, blockSize)
    ) {
      block.status = 0; // Usuń blok po kolizji
      score += 10; // Dodaj punkty
      playSound(400, "square");
      growSnake(); // Wąż rośnie
      collectedBlocks++;
      if (collectedBlocks % blocksNeededForBullets === 0) {
        bulletsCount += 3; // Dodaj naboje
        generateBonusBlock();
      }
    }
  });

  bulletCollisionDetection();
  bombCollisionDetection();
  checkBlocks(); // Sprawdza, czy wszystkie bloki zostały zniszczone
}

function drawGameOver() {
  ctx.font = "30px Arial";
  ctx.fillStyle = "red";
  ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);

  ctx.font = "20px Arial";
  ctx.fillText(
    "Score:" + score,
    canvas.width / 2 - 100,
    canvas.height / 2 + 25
  );
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  moveSnake();

  if (lives <= 0) {
    drawGameOver();
    return; // Zatrzymuje animację
  } else {
    animationFrameId = requestAnimationFrame(update);
  }

  checkSelfCollision();
  drawSnake();
  drawBlocks();
  drawBombs();
  drawScore();
  moveBullets();
  drawBullets();
  collisionDetection();
  bombCollisionDetection();
  checkBonusBlockCollision(); // Sprawdź kolizję z bonusowym blokiem
  drawBonusBlock(); // Rysuj bonusowy blok
  checkBlocks(); // Sprawdza, czy wszystkie bloki zostały zniszczone

  // Odbijanie węża od krawędzi i odwracanie
  if (
    snake[0].x < 0 ||
    snake[0].x + snakeWidth > canvas.width ||
    snake[0].y < 0 ||
    snake[0].y + snakeHeight > canvas.height
  ) {
    reverseSnake();
  }
}

document.getElementById("startButton").addEventListener("click", startGame);

function startGame() {
  if (isGameActive) {
    // Jeśli gra jest już aktywna, zatrzymaj bieżącą grę
    cancelAnimationFrame(animationFrameId);
  }

  // Reset stanu gry
  isGameActive = true;
  score = 0;
  lives = 3;
  snake.length = 0; // Wyczyść węża
  snake.push({ x: canvas.width / 2, y: canvas.height - 40 }); // Dodaj początkowy segment
  snakeDx = 2; // Ustaw początkowy kierunek
  snakeDy = 0;
  level = 1;
  generateBlocks(); // Wygeneruj bloki na początek gry
  generateBombs(); // Wygeneruj bomby na początek gry
  update(); // Rozpocznij pętlę gry
}
