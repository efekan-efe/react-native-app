import { Audio } from "expo-av";
import React, { useState } from "react";
import { Animated, Dimensions, Modal, SafeAreaView, StatusBar, Text, TouchableOpacity, View } from "react-native";

const PUZZLES = [
  {
    level: 1,
    image: "🏠",
    theme: "Home",
    targetWords: ["HOME", "ROOM", "DOOR", "ROOF", "MORE"],
    letters: ["H", "O", "O", "M", "E", "R", "D", "F"],
  },
  {
    level: 2,
    image: "🌳",
    theme: "Nature",
    targetWords: ["TREE", "ROOT", "ROSE", "SORT", "REST"],
    letters: ["T", "R", "E", "E", "S", "O", "O"],
  },
  {
    level: 3,
    image: "☀️",
    theme: "Weather",
    targetWords: ["RAIN", "WIND", "WARM", "DRAW", "WARD"],
    letters: ["R", "A", "A", "I", "N", "W", "D", "M"],
  },
  {
    level: 4,
    image: "🎂",
    theme: "Food",
    targetWords: ["BREAD", "BEAR", "READ", "DEAR", "BEAD"],
    letters: ["B", "R", "E", "A", "A", "D"],
  },
  {
    level: 5,
    image: "🚗",
    theme: "Travel",
    targetWords: ["ROAD", "CARD", "CORD", "ARCH", "CHAR"],
    letters: ["R", "O", "A", "D", "C", "H"],
  },
];

const { height } = Dimensions.get("window");

export default function App() {
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<number[]>([]);
  const [message, setMessage] = useState<string>("");
  const [hints, setHints] = useState<number>(3);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<string>("large");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showLevelComplete, setShowLevelComplete] = useState<boolean>(false);
  const [showFoundWords, setShowFoundWords] = useState<boolean>(false);

  const [letterAnimations] = useState(
    Array(8)
      .fill(0)
      .map(() => new Animated.Value(1))
  );
  const [messageAnimation] = useState(new Animated.Value(0));
  const [successAnimation] = useState(new Animated.Value(0));

  const puzzle = PUZZLES[currentLevel];

  // Ses dosyalarını statik olarak require ile tanımlıyoruz
  const SOUND_FILES: Record<string, any> = {
    tap: require("../sounds/tap.mp3"), // Dosya yollarının doğru olduğundan emin ol
    success: require("../sounds/success.mp3"),
    error: require("../sounds/error.mp3"),
    clear: require("../sounds/clear.mp3"),
    complete: require("../sounds/complete.mp3"),
  };

  // Sound effects - simplified for web compatibility
  const playSound = async (type: "tap" | "success" | "error" | "clear" | "complete") => {
    if (!soundEnabled) return;

    try {
      // Ses dosyasını yükle ve oynat
      const { sound } = await Audio.Sound.createAsync(SOUND_FILES[type]);

      // Sesi çal
      await sound.playAsync();

      // Ses bitince bellekten temizle (Memory Leak önlemek için)
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log("Ses çalma hatası:", error);
    }
  };

  const animateLetter = (index: number) => {
    Animated.sequence([
      Animated.timing(letterAnimations[index], {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(letterAnimations[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateMessage = () => {
    messageAnimation.setValue(0);
    Animated.sequence([
      Animated.spring(messageAnimation, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateSuccess = () => {
    successAnimation.setValue(0);
    Animated.sequence([
      Animated.spring(successAnimation, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(successAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const selectLetter = (letter: string, index: number) => {
    if (selectedLetters.includes(index)) return;

    playSound("tap");
    animateLetter(index);
    setCurrentWord([...currentWord, letter]);
    setSelectedLetters([...selectedLetters, index]);
    setMessage("");
  };

  const clearWord = () => {
    playSound("clear");
    setCurrentWord([]);
    setSelectedLetters([]);
    setMessage("");
  };

  const submitWord = () => {
    const word = currentWord.join("");

    if (word.length < 3) {
      playSound("error");
      setMessage("❌ Too short - need 3+ letters");
      animateMessage();
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    if (foundWords.includes(word)) {
      playSound("error");
      setMessage("❌ Already found!");
      animateMessage();
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    if (puzzle.targetWords.includes(word)) {
      playSound("success");
      const newFoundWords = [...foundWords, word];
      setFoundWords(newFoundWords);
      setMessage(`✓ Excellent! "${word}"`);
      animateMessage();
      animateSuccess();
      setCurrentWord([]);
      setSelectedLetters([]);

      if (newFoundWords.length === puzzle.targetWords.length) {
        setTimeout(() => {
          playSound("complete");
          setShowLevelComplete(true);
        }, 1000);
      }

      setTimeout(() => setMessage(""), 2000);
    } else {
      playSound("error");
      setMessage("❌ Not in word list");
      animateMessage();
      setTimeout(() => setMessage(""), 2000);
    }
  };

  const useHint = () => {
    if (hints <= 0) {
      playSound("error");
      setMessage("No hints left");
      animateMessage();
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    playSound("tap");
    const remainingWords = puzzle.targetWords.filter((w) => !foundWords.includes(w));
    if (remainingWords.length > 0) {
      const hintWord = remainingWords[0];
      setMessage(`💡 Hint: Try "${hintWord[0]}..." (${hintWord.length} letters)`);
      animateMessage();
      setHints(hints - 1);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const nextLevel = () => {
    playSound("tap");
    if (currentLevel < PUZZLES.length - 1) {
      setCurrentLevel(currentLevel + 1);
      setFoundWords([]);
      setCurrentWord([]);
      setSelectedLetters([]);
      setMessage("");
      setHints(3);
      setShowLevelComplete(false);
    } else {
      setMessage("🎉 You completed all levels!");
      setShowLevelComplete(false);
    }
  };

  const resetLevel = () => {
    playSound("clear");
    setFoundWords([]);
    setCurrentWord([]);
    setSelectedLetters([]);
    setMessage("");
  };

  const messageScale = messageAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const successScale = successAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.5],
  });

  const successOpacity = successAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-blue-100 to-purple-100" style={{ backgroundColor: "#E0F2FE" }}>
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 px-6 py-4">
        {/* Compact Header */}
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-1">
            <Text className="text-2xl text-gray-700 mt-1">
              Level {puzzle.level}: {puzzle.theme} {puzzle.image}
            </Text>
          </View>
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={() => setShowHelp(true)} className="p-5 bg-blue-500 rounded-3xl active:bg-blue-600 shadow-lg">
              <Text className="text-4xl">❓</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSettings(true)} className="p-5 bg-purple-500 rounded-3xl active:bg-purple-600 shadow-lg">
              <Text className="text-4xl">⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar with Stats */}
        <View className="bg-white rounded-3xl shadow-xl p-5 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-3xl font-bold text-gray-800">
              {foundWords.length} of {puzzle.targetWords.length} Words
            </Text>
            <TouchableOpacity onPress={() => setShowFoundWords(true)} className="px-5 py-3 bg-green-500 rounded-2xl active:bg-green-600">
              <Text className="text-2xl font-bold text-white">View Words</Text>
            </TouchableOpacity>
          </View>
          <View className="w-full bg-gray-200 rounded-full h-8">
            <View className="bg-gradient-to-r from-green-400 to-green-600 h-8 rounded-full" style={{ width: `${(foundWords.length / puzzle.targetWords.length) * 100}%`, backgroundColor: "#22C55E" }} />
          </View>
        </View>

        {/* Current Word Display - Large and Clear */}
        <View className="bg-white rounded-3xl shadow-xl p-6 mb-3" style={{ minHeight: height * 0.16 }}>
          <Text className="text-xl font-semibold text-gray-600 mb-3 text-center">Your Word:</Text>
          <View className="items-center justify-center" style={{ minHeight: 80 }}>
            {currentWord.length > 0 ? (
              <View className="flex-row flex-wrap justify-center gap-2">
                {currentWord.map((letter, idx) => (
                  <View key={idx} className="bg-purple-600 w-full flex justify-center items-center max-w-20 p-2 rounded-2xl shadow-lg" style={{ minHeight: 80 }}>
                    <Text className="text-4xl font-bold text-white" style={{ lineHeight: 60 }}>
                      {letter}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-gray-400 text-2xl text-center">Tap letters below</Text>
            )}
          </View>

          {/* Message Display with Animation */}
          {message ? (
            <Animated.View style={{ transform: [{ scale: messageScale }], marginTop: 12 }}>
              <Text className={`text-center text-2xl font-bold ${message.includes("✓") ? "text-green-600" : message.includes("💡") ? "text-yellow-600" : "text-red-500"}`}>{message}</Text>
            </Animated.View>
          ) : null}
        </View>

        {/* Action Buttons - Extra Large */}
        <View className="flex-row gap-3 mb-3">
          <TouchableOpacity onPress={clearWord} disabled={currentWord.length === 0} className={`flex-1 py-5 rounded-2xl shadow-lg ${currentWord.length > 0 ? "bg-red-500 active:bg-red-600" : "bg-gray-300"}`}>
            <Text className="font-bold text-2xl text-white text-center">Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={submitWord} disabled={currentWord.length < 3} className={`flex-1 py-5 rounded-2xl shadow-lg ${currentWord.length >= 3 ? "bg-green-500 active:bg-green-600" : "bg-gray-300"}`}>
            <Text className="font-bold text-2xl text-white text-center">Submit ✓</Text>
          </TouchableOpacity>
        </View>

        {/* Letter Grid - Large Buttons */}
        <View className="bg-white rounded-3xl shadow-xl p-4 flex-1 mb-3">
          <View className="flex-row flex-wrap justify-center gap-2">
            {puzzle.letters.map((letter, index) => (
              <Animated.View key={`${letter}-${index}`} style={{ transform: [{ scale: letterAnimations[index] }] }}>
                <TouchableOpacity
                  onPress={() => selectLetter(letter, index)}
                  disabled={selectedLetters.includes(index)}
                  className={`w-20 h-20 rounded-2xl items-center justify-center shadow-lg ${selectedLetters.includes(index) ? "bg-gray-300" : "bg-purple-600 active:bg-purple-700"}`}
                >
                  <Text className="text-4xl font-bold text-white">{letter}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Bottom Toolbar */}
        <View className="flex-row gap-2 justify-between">
          <TouchableOpacity onPress={useHint} disabled={hints <= 0} className={`flex-row items-center gap-2 px-6 py-4 rounded-2xl shadow-lg ${hints > 0 ? "bg-yellow-400 active:bg-yellow-500" : "bg-gray-300"}`}>
            <Text className="text-3xl">💡</Text>
            <Text className="text-2xl font-bold text-gray-800">{hints}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetLevel} className="px-6 py-4 bg-orange-500 rounded-2xl shadow-lg active:bg-orange-600">
            <Text className="text-3xl">↻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Animation Overlay */}
      {successAnimation && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            marginLeft: -75,
            transform: [{ scale: successScale }],
            opacity: successOpacity,
          }}
        >
          <Text className="text-9xl">⭐</Text>
        </Animated.View>
      )}

      {/* Found Words Modal */}
      <Modal visible={showFoundWords} animationType="slide" transparent={true} onRequestClose={() => setShowFoundWords(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 p-6">
          <View className="bg-white rounded-3xl p-10 w-full max-w-md">
            <Text className="text-4xl font-bold text-green-600 mb-6 text-center">Found Words</Text>
            <View className="flex-row flex-wrap justify-center gap-3 mb-6">
              {foundWords.length === 0 ? (
                <Text className="text-2xl text-gray-400">No words found yet</Text>
              ) : (
                foundWords.map((word, idx) => (
                  <View key={idx} className="bg-green-100 px-6 py-4 rounded-2xl">
                    <Text className="text-3xl font-bold text-green-700">{word}</Text>
                  </View>
                ))
              )}
            </View>
            <TouchableOpacity onPress={() => setShowFoundWords(false)} className="bg-green-500 py-6 rounded-3xl">
              <Text className="text-3xl font-bold text-white text-center">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal visible={showHelp} animationType="slide" transparent={true} onRequestClose={() => setShowHelp(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 p-6">
          <View className="bg-white rounded-3xl p-10 w-full max-w-md">
            <Text className="text-4xl font-bold text-blue-600 mb-6">How to Play</Text>
            <Text className="text-2xl text-gray-700 mb-4">• Tap letters to form words</Text>
            <Text className="text-2xl text-gray-700 mb-4">• Words must be 3+ letters</Text>
            <Text className="text-2xl text-gray-700 mb-4">• Find all words to win</Text>
            <Text className="text-2xl text-gray-700 mb-4">• Use hints if stuck</Text>
            <Text className="text-2xl text-gray-700 mb-6">• Clear removes current word</Text>
            <TouchableOpacity onPress={() => setShowHelp(false)} className="bg-blue-500 py-6 rounded-3xl">
              <Text className="text-3xl font-bold text-white text-center">Got It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent={true} onRequestClose={() => setShowSettings(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 p-6">
          <View className="bg-white rounded-3xl p-10 w-full max-w-md">
            <Text className="text-4xl font-bold text-purple-600 mb-6">Settings</Text>

            <Text className="text-2xl text-gray-700 mb-4">Text Size:</Text>
            <View className="flex-row gap-3 mb-6">
              {["Medium", "Large", "X-Large"].map((size, idx) => (
                <TouchableOpacity
                  key={size}
                  onPress={() => {
                    playSound("tap");
                    setFontSize(["medium", "large", "xlarge"][idx]);
                  }}
                  className={`flex-1 px-4 py-5 rounded-2xl ${fontSize === ["medium", "large", "xlarge"][idx] ? "bg-purple-500" : "bg-gray-200"}`}
                >
                  <Text className={`text-xl font-semibold text-center ${fontSize === ["medium", "large", "xlarge"][idx] ? "text-white" : "text-gray-700"}`}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => {
                playSound("tap");
                setSoundEnabled(!soundEnabled);
              }}
              className="flex-row justify-between items-center bg-gray-100 p-6 rounded-2xl mb-6"
            >
              <Text className="text-2xl text-gray-700">Sound Effects</Text>
              <Text className="text-4xl">{soundEnabled ? "🔊" : "🔇"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSettings(false)} className="bg-purple-500 py-6 rounded-3xl">
              <Text className="text-3xl font-bold text-white text-center">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Level Complete Modal */}
      <Modal visible={showLevelComplete} animationType="fade" transparent={true} onRequestClose={() => setShowLevelComplete(false)}>
        <View className="flex-1 justify-center items-center bg-black/70 p-6">
          <View className="bg-white rounded-3xl p-12 w-full max-w-md items-center">
            <Text className="text-9xl mb-6">🎉</Text>
            <Text className="text-5xl font-bold text-green-600 text-center mb-4">Level Complete!</Text>
            <Text className="text-3xl text-gray-600 text-center mb-8">You found all {puzzle.targetWords.length} words!</Text>

            <TouchableOpacity onPress={nextLevel} className="bg-green-500 py-8 px-16 rounded-3xl w-full mb-4 shadow-xl">
              <Text className="text-4xl font-bold text-white text-center">{currentLevel < PUZZLES.length - 1 ? "Next Level →" : "Play Again"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowLevelComplete(false);
                resetLevel();
              }}
              className="bg-gray-200 py-6 px-12 rounded-3xl shadow-lg"
            >
              <Text className="text-2xl font-semibold text-gray-700 text-center">Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
