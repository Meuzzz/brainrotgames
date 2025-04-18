export interface Character {
  name: string;
  description: string;
  image: string;
  backgroundStyle: {
    primary: string;
    secondary: string;
  };
  power?: string;
  difficulty?: string;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  type: 'bubble' | 'bomb';
  points: number;
  rotation?: number;
}

export interface GameState {
  score: number;
  lives: number;
  isPlaying: boolean;
  character: Character;
  position: number;
  velocity: number;
  obstacles: Obstacle[];
  combo: number;
  lastObstacleTime: number;
}