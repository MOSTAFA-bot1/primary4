// Dictation & Practice Mode Logic
(function() {
    'use strict';

    // State
    let state = {
        mode: 'vocab', // Default to vocabulary flashcard mode
        words: [],
        currentIndex: 0,
        correctCount: 0,
        incorrectCount: 0,
        currentStreak: 0,
        maxStreak: 0,
        mistakes: [],
        startTime: null,
        isActive: false,
        settings: {
            shuffle: true,
            autoSpeak: false,
            showMeaning: true
        },
        answered: new Set(), // Track which words have been answered in practice mode
        // Vocabulary mode specific
        vocabKnown: new Set(),     // Indices of words marked as known
        vocabUnknown: new Set(),   // Indices of words marked as unknown
        vocabFlipped: false        // Whether current card is flipped
    };

    // DOM Elements
    const elements = {
        // Setup
        unitSelect: document.getElementById('unit-select'),
        lessonSelect: document.getElementById('lesson-select'),
        setupForm: document.getElementById('setup-form'),
        startBtn: document.getElementById('start-btn'),
        shuffleWords: document.getElementById('shuffle-words'),
        autoSpeak: document.getElementById('auto-speak'),
        setupSection: document.getElementById('setup-section'),
        
        // Mode Selection Buttons
        btnVocab: document.getElementById('btn-vocab'),
        btnPractice: document.getElementById('btn-practice'),
        
        // Dictation Mode
        dictationSection: document.getElementById('dictation-section'),
        dictationContent: document.getElementById('dictation-content'),
        wordDisplay: document.getElementById('word-display'),
        meaningDisplay: document.getElementById('meaning-display'),
        dictationInput: document.getElementById('dictation-input'),
        dictationFeedback: document.getElementById('dictation-feedback'),
        progressFill: document.getElementById('progress-fill'),
        progressText: document.getElementById('progress-text'),
        correctCountEl: document.getElementById('correct-count'),
        incorrectCountEl: document.getElementById('incorrect-count'),
        currentStreakEl: document.getElementById('current-streak'),
        submitBtn: document.getElementById('submit-btn'),
        speakBtn: document.getElementById('speak-btn'),
        skipBtn: document.getElementById('skip-btn'),
        
        // Practice Mode
        practiceSection: document.getElementById('practice-section'),
        practiceContent: document.getElementById('practice-content'),
        practiceArabicWord: document.getElementById('practice-arabic-word'),
        practiceInput: document.getElementById('practice-input'),
        practiceFeedback: document.getElementById('practice-feedback'),
        practiceProgressFill: document.getElementById('practice-progress-fill'),
        practiceProgressText: document.getElementById('practice-progress-text'),
        practiceCorrectCountEl: document.getElementById('practice-correct-count'),
        practiceIncorrectCountEl: document.getElementById('practice-incorrect-count'),
        practiceCurrentStreakEl: document.getElementById('practice-current-streak'),
        practiceCheckBtn: document.getElementById('practice-check-btn'),
        practiceSpeakBtn: document.getElementById('practice-speak-btn'),
        practiceNextBtn: document.getElementById('practice-next-btn'),
        practicePrevBtn: document.getElementById('practice-prev-btn'),
        
        // Results
        resultSection: document.getElementById('result-section'),
        resultIcon: document.getElementById('result-icon'),
        resultTitle: document.getElementById('result-title'),
        resultScore: document.getElementById('result-score'),
        resultMessage: document.getElementById('result-message'),
        resultDetails: document.getElementById('result-details'),
        retryBtn: document.getElementById('retry-btn'),
        newSessionBtn: document.getElementById('new-session-btn'),
        reviewBtn: document.getElementById('review-btn'),
        
        // Vocabulary Mode
        vocabSection: document.getElementById('vocab-section'),
        vocabContent: document.getElementById('vocab-content'),
        vocabFlashcard: document.getElementById('vocab-flashcard'),
        vocabFrontWord: document.getElementById('vocab-front-word'),
        vocabBackWord: document.getElementById('vocab-back-word'),
        vocabProgressFill: document.getElementById('vocab-progress-fill'),
        vocabProgressText: document.getElementById('vocab-progress-text'),
        vocabCurrentEl: document.getElementById('vocab-current'),
        vocabKnownEl: document.getElementById('vocab-known'),
        vocabUnknownEl: document.getElementById('vocab-unknown'),
        vocabPrevBtn: document.getElementById('vocab-prev-btn'),
        vocabNextBtn: document.getElementById('vocab-next-btn'),
        vocabSpeakBtn: document.getElementById('vocab-speak-btn'),
        vocabControls: document.getElementById('vocab-controls'),
        vocabKnownBtn: document.getElementById('vocab-known-btn'),
        vocabUnknownBtn: document.getElementById('vocab-unknown-btn'),
        vocabRateControls: document.getElementById('vocab-rate-controls'),
        vocabComplete: document.getElementById('vocab-complete'),
        vocabCompleteMessage: document.getElementById('vocab-complete-message'),
        vocabFinalKnown: document.getElementById('vocab-final-known'),
        vocabFinalUnknown: document.getElementById('vocab-final-unknown'),
        vocabReviewUnknownBtn: document.getElementById('vocab-review-unknown-btn'),
        vocabNewSessionBtn: document.getElementById('vocab-new-session-btn'),
        vocabFlipHint: document.getElementById('vocab-flip-hint')
    };

    // Speech Synthesis
    const synth = window.speechSynthesis;
    let voicesLoaded = false;
    
    function loadVoices() {
        if (voicesLoaded) return;
        const voices = synth.getVoices();
        if (voices.length > 0) {
            voicesLoaded = true;
        }
    }
    
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    }
    loadVoices();

    function speak(text, lang = 'en-US') {
        if (synth.speaking) synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.74;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        const voices = synth.getVoices();
        const preferredVoice = voices.find(v =>
            v.lang === lang && /natural|neural|google|microsoft/i.test(v.name)
        ) || voices.find(v => v.lang === lang)
            || voices.find(v => v.lang.startsWith('en-US'))
            || voices.find(v => v.lang.startsWith('en'));
        
        if (preferredVoice) utterance.voice = preferredVoice;
        
        synth.speak(utterance);
    }

    // Utility Functions
    function shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function normalizeAnswer(answer) {
        return answer.trim().toLowerCase().replace(/[.,!?;:]+$/, '');
    }

    function showSection(section) {
        [elements.setupSection, elements.dictationSection, elements.practiceSection, elements.vocabSection, elements.resultSection].forEach(s => {
            if (s) s.hidden = true;
        });
        if (section) section.hidden = false;
    }

    function updateProgress() {
        const total = state.words.length;
        const current = state.currentIndex + 1;
        const percent = total > 0 ? (state.currentIndex / total) * 100 : 0;
        
        if (state.mode === 'dictation') {
            elements.progressFill.style.width = `${percent}%`;
            elements.progressText.textContent = `${Math.min(current, total)} / ${total}`;
        } else {
            elements.practiceProgressFill.style.width = `${percent}%`;
            elements.practiceProgressText.textContent = `${Math.min(current, total)} / ${total}`;
        }
    }

    function updateStats() {
        if (state.mode === 'dictation') {
            elements.correctCountEl.textContent = state.correctCount;
            elements.incorrectCountEl.textContent = state.incorrectCount;
            elements.currentStreakEl.textContent = state.currentStreak;
        } else {
            elements.practiceCorrectCountEl.textContent = state.correctCount;
            elements.practiceIncorrectCountEl.textContent = state.incorrectCount;
            elements.practiceCurrentStreakEl.textContent = state.currentStreak;
        }
    }

    function showFeedback(message, type, isPractice = false) {
        const el = isPractice ? elements.practiceFeedback : elements.dictationFeedback;
        el.textContent = message;
        el.className = `dictation-feedback ${type} practice-feedback`;
    }

    function clearFeedback(isPractice = false) {
        const el = isPractice ? elements.practiceFeedback : elements.dictationFeedback;
        el.textContent = '';
        el.className = 'dictation-feedback';
    }

    function setInputState(stateClass, isPractice = false) {
        const el = isPractice ? elements.practiceInput : elements.dictationInput;
        el.className = `dictation-input ${stateClass}`;
    }

    // Populate Unit Select
    function populateUnits() {
        const units = getAllUnitsSummary();
        elements.unitSelect.innerHTML = '<option value="">Choose a unit...</option>';
        
        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.number;
            option.textContent = `${unit.name} (${unit.totalWords} words)`;
            elements.unitSelect.appendChild(option);
        });
    }

    // Populate Lesson Select
    function populateLessons(unitNum) {
        elements.lessonSelect.innerHTML = '<option value="">Select lesson...</option>';
        elements.lessonSelect.disabled = true;
        elements.startBtn.disabled = true;
        
        if (!unitNum) return;
        
        const lessons = getUnitLessons(parseInt(unitNum));
        lessons.forEach(lesson => {
            const option = document.createElement('option');
            option.value = lesson.number;
            option.textContent = `Lesson ${lesson.number}: ${lesson.name} (${lesson.wordCount} words)`;
            elements.lessonSelect.appendChild(option);
        });
        
        elements.lessonSelect.disabled = false;
    }

    // Start Session (both modes)
    function startSession(event) {
        event.preventDefault();
        
        const unitNum = parseInt(elements.unitSelect.value);
        const lessonNum = parseInt(elements.lessonSelect.value);
        
        if (!unitNum || !lessonNum) return;
        
        // Get settings
        state.settings.shuffle = elements.shuffleWords.checked;
        state.settings.autoSpeak = elements.autoSpeak.checked;
        
        // Get words
        let words = getLessonVocabulary(unitNum, lessonNum);
        
        if (words.length === 0) {
            alert('No vocabulary found for this lesson');
            return;
        }
        
        if (state.settings.shuffle) {
            words = shuffleArray(words);
        }
        
        // Reset state
        state.words = words;
        state.currentIndex = 0;
        state.correctCount = 0;
        state.incorrectCount = 0;
        state.currentStreak = 0;
        state.maxStreak = 0;
        state.mistakes = [];
        state.answered.clear();
        state.vocabKnown.clear();
        state.vocabUnknown.clear();
        state.vocabFlipped = false;
        state.startTime = Date.now();
        state.isActive = true;
        
        // Start selected mode
        if (state.mode === 'vocab') {
            startVocabMode();
            elements.startBtn.querySelector('.btn-text').textContent = 'Start Flashcards';
        } else if (state.mode === 'practice') {
            startPracticeMode();
            elements.startBtn.querySelector('.btn-text').textContent = 'Start Practice';
        }
    }

    // ========== DICTATION MODE ==========
    function startDictationMode() {
        showSection(elements.dictationSection);
        elements.dictationInput.disabled = false;
        elements.submitBtn.disabled = false;
        elements.speakBtn.disabled = false;
        elements.skipBtn.disabled = false;
        
        setTimeout(() => elements.dictationInput.focus(), 100);
        showNextDictationWord();
        updateProgress();
        updateStats();
    }

    function showNextDictationWord() {
        if (state.currentIndex >= state.words.length) {
            endSession();
            return;
        }
        
        const wordObj = state.words[state.currentIndex];
        
        elements.wordDisplay.textContent = wordObj.word;
        elements.wordDisplay.classList.remove('speaking');
        elements.meaningDisplay.hidden = true;
        clearFeedback();
        setInputState('');
        elements.dictationInput.value = '';
        elements.dictationInput.disabled = false;
        elements.submitBtn.disabled = false;
        
        if (state.settings.autoSpeak) {
            setTimeout(() => speak(wordObj.word), 500);
        }
        
        elements.dictationInput.focus();
    }

    function checkDictationAnswer() {
        if (!state.isActive) return;
        
        const userAnswer = normalizeAnswer(elements.dictationInput.value);
        const correctWord = state.words[state.currentIndex].word.toLowerCase();
        const meaning = state.words[state.currentIndex].meaning;
        
        const isCorrect = userAnswer === correctWord;
        
        if (isCorrect) {
            state.correctCount++;
            state.currentStreak++;
            state.maxStreak = Math.max(state.maxStreak, state.currentStreak);
            
            setInputState('correct');
            showFeedback('✓ Correct!', 'correct');
            speak('Correct');
        } else {
            state.incorrectCount++;
            state.currentStreak = 0;
            
            state.mistakes.push({
                word: state.words[state.currentIndex].word,
                meaning: meaning,
                userAnswer: elements.dictationInput.value.trim()
            });
            
            setInputState('incorrect');
            showFeedback(`✗ The word was: ${state.words[state.currentIndex].word}`, 'incorrect');
            speak('Try again');
        }
        
        updateStats();
        
        // Show meaning
        elements.meaningDisplay.hidden = false;
        elements.meaningDisplay.innerHTML = `<strong>Meaning:</strong> ${meaning}`;
        elements.meaningDisplay.style.cssText = 'margin-top: 16px; padding: 12px 16px; background: var(--primary-bg); border-radius: var(--radius); color: var(--primary); font-size: 0.9375rem;';
        
        elements.dictationInput.disabled = true;
        elements.submitBtn.disabled = true;
        
        setTimeout(() => {
            state.currentIndex++;
            showNextDictationWord();
            updateProgress();
        }, 2000);
    }

    function skipDictationWord() {
        if (!state.isActive) return;
        
        const wordObj = state.words[state.currentIndex];
        state.incorrectCount++;
        state.currentStreak = 0;
        
        state.mistakes.push({
            word: wordObj.word,
            meaning: wordObj.meaning,
            userAnswer: '(skipped)'
        });
        
        showFeedback(`Skipped. The word was: ${wordObj.word}`, 'incorrect');
        
        elements.meaningDisplay.hidden = false;
        elements.meaningDisplay.innerHTML = `<strong>Meaning:</strong> ${wordObj.meaning}`;
        elements.meaningDisplay.style.cssText = 'margin-top: 16px; padding: 12px 16px; background: var(--primary-bg); border-radius: var(--radius); color: var(--primary); font-size: 0.9375rem;';
        
        elements.dictationInput.disabled = true;
        elements.submitBtn.disabled = true;
        
        setTimeout(() => {
            state.currentIndex++;
            showNextDictationWord();
            updateProgress();
        }, 1200);
    }

    // ========== PRACTICE MODE ==========
    function startPracticeMode() {
        showSection(elements.practiceSection);
        elements.practiceInput.disabled = false;
        elements.practiceCheckBtn.disabled = false;
        elements.practiceSpeakBtn.disabled = false;
        elements.practiceNextBtn.disabled = state.currentIndex >= state.words.length - 1;
        elements.practicePrevBtn.disabled = state.currentIndex === 0;
        
        setTimeout(() => elements.practiceInput.focus(), 100);
        showPracticeWord();
        updateProgress();
        updateStats();
        updatePracticeNavButtons();
    }

    function showPracticeWord() {
        if (state.currentIndex >= state.words.length) {
            endSession();
            return;
        }
        
        const wordObj = state.words[state.currentIndex];
        const isAnswered = state.answered.has(state.currentIndex);
        
        // Show Arabic meaning
        elements.practiceArabicWord.textContent = wordObj.meaning;
        
        // Restore previous answer if exists
        const storedAnswer = elements.practiceInput.dataset[`answer_${state.currentIndex}`] || '';
        elements.practiceInput.value = storedAnswer;
        
        // Update input state based on whether answered
        if (isAnswered) {
            const correctWord = state.words[state.currentIndex].word.toLowerCase();
            const userAnswer = normalizeAnswer(storedAnswer);
            const wasCorrect = userAnswer === correctWord;
            
            setInputState(wasCorrect ? 'correct' : 'incorrect', true);
            showFeedback(wasCorrect ? '✓ Correct!' : `✗ Correct answer: ${state.words[state.currentIndex].word}`, wasCorrect ? 'correct' : 'incorrect', true);
            elements.practiceCheckBtn.disabled = true;
            elements.practiceInput.disabled = true;
        } else {
            setInputState('', true);
            clearFeedback(true);
            elements.practiceCheckBtn.disabled = false;
            elements.practiceInput.disabled = false;
        }
        
        elements.practiceInput.focus();
        updatePracticeNavButtons();
    }

    function checkPracticeAnswer() {
        if (!state.isActive) return;
        
        const userAnswer = normalizeAnswer(elements.practiceInput.value);
        const correctWord = state.words[state.currentIndex].word.toLowerCase();
        const isCorrect = userAnswer === correctWord;
        
        // Store answer
        elements.practiceInput.dataset[`answer_${state.currentIndex}`] = elements.practiceInput.value.trim();
        state.answered.add(state.currentIndex);
        
        if (isCorrect) {
            state.correctCount++;
            state.currentStreak++;
            state.maxStreak = Math.max(state.maxStreak, state.currentStreak);
            
            setInputState('correct', true);
            showFeedback('✓ Correct!', 'correct', true);
            speak('Correct');
        } else {
            state.incorrectCount++;
            state.currentStreak = 0;
            
            state.mistakes.push({
                word: state.words[state.currentIndex].word,
                meaning: state.words[state.currentIndex].meaning,
                userAnswer: elements.practiceInput.value.trim()
            });
            
            setInputState('incorrect', true);
            showFeedback(`✗ Correct answer: ${state.words[state.currentIndex].word}`, 'incorrect', true);
            speak('Try again');
        }
        
        updateStats();
        elements.practiceCheckBtn.disabled = true;
        elements.practiceInput.disabled = true;
        elements.practiceNextBtn.disabled = state.currentIndex >= state.words.length - 1;
        
        // Auto-advance if last word
        if (state.currentIndex >= state.words.length - 1) {
            setTimeout(endSession, 2000);
        }
    }

    function nextPracticeWord() {
        if (state.currentIndex < state.words.length - 1) {
            state.currentIndex++;
            showPracticeWord();
            updateProgress();
            updatePracticeNavButtons();
        }
    }

    function prevPracticeWord() {
        if (state.currentIndex > 0) {
            state.currentIndex--;
            showPracticeWord();
            updateProgress();
            updatePracticeNavButtons();
        }
    }

    function updatePracticeNavButtons() {
        const isLastWord = state.currentIndex >= state.words.length - 1;
        const isAnswered = state.answered.has(state.currentIndex);
        const hasInput = elements.practiceInput.value.trim().length > 0;
        
        // Next button: enabled only if answered OR (has input and not last word)
        // But for last word, next should be disabled anyway
        elements.practiceNextBtn.disabled = isLastWord || (!isAnswered && !hasInput);
        elements.practicePrevBtn.disabled = state.currentIndex === 0;
        
        // Update button text to show why disabled
        if (isLastWord) {
            elements.practiceNextBtn.innerHTML = '<span>Finish</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        } else if (!isAnswered && !hasInput) {
            elements.practiceNextBtn.innerHTML = '<span>Type answer first</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        } else if (!isAnswered && hasInput) {
            elements.practiceNextBtn.innerHTML = '<span>Check answer first</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        } else {
            elements.practiceNextBtn.innerHTML = '<span>Next</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        }
    }

    // ========== VOCABULARY MODE (Flashcards) ==========
    function startVocabMode() {
        // Reset vocab state
        state.vocabKnown.clear();
        state.vocabUnknown.clear();
        state.vocabFlipped = false;
        
        showSection(elements.vocabSection);
        elements.vocabPrevBtn.disabled = state.currentIndex === 0;
        elements.vocabNextBtn.disabled = state.currentIndex >= state.words.length - 1;
        elements.vocabSpeakBtn.disabled = false;
        elements.vocabKnownBtn.disabled = false;
        elements.vocabUnknownBtn.disabled = false;
        elements.vocabRateControls.style.display = 'none';
        elements.vocabComplete.style.display = 'none';
        elements.vocabFlipHint.style.display = 'block';
        
        // Reset flashcard
        elements.vocabFlashcard.style.transform = 'rotateY(0deg)';
        elements.vocabFlashcard.classList.remove('flipped');
        
        setTimeout(() => {
            elements.vocabFlashcard.focus();
            showVocabCard();
        }, 100);
        
        updateVocabProgress();
        updateVocabStats();
        updateVocabNavButtons();
    }

    function showVocabCard() {
        if (state.currentIndex >= state.words.length) {
            endVocabSession();
            return;
        }
        
        const wordObj = state.words[state.currentIndex];
        const isKnown = state.vocabKnown.has(state.currentIndex);
        const isUnknown = state.vocabUnknown.has(state.currentIndex);
        
        // Reset flip state
        state.vocabFlipped = false;
        elements.vocabFlashcard.style.transform = 'rotateY(0deg)';
        elements.vocabFlashcard.classList.remove('flipped');
        elements.vocabRateControls.style.display = 'none';
        elements.vocabFlipHint.style.display = 'block';
        
        // Set content
        elements.vocabFrontWord.textContent = wordObj.word;
        elements.vocabBackWord.textContent = wordObj.meaning;
        
        // Update card border based on known/unknown
        if (isKnown) {
            elements.vocabFlashcard.style.borderColor = 'var(--success)';
            elements.vocabFlashcard.style.boxShadow = '0 0 0 2px var(--success)';
        } else if (isUnknown) {
            elements.vocabFlashcard.style.borderColor = 'var(--error)';
            elements.vocabFlashcard.style.boxShadow = '0 0 0 2px var(--error)';
        } else {
            elements.vocabFlashcard.style.borderColor = 'var(--primary)';
            elements.vocabFlashcard.style.boxShadow = 'var(--shadow-lg)';
        }
        
        updateVocabProgress();
        updateVocabStats();
        updateVocabNavButtons();
    }

    function flipVocabCard() {
        if (state.vocabFlipped) return;
        state.vocabFlipped = true;
        elements.vocabFlashcard.style.transform = 'rotateY(180deg)';
        elements.vocabFlashcard.classList.add('flipped');
        elements.vocabRateControls.style.display = 'flex';
        elements.vocabFlipHint.style.display = 'none';
    }

    function markVocabKnown() {
        if (!state.isActive || !state.vocabFlipped) return;
        
        state.vocabKnown.add(state.currentIndex);
        state.vocabUnknown.delete(state.currentIndex);
        
        // Visual feedback
        elements.vocabFlashcard.style.borderColor = 'var(--success)';
        elements.vocabFlashcard.style.boxShadow = '0 0 0 2px var(--success)';
        
        // Auto-advance after short delay
        setTimeout(() => {
            nextVocabCard();
        }, 800);
    }

    function markVocabUnknown() {
        if (!state.isActive || !state.vocabFlipped) return;
        
        state.vocabUnknown.add(state.currentIndex);
        state.vocabKnown.delete(state.currentIndex);
        
        // Visual feedback
        elements.vocabFlashcard.style.borderColor = 'var(--error)';
        elements.vocabFlashcard.style.boxShadow = '0 0 0 2px var(--error)';
        
        // Auto-advance after short delay
        setTimeout(() => {
            nextVocabCard();
        }, 800);
    }

    function nextVocabCard() {
        if (state.currentIndex < state.words.length - 1) {
            state.currentIndex++;
            state.vocabFlipped = false;
            showVocabCard();
        } else {
            endVocabSession();
        }
    }

    function prevVocabCard() {
        if (state.currentIndex > 0) {
            state.currentIndex--;
            state.vocabFlipped = false;
            showVocabCard();
        }
    }

    function updateVocabProgress() {
        const total = state.words.length;
        const current = state.currentIndex + 1;
        const percent = total > 0 ? (state.currentIndex / total) * 100 : 0;
        
        elements.vocabProgressFill.style.width = `${percent}%`;
        elements.vocabProgressText.textContent = `${Math.min(current, total)} / ${total}`;
        
        const progressBar = elements.vocabSection.querySelector('[role="progressbar"]');
        if (progressBar) {
            progressBar.setAttribute('aria-valuenow', state.currentIndex);
            progressBar.setAttribute('aria-valuemax', total);
        }
    }

    function updateVocabStats() {
        elements.vocabCurrentEl.textContent = state.currentIndex + 1;
        elements.vocabKnownEl.textContent = state.vocabKnown.size;
        elements.vocabUnknownEl.textContent = state.vocabUnknown.size;
    }

    function updateVocabNavButtons() {
        elements.vocabPrevBtn.disabled = state.currentIndex === 0;
        elements.vocabNextBtn.disabled = state.currentIndex >= state.words.length - 1;
    }

    function endVocabSession() {
        state.isActive = false;
        elements.vocabComplete.style.display = 'block';
        elements.vocabRateControls.style.display = 'none';
        elements.vocabFlipHint.style.display = 'none';
        elements.vocabFlashcard.style.display = 'none';
        elements.vocabControls.style.display = 'none';
        
        const knownCount = state.vocabKnown.size;
        const unknownCount = state.vocabUnknown.size;
        const total = state.words.length;
        const percent = total > 0 ? Math.round((knownCount / total) * 100) : 0;
        
        let message = '';
        if (percent === 100) {
            message = 'Perfect! You know all the words! 🎉';
        } else if (percent >= 80) {
            message = 'Great job! Review the unknown words to master them.';
        } else if (percent >= 60) {
            message = 'Good progress! Keep practicing the unknown words.';
        } else {
            message = 'Keep practicing! Use "Review Unknown" to focus on words you missed.';
        }
        
        elements.vocabCompleteMessage.textContent = message;
        elements.vocabFinalKnown.textContent = knownCount;
        elements.vocabFinalUnknown.textContent = unknownCount;
    }

    function reviewUnknownWords() {
        if (state.vocabUnknown.size === 0) {
            alert('No unknown words to review!');
            return;
        }
        
        // Filter words to only unknown ones
        const unknownIndices = Array.from(state.vocabUnknown);
        state.words = unknownIndices.map(i => state.words[i]);
        state.currentIndex = 0;
        state.vocabKnown.clear();
        state.vocabUnknown.clear();
        state.vocabFlipped = false;
        state.startTime = Date.now();
        state.isActive = true;
        
        elements.vocabComplete.style.display = 'none';
        elements.vocabFlashcard.style.display = 'block';
        elements.vocabControls.style.display = 'flex';
        elements.vocabRateControls.style.display = 'none';
        elements.vocabFlipHint.style.display = 'block';
        
        showVocabCard();
    }

    function newVocabSession() {
        showSection(elements.setupSection);
        elements.unitSelect.value = '';
        populateLessons('');
        // Reset all state
        state.words = [];
        state.currentIndex = 0;
        state.vocabKnown.clear();
        state.vocabUnknown.clear();
        state.vocabFlipped = false;
    }

    // ========== COMMON ==========
    function endSession() {
        state.isActive = false;
        const totalTime = ((Date.now() - state.startTime) / 1000).toFixed(1);
        const total = state.words.length;
        const accuracy = total > 0 ? ((state.correctCount / total) * 100).toFixed(1) : 0;
        
        let tier = 'needs-work';
        let title = 'Keep Practicing!';
        let message = 'Don\'t give up! Every mistake is a learning opportunity.';
        
        if (accuracy === 100) {
            tier = 'perfect';
            title = 'Perfect Score! 🎉';
            message = 'Excellent work! You nailed every word!';
        } else if (accuracy >= 80) {
            tier = 'good';
            title = 'Great Job! 🌟';
            message = 'Strong performance! Review the missed words to reach perfection.';
        } else if (accuracy >= 60) {
            tier = 'good';
            title = 'Good Effort! 👍';
            message = 'You\'re making progress. Keep practicing to improve.';
        }
        
        elements.resultIcon.className = `result-icon ${tier}`;
        elements.resultIcon.innerHTML = getResultIcon(tier);
        elements.resultTitle.textContent = title;
        elements.resultScore.textContent = `${state.correctCount} / ${total}`;
        elements.resultMessage.textContent = message;
        
        let detailsHtml = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; font-size: 0.9375rem;">
                <div><strong>Accuracy:</strong> ${accuracy}%</div>
                <div><strong>Time:</strong> ${totalTime}s</div>
                <div><strong>Best Streak:</strong> ${state.maxStreak}</div>
                <div><strong>Mode:</strong> ${state.mode === 'dictation' ? '🎯 Dictation' : '✍️ Practice'}</div>
            </div>
        `;
        
        if (state.mistakes.length > 0) {
            detailsHtml += '<h4 style="margin-bottom: 12px; font-size: 0.9375rem;">Words to Review:</h4>';
            detailsHtml += '<ul style="font-size: 0.875rem; line-height: 1.8; max-height: 200px; overflow-y: auto;">';
            state.mistakes.forEach(m => {
                detailsHtml += `<li><strong>${m.word}</strong> — ${m.meaning}${m.userAnswer !== '(skipped)' ? ` <span style="color: var(--text-muted);">(you typed: "${m.userAnswer}")</span>` : ''}</li>`;
            });
            detailsHtml += '</ul>';
        }
        
        elements.resultDetails.innerHTML = detailsHtml;
        showSection(elements.resultSection);
    }

    function getResultIcon(tier) {
        switch (tier) {
            case 'perfect':
                return `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="16 8 12 12 8 16"></polyline></svg>`;
            case 'good':
                return `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
            default:
                return `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        }
    }

    function retrySession() {
        if (state.mode === 'dictation') {
            startDictationMode();
        } else {
            startPracticeMode();
        }
    }

    function newSession() {
        showSection(elements.setupSection);
        elements.unitSelect.value = '';
        populateLessons('');
        elements.dictationInput.value = '';
        elements.practiceInput.value = '';
        // Clear stored answers
        Object.keys(elements.practiceInput.dataset).forEach(key => delete elements.practiceInput.dataset[key]);
    }

    function reviewMistakes() {
        if (state.mistakes.length === 0) {
            alert('No mistakes to review!');
            return;
        }
        
        state.words = state.mistakes.map(m => ({ word: m.word, meaning: m.meaning }));
        state.currentIndex = 0;
        state.correctCount = 0;
        state.incorrectCount = 0;
        state.currentStreak = 0;
        state.maxStreak = 0;
        state.mistakes = [];
        state.answered.clear();
        state.startTime = Date.now();
        state.isActive = true;
        
        if (state.mode === 'dictation') {
            startDictationMode();
        } else {
            startPracticeMode();
        }
    }

    // Event Listeners
    elements.unitSelect.addEventListener('change', function() {
        populateLessons(this.value);
    });

    elements.lessonSelect.addEventListener('change', function() {
        elements.startBtn.disabled = !this.value;
    });

    elements.setupForm.addEventListener('submit', startSession);

    // Mode button events
    function setActiveMode(mode) {
        state.mode = mode;
        
        if (mode === 'vocab') {
            elements.btnVocab.className = 'mode-btn btn btn-primary btn-lg';
            elements.btnPractice.className = 'mode-btn btn btn-secondary btn-lg';
            elements.startBtn.querySelector('.btn-text').textContent = 'Start Flashcards';
        } else if (mode === 'practice') {
            elements.btnPractice.className = 'mode-btn btn btn-primary btn-lg';
            elements.btnVocab.className = 'mode-btn btn btn-secondary btn-lg';
            elements.startBtn.querySelector('.btn-text').textContent = 'Start Practice';
        }
    }

    if (elements.btnVocab) {
        elements.btnVocab.addEventListener('click', () => setActiveMode('vocab'));
    }
    if (elements.btnPractice) {
        elements.btnPractice.addEventListener('click', () => setActiveMode('practice'));
    }

    // Dictation events
    elements.dictationInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !elements.submitBtn.disabled && state.isActive) {
            e.preventDefault();
            checkDictationAnswer();
        }
    });

    elements.submitBtn.addEventListener('click', checkDictationAnswer);
    elements.speakBtn.addEventListener('click', () => {
        if (state.currentIndex < state.words.length) {
            speak(state.words[state.currentIndex].word);
            elements.wordDisplay.classList.add('speaking');
            setTimeout(() => elements.wordDisplay.classList.remove('speaking'), 1000);
        }
    });
    elements.skipBtn.addEventListener('click', skipDictationWord);

    // Practice events
    elements.practiceInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !elements.practiceCheckBtn.disabled && state.isActive) {
            e.preventDefault();
            checkPracticeAnswer();
        }
    });

    elements.practiceInput.addEventListener('input', function() {
        if (state.isActive && state.mode === 'practice') {
            updatePracticeNavButtons();
        }
    });

    elements.practiceCheckBtn.addEventListener('click', checkPracticeAnswer);
    elements.practiceSpeakBtn.addEventListener('click', () => {
        if (state.currentIndex < state.words.length) {
            speak(state.words[state.currentIndex].word);
        }
    });
    elements.practiceNextBtn.addEventListener('click', nextPracticeWord);
    elements.practicePrevBtn.addEventListener('click', prevPracticeWord);

    // Vocabulary mode events
    elements.vocabFlashcard.addEventListener('click', flipVocabCard);
    elements.vocabFlashcard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            flipVocabCard();
        }
    });
    elements.vocabSpeakBtn.addEventListener('click', () => {
        if (state.currentIndex < state.words.length) {
            speak(state.words[state.currentIndex].word);
        }
    });
    elements.vocabKnownBtn.addEventListener('click', markVocabKnown);
    elements.vocabUnknownBtn.addEventListener('click', markVocabUnknown);
    elements.vocabNextBtn.addEventListener('click', nextVocabCard);
    elements.vocabPrevBtn.addEventListener('click', prevVocabCard);
    elements.vocabReviewUnknownBtn.addEventListener('click', reviewUnknownWords);
    elements.vocabNewSessionBtn.addEventListener('click', newVocabSession);

    // Results events
    elements.retryBtn.addEventListener('click', retrySession);
    elements.newSessionBtn.addEventListener('click', newSession);
    elements.reviewBtn.addEventListener('click', reviewMistakes);

    // Check for URL params
    const urlParams = new URLSearchParams(window.location.search);
    const unitParam = urlParams.get('unit');
    const lessonParam = urlParams.get('lesson');
    
    if (unitParam) {
        elements.unitSelect.value = unitParam;
        populateLessons(unitParam);
        if (lessonParam) {
            elements.lessonSelect.value = lessonParam;
            elements.startBtn.disabled = false;
        }
    }

    // Initialize
    populateUnits();

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && synth.speaking) {
            synth.cancel();
        }
    });
})();