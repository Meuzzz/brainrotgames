import React, { useState } from 'react';
import { CharacterSelect } from './components/CharacterSelect';
import { Game } from './components/Game';
import { Character } from './types';

function App() {
  const [character, setCharacter] = useState<Character>();
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const handleGameOver = (score: number) => {
    setGameOver(true);
    setFinalScore(score);
  };

  const handleRestart = () => {
    setGameOver(false);
    setCharacter(undefined);
  };

  if (!character) {
    return <CharacterSelect onSelect={setCharacter} />;
  }

  if (gameOver) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-blue-950">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 sm:p-8 text-center max-w-xs sm:max-w-md mx-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Game Over!</h1>
          <p className="text-xl sm:text-2xl text-white mb-6 sm:mb-8">Final Score: {finalScore}</p>
          <button
            onClick={handleRestart}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return <Game character={character} onGameOver={handleGameOver} />;
}

export default App;