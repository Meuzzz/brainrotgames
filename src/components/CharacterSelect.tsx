import React, { useState, useEffect } from 'react';
import { Character } from '../types';
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import Crocodile from '../assets/Image/BombCorcodile.png';
import Shark from '../assets/Image/Tralalero.png';
import Tung from '../assets/Image/tungtung.png';

interface CharacterSelectProps {
  onSelect: (character: Character) => void;
}

const characters: Character[] = [
  {
    name: 'Bombardino Crocodilo',
    description: 'A stylish crocodile with a monocle and red scarf',
    image: Crocodile,
    backgroundStyle: {
      primary: 'from-emerald-900 to-blue-900',
      secondary: 'bg-blue-800',
    },
    power: 'Mega Jump',
    difficulty: 'Easy',
  },
  {
    name: 'Trallalero Trallalà',
    description: 'A flamboyant fish-man hybrid in a flashy tuxedo',
    image: Shark,
    backgroundStyle: {
      primary: 'from-emerald-900 to-blue-900',
      secondary: 'bg-pink-700',
    },
    power: 'Bubble Shield',
    difficulty: 'Medium',
  },
  {
    name: 'Tung Tung Tung Tung Sahur',
    description: 'A digital entity with glowing circuits and endless swagger',
    image: Tung,
    backgroundStyle: {
      primary: 'from-cyan-900 to-indigo-900',
      secondary: 'bg-indigo-800',
    },
    power: 'Time Slow',
    difficulty: 'Hard',
  },
];

export function CharacterSelect({ onSelect }: CharacterSelectProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSelect = (index: number) => {
    if (animating) return;
    
    setAnimating(true);
    setSelectedIndex(index);
    setTimeout(() => setAnimating(false), 300);
  };

  const nextCharacter = () => {
    if (animating) return;
    handleSelect((selectedIndex + 1) % characters.length);
  };

  const prevCharacter = () => {
    if (animating) return;
    handleSelect((selectedIndex - 1 + characters.length) % characters.length);
  };

  const selectedCharacter = characters[selectedIndex];

  if (showIntro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-blue-950">
        <div className="text-center animate-pulse">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            BUBBLES & BOMBS
          </h1>
          <p className="text-xl text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-b ${selectedCharacter.backgroundStyle.primary} transition-all duration-700 overflow-hidden relative`}>
      {/* Dynamic background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          {/* Bubbles */}
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className="absolute rounded-full bg-white/20 backdrop-blur-md"
              style={{
                width: `${Math.random() * 300 + 50}px`,
                height: `${Math.random() * 300 + 50}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `float ${Math.random() * 10 + 15}s infinite ease-in-out`,
                animationDelay: `${Math.random() * 10}s`,
              }}
            />
          ))}
        </div>
        {/* Glowing gradients */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl"></div>
      </div>
      
      {/* Game title */}
      {/* <div className="mb-10 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400 mb-3">
          BUBBLES & BOMBS
        </h1>
        <p className="text-white/80 text-xl font-light">Choose your champion</p>
      </div> */}
      
      <div className="relative w-full max-w-6xl flex items-center justify-center px-4">
        {/* Navigation arrows */}
        <button 
          onClick={prevCharacter}
          className="absolute left-2 sm:left-8 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300 backdrop-blur-md shadow-lg hover:shadow-xl border border-white/10"
          aria-label="Previous character"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <button 
          onClick={nextCharacter}
          className="absolute right-2 sm:right-8 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300 backdrop-blur-md shadow-lg hover:shadow-xl border border-white/10"
          aria-label="Next character"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        
        {/* Character selection card */}
        <div className="w-full max-w-4xl bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10">
          <div className="flex flex-col md:flex-row">
            {/* Character image */}
            <div className={`w-full md:w-1/2 p-6 flex items-center justify-center transition-all duration-500 relative ${animating ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
              <div className="relative w-64 h-52 animate-float">
                <div className="absolute -inset-4 rounded-full bg-gradient-to-b from-white/10 to-transparent blur-xl opacity-70"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-white/5 blur-md"></div>
                <img
                  src={selectedCharacter.image}
                  alt={selectedCharacter.name}
                  className="w-full h-full object-contain drop-shadow-2xl relative z-10"
                />
                <div className="absolute -inset-12 bg-gradient-radial from-white/5 to-transparent rounded-full"></div>
              </div>
            </div>
            
            {/* Character info */}
            <div className={`w-full md:w-1/2 p-8 ${selectedCharacter.backgroundStyle.secondary}/20 flex flex-col justify-center transition-all duration-500 ${animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              <div className="flex items-center mb-1">
                <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-xs font-medium text-white/80">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                  <span>Character {selectedIndex + 1}/{characters.length}</span>
                </div>
              </div>
              
              <div className="flex items-center mt-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">{selectedCharacter.name}</h2>
                <Sparkles className="w-5 h-5 ml-2 text-yellow-400" />
              </div>
              
              <p className="text-gray-300 mt-2 mb-6 font-light">{selectedCharacter.description}</p>
              
              {/* <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
                  <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Power</div>
                  <div className="text-lg font-semibold text-white">{selectedCharacter.power}</div>
                </div>
                
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
                  <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Difficulty</div>
                  <div className="flex items-center">
                    <div className="text-lg font-semibold text-white">{selectedCharacter.difficulty}</div>
                    {selectedCharacter.difficulty === 'Easy' && (
                      <div className="flex ml-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 mr-1"></div>
                        <div className="w-2 h-2 rounded-full bg-white/20 mr-1"></div>
                        <div className="w-2 h-2 rounded-full bg-white/20"></div>
                      </div>
                    )}
                    {selectedCharacter.difficulty === 'Medium' && (
                      <div className="flex ml-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></div>
                        <div className="w-2 h-2 rounded-full bg-white/20"></div>
                      </div>
                    )}
                    {selectedCharacter.difficulty === 'Hard' && (
                      <div className="flex ml-2">
                        <div className="w-2 h-2 rounded-full bg-red-400 mr-1"></div>
                        <div className="w-2 h-2 rounded-full bg-red-400 mr-1"></div>
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div> */}
              
              <div className="mb-8">
                <div className="flex justify-between text-xs uppercase tracking-wider text-gray-400 mb-2">
                  <span>Stats</span>
                  <span>Max</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-white mb-1">
                      <span>Speed</span>
                      <span>{selectedIndex === 0 ? '60%' : selectedIndex === 1 ? '80%' : '70%'}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                        style={{ width: selectedIndex === 0 ? '60%' : selectedIndex === 1 ? '80%' : '70%', transition: 'width 0.5s ease-in-out' }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm text-white mb-1">
                      <span>Control</span>
                      <span>{selectedIndex === 0 ? '90%' : selectedIndex === 1 ? '70%' : '50%'}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                        style={{ width: selectedIndex === 0 ? '90%' : selectedIndex === 1 ? '70%' : '50%', transition: 'width 0.5s ease-in-out' }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm text-white mb-1">
                      <span>Special</span>
                      <span>{selectedIndex === 0 ? '50%' : selectedIndex === 1 ? '60%' : '100%'}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-400 rounded-full"
                        style={{ width: selectedIndex === 0 ? '50%' : selectedIndex === 1 ? '60%' : '100%', transition: 'width 0.5s ease-in-out' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => onSelect(selectedCharacter)}
                className="group relative overflow-hidden px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <span className="relative z-10 flex items-center justify-center text-lg">
                  Select Character
                  <ChevronRight className="w-5 h-5 ml-1 group-hover:ml-2 transition-all" />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="absolute top-0 left-0 w-20 h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-[500%] transition-transform duration-1000" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Character selection dots */}
      <div className="flex justify-center space-x-3 mt-8">
        {characters.map((_, i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            className={`h-3 rounded-full transition-all duration-300 ${
              i === selectedIndex ? 'w-10 bg-white shadow-lg shadow-white/20' : 'w-3 bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Select character ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}