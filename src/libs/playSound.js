// Inicjalizacja kontekstu audio
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Funkcja do generowania dźwięku
export default function playSound(
  frequency = 440,
  type = "square",
  volume = 0.1
) {
  const oscillator = audioContext.createOscillator();
  oscillator.type = type; // 'square', 'sine', 'triangle', 'sawtooth'
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); // Hz

  const gainNode = audioContext.createGain(); // Utwórz GainNode
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime); // Ustaw głośność na 10%

  oscillator.connect(gainNode); // Połącz oscylator z GainNode
  gainNode.connect(audioContext.destination); // Połącz GainNode z docelowym miejscem (głośnikami)

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.1); // Dźwięk trwa 0.1 sekundy
}
