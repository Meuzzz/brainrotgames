import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Character, GameState, Obstacle } from '../types';
import { Star, Zap, Heart } from 'lucide-react';
import Crocodile from '../assets/Image/BombCorcodile.png';
import Shark from '../assets/Image/Tralalero.png'
import Sea from '../assets/Image/Sea.png';
import Sky from '../assets/Image/Sky.jpg';
import desert from '../assets/Image/desert.avif'
import Bubble from '../assets/Image/bubble.png'
interface GameProps {
  character: Character;
  onGameOver: (score: number) => void;
}

const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const CHARACTER_SIZE = 190;
const BOUNDARY_PENALTY = 5;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

export function Game({ character, onGameOver }: GameProps) {
  // Use refs for frequently changing values to avoid re-renders
  const gameStateRef = useRef<GameState>({
    score: 0,
    lives: 5,
    isPlaying: true,
    character,
    position: window.innerHeight / 2,
    velocity: 0,
    obstacles: [],
    combo: 0,
    lastObstacleTime: 0,
  });

  // State that triggers re-renders (UI-only)
  const [uiState, setUIState] = useState({
    score: 0,
    lives: 5,
    combo: 0,
  });
  
  const [isPaused, setIsPaused] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  
  // Use refs for values that don't need to trigger re-renders
  const boundaryHitTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const lastUiUpdateTimeRef = useRef(0);
  const fpsCounterRef = useRef(0);
  const fpsTimerRef = useRef(0);
  const currentFpsRef = useRef(0);

  // Use ref for dimensions to avoid re-renders
  const dimensionsRef = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
    scale: Math.min(window.innerWidth / 800, window.innerHeight / 1200)
  });

  const gameLoopRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pre-load and cache images
  const imagesRef = useRef<Record<string, HTMLImageElement | null>>({
    character: null,
    bomb: null,
    bubble: null,
    background: null
  });

  // Handle responsiveness
  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const scale = Math.min(screenWidth / 800, screenHeight / 1200);
      
      // Update dimension refs directly
      dimensionsRef.current = {
        width: screenWidth,
        height: screenHeight,
        scale: scale
      };
      
      // Update canvas dimensions
      if (canvasRef.current) {
        canvasRef.current.width = screenWidth;
        canvasRef.current.height = screenHeight;
        
        // Update character position after resize
        gameStateRef.current.position = screenHeight / 2;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load images once and cache them
  useEffect(() => {
    // Helper function to load an image with error handling
    const loadImage = (src: string, key: string) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imagesRef.current[key] = img;
      };
      img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
      };
      return img;
    };

    // Load character image
    loadImage(character.image, 'character');
    
    // Load bomb image based on character
    let bombSrc = Shark; // Default
    let bubbleSrc = Bubble;
    if (character.name === 'Bombardino Crocodilo') {
      bombSrc = Shark;
    } else if (character.name === 'Trallalero Trallalà') {
      bombSrc = Crocodile;
    }
    loadImage(bombSrc, 'bomb');
    
    // Load bubble image
    loadImage(bubbleSrc, 'bubble');
    
    // Load background image based on character
    let bgSrc = Sea; // Default
    if (character.name === 'Bombardino Crocodilo') {
      bgSrc = Sky;
    } else if (character.name === 'Trallalero Trallalà') {
      bgSrc = Sea;
    } else if (character.name === 'Tung Tung Tung Tung Sahur') {
      bgSrc = desert;
    }
    loadImage(bgSrc, 'background');
    
  }, [character]);

  // Optimized collision detection with spatial partitioning
  const checkCollisions = useCallback((playerPosition: number, obstacles: Obstacle[]): Obstacle[] => {
    const dimensions = dimensionsRef.current;
    const collisionRadius = 40 * dimensions.scale; // Increased from 30 to 40
    const characterXPos = dimensions.width * 0.125;
    
    // Early culling - only check obstacles that are near the character horizontally
    const nearObstacles = obstacles.filter(obs => 
      Math.abs(characterXPos - obs.x) < collisionRadius * 2
    );
    
    // Now check more precise collisions on fewer obstacles
    return nearObstacles.filter((obstacle) => {
      const dx = characterXPos - obstacle.x;
      const dy = playerPosition - obstacle.y;
      // Use square distance for performance (avoid square root when possible)
      const squareDistance = dx * dx + dy * dy;
      return squareDistance < collisionRadius * collisionRadius;
    });
  }, []);

  // Optimized obstacle generator using memoized params
 // Optimized obstacle generator using memoized params
const generateObstacle = useCallback((score: number): Obstacle => {
  const dimensions = dimensionsRef.current;
  const topBoundary = 80 * dimensions.scale;
  const bottomBoundary = dimensions.height - 20 * dimensions.scale;
  
  // More balanced bomb chance (decreased from 0.5 max to 0.4 max)
  const bombChance = Math.min(0.4, 0.2 + score / 5000);
  const isBomb = Math.random() < bombChance;
  
  // Calculate Y position within the playable area (more even distribution)
  const yPosition = topBoundary + Math.random() * (bottomBoundary - topBoundary);
  
  // Increase point values to make collection more rewarding
  const pointValue = Math.floor(Math.random() * 3 + 1) * 20; // Doubled from 10 to 20
  
  return {
    id: Math.random().toString(),
    x: dimensions.width,
    y: yPosition,
    type: isBomb ? 'bomb' : 'bubble',
    points: pointValue,
    rotation: Math.random() * Math.PI * 2,
  };
}, []);

  // Jump function using ref values
  const jump = useCallback(() => {
    gameStateRef.current.velocity = JUMP_FORCE;
  }, []);

  // Keyboard and touch handlers
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (showTutorial) {
          setShowTutorial(false);
        } else if (!isPaused) {
          jump();
        }
      } else if (e.code === 'Escape') {
        setIsPaused(prev => !prev);
      }
    };

    const handleTouchStart = () => {
      if (showTutorial) {
        setShowTutorial(false);
      } else if (!isPaused) {
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('touchstart', handleTouchStart);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isPaused, showTutorial, jump]);

  const randomPositions = useMemo(() => {
    const positions = [];
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    for (let i = 0; i < 10; i++) {
      positions.push({
        x: Math.random() * width,
        y: height + 10 - Math.random() * 20,
        size: Math.random() * 5 + 2
      });
    }
    return positions;
  }, []);
  // Drawing functions memoized to prevent recreation
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const dimensions = dimensionsRef.current;
    const bgImage = imagesRef.current.background;
    
    if (bgImage) {
      // Use less intensive parallax calculation
      const time = Date.now() * 0.0003;
      const offset = Math.sin(time) * 10 * dimensions.scale;
      
      ctx.save();
      ctx.globalAlpha = 0.8;
      // Use drawImage sparingly - it's an expensive operation
      ctx.drawImage(bgImage, offset, 0, dimensions.width, dimensions.height);
      ctx.restore();
    } else {
      // Fallback gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
      gradient.addColorStop(0, '#7e22ce');
      gradient.addColorStop(1, '#be185d');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    }
  
    // Reduce number of bubbles on slower devices
    const bubbleCount = currentFpsRef.current < 40 ? 2 : 5;
    
    // Use pre-computed random positions from the component level
    // Draw fewer underwater bubble particles
    for (let i = 0; i < bubbleCount; i++) {
      const pos = randomPositions[i % randomPositions.length];
      // Scale the position according to current dimensions
      const scaledX = pos.x * (dimensions.width / window.innerWidth);
      const scaledY = pos.y * (dimensions.height / window.innerHeight);
      
      ctx.beginPath();
      ctx.arc(
        scaledX,
        scaledY,
        pos.size * dimensions.scale,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();
    }
  }, [randomPositions]);

  // Draw top and bottom danger zones
  const drawBoundaries = useCallback((ctx: CanvasRenderingContext2D) => {
    const dimensions = dimensionsRef.current;
    const TOP_BOUNDARY = 80 * dimensions.scale;
    const BOTTOM_BOUNDARY = dimensions.height - 20 * dimensions.scale;
    
    // Only create gradients when necessary (expensive operation)
    // Use cached gradients if possible
    if (!ctx.boundariesCached) {
      // Draw top danger zone
      const topGradient = ctx.createLinearGradient(0, 0, 0, TOP_BOUNDARY);
      topGradient.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
      topGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = topGradient;
      ctx.fillRect(0, 0, dimensions.width, TOP_BOUNDARY);
      
      // Draw bottom danger zone
      const bottomGradient = ctx.createLinearGradient(0, BOTTOM_BOUNDARY, 0, dimensions.height);
      bottomGradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
      bottomGradient.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
      ctx.fillStyle = bottomGradient;
      ctx.fillRect(0, BOTTOM_BOUNDARY, dimensions.width, dimensions.height - BOTTOM_BOUNDARY);
      
      // @ts-ignore - add custom property to ctx for optimization
      ctx.boundariesCached = true;
    } else {
      // Use cached gradients
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(0, 0, dimensions.width, TOP_BOUNDARY);
      ctx.fillRect(0, BOTTOM_BOUNDARY, dimensions.width, dimensions.height - BOTTOM_BOUNDARY);
    }
  }, []);

  // Optimized UI drawing
  const drawUI = useCallback((ctx: CanvasRenderingContext2D) => {
    const dimensions = dimensionsRef.current;
    const GAME_WIDTH = dimensions.width;
    const GAME_HEIGHT = dimensions.height;
    const uiHeight = 80 * dimensions.scale;
    
    // Use direct refs for performance
    const { score, lives, combo } = gameStateRef.current;
    
    // Draw UI background with frosted glass effect
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, 0, GAME_WIDTH, uiHeight);
    
    // Draw accent line with fewer color stops
    ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
    ctx.fillRect(0, uiHeight - 3 * dimensions.scale, GAME_WIDTH, 3 * dimensions.scale);
    
    // Calculate fontSize based on scale
    const fontSize = 26 * dimensions.scale;
    const smallFontSize = 18 * dimensions.scale;
    const iconSize = 14 * dimensions.scale;
    
    // Draw score with less intensive effects
    const scoreGlow = ((Math.sin(Date.now() * 0.002) + 1) / 2) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(255, 215, 0, ${scoreGlow})`;
    ctx.font = `bold ${fontSize}px "Poppins", sans-serif`;
    ctx.textAlign = 'left';
    
    // Draw star icon (simplified)
    ctx.save();
    ctx.translate(30 * dimensions.scale, 40 * dimensions.scale);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x = Math.cos(angle) * iconSize;
      const y = Math.sin(angle) * iconSize;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      
      const innerAngle = angle + Math.PI / 5;
      const innerX = Math.cos(innerAngle) * (iconSize * 0.4);
      const innerY = Math.sin(innerAngle) * (iconSize * 0.4);
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    
    // Draw score (simplified shadow)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 3 * dimensions.scale;
    ctx.shadowOffsetX = 1 * dimensions.scale;
    ctx.shadowOffsetY = 1 * dimensions.scale;
    ctx.fillText(`${score}`, 60 * dimensions.scale, 45 * dimensions.scale);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw combo with less intensive animation
    if (combo > 0) {
      const comboScale = 1 + Math.sin(Date.now() * 0.005) * 0.05;
      const comboTextSize = smallFontSize * comboScale;
      
      ctx.fillStyle = '#64FFDA';
      ctx.font = `bold ${comboTextSize}px "Poppins", sans-serif`;
      
      // Draw lightning icon (simplified)
      ctx.save();
      ctx.translate(170 * dimensions.scale, 40 * dimensions.scale);
      ctx.beginPath();
      ctx.moveTo(0, -iconSize);
      ctx.lineTo(-iconSize * 0.4, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(-iconSize * 0.4, iconSize);
      ctx.lineTo(iconSize * 0.4, -iconSize * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      
      ctx.fillText(`Combo x${combo}`, 190 * dimensions.scale, 45 * dimensions.scale);
    }
    
    // Draw lives
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FF6B6B';
    ctx.font = `bold ${smallFontSize}px "Poppins", sans-serif`;
    ctx.fillText(`Lives:`, GAME_WIDTH - (120 * dimensions.scale) - (lives * 30 * dimensions.scale), 45 * dimensions.scale);
    
    // Draw simplified heart icons for lives (less intensive animation)
    for (let i = 0; i < lives; i++) {
      ctx.save();
      ctx.translate(GAME_WIDTH - (110 * dimensions.scale) + i * (30 * dimensions.scale), 40 * dimensions.scale);
      
      // Simpler heart animation
      const heartPulse = 1 + Math.sin(Date.now() * 0.001 + i) * 0.05;
      ctx.scale(heartPulse, heartPulse);
      
      // Simplified heart shape drawing
      const heartSize = iconSize;
      ctx.fillRect(-heartSize * 0.4, -heartSize * 0.3, heartSize * 0.8, heartSize * 0.8);
      ctx.beginPath();
      ctx.arc(-heartSize * 0.2, -heartSize * 0.3, heartSize * 0.4, Math.PI, 0, true);
      ctx.arc(heartSize * 0.2, -heartSize * 0.3, heartSize * 0.4, Math.PI, 0, true);
      ctx.fill();
      ctx.restore();
    }
    
    // Display FPS counter for debug (can be removed in production)
    // ctx.fillStyle = 'white';
    // ctx.font = `12px monospace`;
    // ctx.textAlign = 'right';
    // ctx.fillText(`FPS: ${currentFpsRef.current}`, GAME_WIDTH - 10, GAME_HEIGHT - 10);
  }, []);

  // Main game loop with frame rate control and throttling
  useEffect(() => {
    if (isPaused || showTutorial) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Use off-screen canvas for double buffering (prevents flicker)
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = dimensionsRef.current.width;
    offscreenCanvas.height = dimensionsRef.current.height;
    const offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });
    if (!offscreenCtx) return;

    // Initialize FPS counter
    fpsTimerRef.current = Date.now();
    fpsCounterRef.current = 0;
    
    // Optimized game update logic - separated from rendering
    const updateGameState = (deltaTime: number) => {
      const dimensions = dimensionsRef.current;
      const gameState = gameStateRef.current;
      const now = Date.now();
      
      // Calculate time-based velocity change (for consistent physics regardless of framerate)
      const timeScale = deltaTime / (1000 / 60); // Normalize to 60fps
      let newVelocity = gameState.velocity + (GRAVITY * timeScale);
      
      // Calculate new position with velocity
      let newPosition = gameState.position + (newVelocity * timeScale);
      
      // Prevent the character from going off-screen
      let hitBoundary = false;
      
      // Define boundaries
      const TOP_BOUNDARY = 80 * dimensions.scale;
      const BOTTOM_BOUNDARY = dimensions.height - 20 * dimensions.scale;
      const scaledCharacterSize = CHARACTER_SIZE * dimensions.scale;
      
      // Fix vibration at boundaries with buffer
      const TOP_BUFFER = TOP_BOUNDARY + (scaledCharacterSize / 2);
      const BOTTOM_BUFFER = BOTTOM_BOUNDARY - (scaledCharacterSize / 2);
      
      if (newPosition < TOP_BUFFER) {
        newPosition = TOP_BUFFER;
        newVelocity = 0;
        hitBoundary = true;
      } else if (newPosition > BOTTOM_BUFFER) {
        newPosition = BOTTOM_BUFFER;
        newVelocity = 0;
        hitBoundary = true;
      }
      
      // Apply penalty for hitting boundaries (with throttling)
      let newScore = gameState.score;
      if (hitBoundary && now - boundaryHitTimeRef.current > 1000) {
        newScore = Math.max(0, newScore - BOUNDARY_PENALTY);
        boundaryHitTimeRef.current = now;
      }

      // Calculate obstacle speed based on score but with an upper limit
      const baseSpeed = 8 * dimensions.scale;
      const speedMultiplier = Math.min(2.5, 1 + gameState.score / 2000); // Cap at 2.5x for fairness
      const OBSTACLE_SPEED = baseSpeed * speedMultiplier;

      // Update obstacles using time-scaling for consistent speed regardless of framerate
      const updatedObstacles = gameState.obstacles
        .map(obs => ({
          ...obs,
          x: obs.x - (OBSTACLE_SPEED * timeScale),
          rotation: obs.rotation ? obs.rotation + (0.01 * timeScale) : 0
        }))
        .filter(obs => obs.x > -30);

      // Check collisions
      const collisions = checkCollisions(newPosition, updatedObstacles);
      let newLives = gameState.lives;
      let newCombo = gameState.combo;

      collisions.forEach((obstacle) => {
        if (obstacle.type === 'bubble') {
          // Calculate points based on combo
          const points = obstacle.points * (1 + Math.floor(newCombo / 3));
          newScore += points;
          newCombo += 1;
        } else {
          // Hit obstacle
          newScore = Math.max(0, newScore - 20);
          newLives--;
          newCombo = 0;
        }
      });

      // Reset combo if no bubbles collected for a while
      if (newCombo > 0 && now - gameState.lastObstacleTime > 3000) {
        newCombo = 0;
      }

      // Remove collided obstacles
      const remainingObstacles = updatedObstacles.filter(
        (obs) => !collisions.includes(obs)
      );

      // Add new obstacles based on score and delta time (for consistent spawn rates)
      // Scale obstacle generation with time to maintain consistent difficulty
     // Add new obstacles based on score and delta time (for consistent spawn rates)
// Scale obstacle generation with time to maintain consistent difficulty
const baseObstacleChance = 1 + Math.min(0.05, gameState.score / 1000);
const obstacleChancePerFrame = baseObstacleChance * (deltaTime / 1000);

if (Math.random() < obstacleChancePerFrame) {
  remainingObstacles.push(generateObstacle(newScore));
}

      // Check game over
      if (newLives <= 0) {
        onGameOver(newScore);
        return false; // Signal to stop the game loop
      }

      // Update game state reference
      gameStateRef.current = {
        ...gameState,
        position: newPosition,
        velocity: newVelocity,
        obstacles: remainingObstacles,
        score: newScore,
        lives: newLives,
        combo: newCombo,
        lastObstacleTime: collisions.some(o => o.type === 'bubble') ? now : gameState.lastObstacleTime
      };
      
      // Update UI state less frequently (optimization)
      if (now - lastUiUpdateTimeRef.current > 100) { // Update UI at most 10 times per second
        setUIState({
          score: newScore,
          lives: newLives,
          combo: newCombo
        });
        lastUiUpdateTimeRef.current = now;
      }
      
      return true; // Continue the game loop
    };
    
    // Draw game state to off-screen canvas
    const renderGame = () => {
      const dimensions = dimensionsRef.current;
      const gameState = gameStateRef.current;
      
      // Clear off-screen canvas
      offscreenCtx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      // Draw background
      drawBackground(offscreenCtx);
      
      // Draw boundary danger zones
      drawBoundaries(offscreenCtx);

      // Draw character with animation effects
      const characterImg = imagesRef.current.character;
      if (characterImg) {
        const characterXPos = dimensions.width * 0.125;
        offscreenCtx.save();
        offscreenCtx.translate(characterXPos, gameState.position);
        
        // Add slight bobbing effect (less intensive calculation)
        const bobAmount = Math.sin(Date.now() * 0.002) * 2 * dimensions.scale;
        offscreenCtx.translate(0, bobAmount);
        
        // Rotation based on velocity
        offscreenCtx.rotate(Math.min(0.3, Math.max(-0.3, gameState.velocity * 0.02)));
        
        // Draw character
        const scaledSize = CHARACTER_SIZE * dimensions.scale;
        offscreenCtx.drawImage(
          characterImg,
          -scaledSize / 2,
          -scaledSize / 2,
          scaledSize,
          scaledSize
        );
        
        // Draw motion trail only if moving fast and FPS is good
        if (Math.abs(gameState.velocity) > 5 && currentFpsRef.current > 30) {
          offscreenCtx.globalAlpha = 0.2;
          offscreenCtx.drawImage(
            characterImg,
            -scaledSize / 2,
            -scaledSize / 2 - (gameState.velocity * 0.5),
            scaledSize,
            scaledSize
          );
        }
        
        offscreenCtx.restore();
      }

      // Draw obstacles efficiently by batching similar types
      const bubbles = gameState.obstacles.filter(o => o.type === 'bubble');
      const bombs = gameState.obstacles.filter(o => o.type === 'bomb');
      
      const obstacleSize = 90 * dimensions.scale; // Increased from 40 to 60
      const bubbleImg = imagesRef.current.bubble;
      const bombImg = imagesRef.current.bomb;
      
   
if (bubbles.length > 0) {
  bubbles.forEach(bubble => {
    offscreenCtx.save();
    offscreenCtx.translate(bubble.x, bubble.y);
    
    if (bubble.rotation) {
      offscreenCtx.rotate(bubble.rotation);
    }
    
    if (bubbleImg) {
      offscreenCtx.drawImage(bubbleImg, -obstacleSize/2, -obstacleSize/2, obstacleSize, obstacleSize);
    } else {
      // Simplified fallback bubble
      offscreenCtx.beginPath();
      offscreenCtx.arc(0, 0, 15 * dimensions.scale, 0, Math.PI * 2);
      offscreenCtx.fillStyle = 'rgba(100, 181, 246, 0.8)';
      offscreenCtx.fill();
    }
    
    // Create a small background circle for the points
    const pointCircleRadius = 40 * dimensions.scale;
    offscreenCtx.beginPath();
    offscreenCtx.arc(0, 0, pointCircleRadius, 0, Math.PI * 2);
    offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    offscreenCtx.fill();
    
    // Draw points with much larger size
// Draw points with much larger size
offscreenCtx.font = `bold ${28 * dimensions.scale}px sans-serif`; // Increased from 22 to 28
    offscreenCtx.textAlign = 'center';
    offscreenCtx.textBaseline = 'middle';
    
    // Add glow effect
    offscreenCtx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    offscreenCtx.shadowBlur = 8 * dimensions.scale;
    
    // Draw the text with a bright color
    offscreenCtx.fillStyle = '#FFEB3B'; // Bright yellow color
    offscreenCtx.fillText(bubble.points.toString(), 0, 0);
    
    // Reset shadow
    offscreenCtx.shadowColor = 'transparent';
    offscreenCtx.shadowBlur = 0;
    
    offscreenCtx.restore();
  });
}

// Draw all bombs
if (bombs.length > 0) {
  bombs.forEach(bomb => {
    offscreenCtx.save();
    offscreenCtx.translate(bomb.x, bomb.y);
    
    if (bomb.rotation) {
      offscreenCtx.rotate(bomb.rotation);
    }
    
    if (bombImg) {
      offscreenCtx.drawImage(bombImg, -obstacleSize/2, -obstacleSize/2, obstacleSize, obstacleSize);
    } else {
      // Simplified fallback bomb
      offscreenCtx.beginPath();
      offscreenCtx.arc(0, 0, 15 * dimensions.scale, 0, Math.PI * 2);
      offscreenCtx.fillStyle = 'rgba(244, 67, 54, 0.8)';
      offscreenCtx.fill();
    }
    
    offscreenCtx.restore();
  });
}
      


      // Draw UI
      drawUI(offscreenCtx);
      
      // Copy from offscreen canvas to main canvas (single operation)
      ctx.drawImage(offscreenCanvas, 0, 0);
    };

    // Main game loop with frame timing
    const gameLoop = (timestamp: number) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      // Calculate time since last frame
      const deltaTime = timestamp - lastFrameTimeRef.current;
      
      // Update FPS counter
      fpsCounterRef.current++;
      if (timestamp - fpsTimerRef.current >= 1000) {
        currentFpsRef.current = fpsCounterRef.current;
        fpsCounterRef.current = 0;
        fpsTimerRef.current = timestamp;
      }
      
      // Skip frames if running too fast (frame limiting)
      if (deltaTime < FRAME_TIME - 1) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      // Update game state
      const continueGame = updateGameState(deltaTime);
      if (!continueGame) return;
      
      // Render game
      renderGame();
      
      // Save the time for next frame
      lastFrameTimeRef.current = timestamp;
      
      // Request next frame
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPaused, showTutorial, checkCollisions, generateObstacle, drawBackground, drawBoundaries, drawUI, onGameOver]);
  
  // Render tutorial screen
  const renderTutorial = () => {
    if (!showTutorial) return null;

    return (
      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4 z-50">
        <h2 className="text-3xl font-bold mb-6">How to Play</h2>
        <div className="bg-slate-900/80 p-6 rounded-lg max-w-md">
          <div className="flex items-center mb-4">
            <div className="bg-indigo-600 p-3 rounded-full mr-4">
              <Zap size={24} />
            </div>
            <p>Press <span className="bg-white text-black px-2 py-1 rounded">SPACE</span> or tap the screen to jump</p>
          </div>
          <div className="flex items-center mb-4">
            <div className="bg-red-600 p-3 rounded-full mr-4">
              <Heart size={24} />
            </div>
            <p>Avoid the dangerous boundaries at the top and bottom</p>
          </div>
          <div className="flex items-center mb-4">
            <div className="bg-amber-500 p-3 rounded-full mr-4">
              <Star size={24} />
            </div>
            <p>Collect bubbles for points and build your combo</p>
          </div>
          <button 
            onClick={() => setShowTutorial(false)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg w-full mt-6 transition-colors"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  };

  // Render pause screen
  const renderPauseScreen = () => {
    if (!isPaused) return null;

    return (
      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4 z-50">
        <div className="bg-slate-900/80 p-6 rounded-lg max-w-md text-center">
          <h2 className="text-3xl font-bold mb-4">Game Paused</h2>
          <p className="mb-6">Take a break! Press ESC to continue</p>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsPaused(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg flex-1 transition-colors"
            >
              Resume
            </button>
            <button 
              onClick={() => onGameOver(gameStateRef.current.score)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg flex-1 transition-colors"
            >
              Quit
            </button>
          </div>
        </div>
      </div>
    );
  };

  // UI Elements for mobile controls
  const renderMobileControls = () => {
    if (isPaused || showTutorial) return null;

    return (
      <div className="absolute bottom-4 right-4 z-40">
        <button 
          onClick={() => setIsPaused(true)}
          className="bg-slate-800/50 hover:bg-slate-800/70 p-4 rounded-full text-white transition-colors"
          aria-label="Pause"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-900"
      role="application"
      aria-label="Game area"
    >
      <canvas
        ref={canvasRef}
        width={dimensionsRef.current.width}
        height={dimensionsRef.current.height}
        className="w-full h-full"
      />
      {renderTutorial()}
      {renderPauseScreen()}
      {renderMobileControls()}
    </div>
  );
}