import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildTrainingTarget, getTrainingMode } from "../../../trainingModes.js";
import {
  buildWordTokens,
  calculateStats,
  getModeLabel,
  getNextTypedText,
  getTimeLeft,
} from "../../../typingLogic.js";
import { useRestartShortcut } from "./useRestartShortcut.js";
import { isLastWordFullyCorrect } from "../utils/wordDisplayHelpers.js";

const ACCURACY_LOCK_MISTAKE_LIMIT = 5;

export function useTypingEngine({
  customText,
  testType,
  testValue,
  onFinish,
  restartKey,
  onRestart,
  onStart,
  onActiveChange,
  mistakeMode,
  targetTextOverride,
  language = "english",
  trainingMode = "standard",
}) {
  const [targetText, setTargetText] = useState("");
  const [typedText, setTypedText] = useState("");
  const [timeLeft, setTimeLeft] = useState(testType === "time" ? testValue : 0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isTypingFocused, setIsTypingFocused] = useState(false);

  const inputRef = useRef(null);
  const wordDisplayRef = useRef(null);
  const keyboardRef = useRef(null);
  const currentLetterRef = useRef(null);
  const elapsedTimeRef = useRef(0);
  const isRunningRef = useRef(false);
  const targetTextRef = useRef("");
  const timeLeftRef = useRef(testType === "time" ? testValue : 0);
  const typedTextRef = useRef("");
  const startedAtRef = useRef(null);
  const accumulatedElapsedRef = useRef(0);
  const isTypingFocusedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const hasFinishedRef = useRef(false);
  const speedHistoryRef = useRef([]);
  const keystrokeLogRef = useRef([]);
  // Set by usePressedKeys on every keydown (event.code), so keystrokeLog
  // entries can remember which physical key produced each change. Needed to
  // replay the "cream" sound style later, since it looks up per-key audio
  // clips by scancode rather than by character.
  const lastKeyCodeRef = useRef(null);
  // Tracks every character position that was ever typed incorrectly during
  // this run, even if the user later backspaced and fixed it. Used so the
  // final accuracy reflects mistakes-made rather than just mistakes-left.
  const historicalMistakeIndicesRef = useRef(new Set());

  const focusInput = useCallback(() => {
    isTypingFocusedRef.current = true;
    setIsTypingFocused(true);
    inputRef.current?.focus();
  }, []);

  const wordTokens = useMemo(() => buildWordTokens(targetText), [targetText]);
  const isIdle = typedText.length === 0 && !isRunning;
  const isReplay = Boolean(targetTextOverride);
  const activeTrainingMode = getTrainingMode(trainingMode);
  const isAccuracyLock = trainingMode === "accuracy-lock";
  const liveStats = calculateStats(
    targetText,
    typedText,
    Math.max(elapsedTime, 0.1),
  );
  const currentMistakes = liveStats.wrongChars;

  const recordSpeedSnapshot = useCallback(
    (elapsedSeconds, nextTypedText) => {
      const normalizedElapsedSeconds = Math.max(0, elapsedSeconds);
      const snapshot = calculateStats(
        targetText,
        nextTypedText,
        normalizedElapsedSeconds,
      );
      const lastSnapshot = speedHistoryRef.current.at(-1);

      if (
        lastSnapshot &&
        normalizedElapsedSeconds - lastSnapshot.elapsedSeconds < 0.45 &&
        snapshot.wpm === lastSnapshot.wpm
      ) {
        return;
      }

      speedHistoryRef.current = [
        ...speedHistoryRef.current,
        {
          elapsedSeconds: normalizedElapsedSeconds,
          wpm: snapshot.wpm,
        },
      ].slice(-90);
    },
    [targetText],
  );

  const createResult = useCallback(
    (nextTypedText, elapsedSeconds, options = {}) => {
      const finalStats = calculateStats(
        targetText,
        nextTypedText,
        Math.max(elapsedSeconds, 0.1),
        historicalMistakeIndicesRef.current.size,
      );
      const normalizedElapsed = Math.max(0.1, Number(elapsedSeconds) || 0.1);
      const rawWpm = Math.round(
        nextTypedText.length / 5 / (normalizedElapsed / 60),
      );
      const netWpm = finalStats.wpm;
      const speedHistory = [...speedHistoryRef.current];
      const lastSnapshot = speedHistory.at(-1);

      if (
        !lastSnapshot ||
        lastSnapshot.elapsedSeconds !== finalStats.elapsedSeconds ||
        lastSnapshot.wpm !== finalStats.wpm
      ) {
        speedHistory.push({
          elapsedSeconds: finalStats.elapsedSeconds,
          wpm: finalStats.wpm,
        });
      }

      return {
        ...finalStats,
        endedByAccuracyLock: Boolean(options.endedByAccuracyLock),
        keystrokeLog: [...keystrokeLogRef.current],
        language,
        modeLabel: getModeLabel(testType, testValue, trainingMode, language),
        netWpm,
        rawWpm,
        speedHistory,
        targetText,
        testType,
        typedText: nextTypedText,
        trainingMode,
      };
    },
    [language, targetText, testType, testValue, trainingMode],
  );

  const pauseWordTimer = useCallback(() => {
    if (testType !== "words") return;
    if (
      !isRunningRef.current ||
      !startedAtRef.current ||
      hasFinishedRef.current
    )
      return;

    const elapsed = (performance.now() - startedAtRef.current) / 1000;
    accumulatedElapsedRef.current += elapsed;
    startedAtRef.current = null;
    elapsedTimeRef.current = accumulatedElapsedRef.current;
    setElapsedTime(accumulatedElapsedRef.current);
    isRunningRef.current = false;
    setIsRunning(false);
    onActiveChange(false);
  }, [onActiveChange, testType]);

  // Build/reset the target text whenever the test config or restartKey changes.
  useEffect(() => {
    const nextTargetText =
      targetTextOverride ||
      buildTrainingTarget({
        customText,
        language,
        testType,
        testValue,
        trainingMode,
      });

    targetTextRef.current = nextTargetText;
    setTargetText(nextTargetText);
    setTypedText("");
    timeLeftRef.current = testType === "time" ? testValue : 0;
    setTimeLeft(testType === "time" ? testValue : 0);
    elapsedTimeRef.current = 0;
    setElapsedTime(0);
    isRunningRef.current = false;
    setIsRunning(false);
    startedAtRef.current = null;
    accumulatedElapsedRef.current = 0;
    hasStartedRef.current = false;
    hasFinishedRef.current = false;
    isTypingFocusedRef.current = true;
    setIsTypingFocused(true);
    typedTextRef.current = "";
    speedHistoryRef.current = [];
    keystrokeLogRef.current = [];
    historicalMistakeIndicesRef.current = new Set();
    onActiveChange(false);

    window.requestAnimationFrame(() => {
      focusInput();
    });
  }, [
    testType,
    testValue,
    restartKey,
    focusInput,
    onActiveChange,
    customText,
    language,
    targetTextOverride,
    trainingMode,
  ]);

  // Keep refs in sync with the corresponding state so effects/callbacks can
  // read the latest value without becoming stale closures.
  useEffect(() => {
    typedTextRef.current = typedText;
  }, [typedText]);

  useEffect(() => {
    targetTextRef.current = targetText;
  }, [targetText]);

  useEffect(() => {
    elapsedTimeRef.current = elapsedTime;
  }, [elapsedTime]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // Tick the clock while the test is running.
  useEffect(() => {
    if (!isRunning) return undefined;

    const interval = setInterval(() => {
      const elapsed = (performance.now() - startedAtRef.current) / 1000;
      const totalElapsed =
        testType === "words"
          ? accumulatedElapsedRef.current + elapsed
          : elapsed;
      elapsedTimeRef.current = totalElapsed;
      setElapsedTime(totalElapsed);
      recordSpeedSnapshot(totalElapsed, typedTextRef.current);

      if (testType !== "time") return;

      const nextTimeLeft = getTimeLeft(testValue, totalElapsed);
      timeLeftRef.current = nextTimeLeft;
      setTimeLeft(nextTimeLeft);

      if (nextTimeLeft === 0) {
        clearInterval(interval);
        isRunningRef.current = false;
        setIsRunning(false);
        onActiveChange(false);
        onFinish(createResult(typedTextRef.current, testValue));
      }
    }, 250);

    return () => clearInterval(interval);
  }, [
    createResult,
    isRunning,
    onActiveChange,
    onFinish,
    recordSpeedSnapshot,
    testType,
    testValue,
  ]);

  useRestartShortcut(onRestart);

  const applyTypedValue = useCallback(
    (value) => {
      const currentTargetText = targetTextRef.current;

      if (testType === "time" && timeLeftRef.current === 0) return;
      if (hasFinishedRef.current) return;
      if (!isTypingFocusedRef.current) {
        return;
      }

      const currentTypedText = typedTextRef.current;

      if (!hasStartedRef.current && value.length > 0) {
        startedAtRef.current = performance.now();
        hasStartedRef.current = true;
        speedHistoryRef.current = [{ elapsedSeconds: 0, wpm: 0 }];
        keystrokeLogRef.current = [{ t: 0, len: 0 }];
        isRunningRef.current = true;
        setIsRunning(true);
        onActiveChange(true);
        onStart({
          language,
          targetText: currentTargetText,
          testType,
          testValue,
          trainingMode,
        });
      } else if (
        testType === "words" &&
        hasStartedRef.current &&
        !isRunningRef.current &&
        value !== currentTypedText
      ) {
        startedAtRef.current = performance.now();
        isRunningRef.current = true;
        setIsRunning(true);
        onActiveChange(true);
      }

      const nextTypedText = getNextTypedText(
        currentTargetText,
        currentTypedText,
        value,
        mistakeMode !== "strict",
      );

      // Record mistakes as they happen: for every newly-added character
      // (i.e. the text grew rather than being backspaced), check it against
      // the target and remember the position if it was wrong. This persists
      // even after the user corrects it, so accuracy isn't wiped clean by a
      // later fix.
      if (nextTypedText.length > currentTypedText.length) {
        for (
          let index = currentTypedText.length;
          index < nextTypedText.length;
          index += 1
        ) {
          if (nextTypedText[index] !== currentTargetText[index]) {
            historicalMistakeIndicesRef.current.add(index);
          }
        }
      }

      typedTextRef.current = nextTypedText;
      setTypedText(nextTypedText);

      if (
        startedAtRef.current !== null &&
        nextTypedText.length !== currentTypedText.length
      ) {
        const elapsedMs =
          performance.now() -
          startedAtRef.current +
          accumulatedElapsedRef.current * 1000;
        keystrokeLogRef.current = [
          ...keystrokeLogRef.current,
          // Store the accepted value, rather than just its length, so the
          // completed result can faithfully replay mistakes and corrections.
          // Also store the physical key code so cream-style replay sound
          // can look up the right per-key audio clip.
          { t: Math.round(elapsedMs), text: nextTypedText, code: lastKeyCodeRef.current },
        ].slice(-4000);
      }

      const nextStats = calculateStats(
        currentTargetText,
        nextTypedText,
        Math.max(elapsedTimeRef.current, 0.1),
      );

      if (
        isAccuracyLock &&
        nextStats.wrongChars >= ACCURACY_LOCK_MISTAKE_LIMIT
      ) {
        const currentRunElapsed = startedAtRef.current
          ? (performance.now() - startedAtRef.current) / 1000
          : 0;
        const elapsed =
          testType === "words"
            ? accumulatedElapsedRef.current + currentRunElapsed
            : currentRunElapsed;

        hasFinishedRef.current = true;
        accumulatedElapsedRef.current = elapsed;
        elapsedTimeRef.current = elapsed;
        setElapsedTime(elapsed);
        isRunningRef.current = false;
        setIsRunning(false);
        onActiveChange(false);
        recordSpeedSnapshot(elapsed, nextTypedText);
        onFinish(
          createResult(nextTypedText, elapsed, { endedByAccuracyLock: true }),
        );
        return;
      }

      const isCustomComplete =
        trainingMode === "custom" && nextTypedText === currentTargetText;
      const isWordTestComplete =
        testType === "words" &&
        nextTypedText.length === currentTargetText.length &&
        isLastWordFullyCorrect(currentTargetText, nextTypedText);

      if (isCustomComplete || isWordTestComplete) {
        const currentRunElapsed = startedAtRef.current
          ? (performance.now() - startedAtRef.current) / 1000
          : 0;
        const elapsed = accumulatedElapsedRef.current + currentRunElapsed;
        hasFinishedRef.current = true;
        accumulatedElapsedRef.current = elapsed;
        elapsedTimeRef.current = elapsed;
        setElapsedTime(elapsed);
        isRunningRef.current = false;
        setIsRunning(false);
        onActiveChange(false);
        recordSpeedSnapshot(elapsed, nextTypedText);
        onFinish(createResult(nextTypedText, elapsed));
      }
    },
    [
      createResult,
      isAccuracyLock,
      mistakeMode,
      onActiveChange,
      onFinish,
      onStart,
      recordSpeedSnapshot,
      language,
      testType,
      testValue,
      trainingMode,
    ],
  );

  // Focus the hidden input (and forward the keystroke) whenever the user
  // starts typing without having clicked into the test first.
  useEffect(() => {
    const focusTypingFromKey = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isFormField =
        tagName === "input" || tagName === "textarea" || tagName === "select";

      if (isTypingFocusedRef.current) return;
      if (isFormField || event.target?.isContentEditable) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Tab" || event.key === "Escape") return;

      focusInput();

      if (event.key.length === 1) {
        event.preventDefault();
        applyTypedValue(`${typedTextRef.current}${event.key}`);
      }
    };

    window.addEventListener("keydown", focusTypingFromKey, { capture: true });
    return () => {
      window.removeEventListener("keydown", focusTypingFromKey, {
        capture: true,
      });
    };
  }, [focusInput, applyTypedValue]);

  const blurTypingArea = useCallback(() => {
    pauseWordTimer();
    isTypingFocusedRef.current = false;
    setIsTypingFocused(false);
    inputRef.current?.blur();
    wordDisplayRef.current?.blur();
  }, [pauseWordTimer]);

  useEffect(() => {
    const blurWhenClickingOutside = (event) => {
      if (wordDisplayRef.current?.contains(event.target)) return;
      if (keyboardRef.current?.contains(event.target)) return;
      if (event.target === inputRef.current) return;

      blurTypingArea();
    };

    document.addEventListener("pointerdown", blurWhenClickingOutside);
    window.addEventListener("blur", pauseWordTimer);
    return () => {
      document.removeEventListener("pointerdown", blurWhenClickingOutside);
      window.removeEventListener("blur", pauseWordTimer);
    };
  }, [blurTypingArea, pauseWordTimer]);

  const handleChange = useCallback(
    (event) => {
      if (!isTypingFocusedRef.current) {
        event.target.value = typedText;
        return;
      }

      applyTypedValue(event.target.value);
    },
    [applyTypedValue, typedText],
  );

  const handleWordDisplayKeyDown = useCallback(
    (event) => {
      if (
        [
          " ",
          "ArrowDown",
          "ArrowUp",
          "End",
          "Home",
          "PageDown",
          "PageUp",
          "Spacebar",
        ].includes(event.key)
      ) {
        event.preventDefault();
      }

      focusInput();
    },
    [focusInput],
  );

  const handleInputBlur = useCallback(() => {
    pauseWordTimer();
    isTypingFocusedRef.current = false;
    setIsTypingFocused(false);
    wordDisplayRef.current?.blur();
  }, [pauseWordTimer]);

  return {
    activeTrainingMode,
    currentMistakes,
    elapsedTime,
    focusInput,
    handleChange,
    handleInputBlur,
    handleWordDisplayKeyDown,
    inputRef,
    isAccuracyLock,
    isIdle,
    isReplay,
    lastKeyCodeRef,
    isRunning,
    isTypingFocused,
    isTypingFocusedRef,
    keyboardRef,
    currentLetterRef,
    liveWpm: liveStats.wpm,
    targetText,
    testType,
    timeLeft,
    typedText,
    typedTextRef,
    wordDisplayRef,
    wordTokens,
  };
}