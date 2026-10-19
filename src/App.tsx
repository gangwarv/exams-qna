import { useState } from 'react'
import './App.css'

type AnswerOption = {
  id: string
  text: string
}

type Question = {
  ques: string
  ans: string[]
  options: AnswerOption[]
  explanation: string
}

type QuestionBank = {
  title: string
  questions: Question[]
}

type Attempt = {
  id: string
  bankKey: string
  currentIndex: number
  score: number
  selectedOptions: string[]
  submitted: boolean
  completed: boolean
}

type SavedProgress = {
  attempts: Attempt[]
  activeAttemptId: string | null
}

const STORAGE_KEY = 'az305-exam-progress'
const questionBanks = import.meta.glob<QuestionBank>('./questions/*.json', {
  eager: true,
  import: 'default',
})

function isAttempt(value: unknown): value is Attempt {
  if (typeof value !== 'object' || value === null) return false

  const attempt = value as Record<string, unknown>
  return (
    typeof attempt.id === 'string' &&
    typeof attempt.bankKey === 'string' &&
    typeof attempt.currentIndex === 'number' &&
    typeof attempt.score === 'number' &&
    Array.isArray(attempt.selectedOptions) &&
    attempt.selectedOptions.every((option) => typeof option === 'string') &&
    typeof attempt.submitted === 'boolean' &&
    typeof attempt.completed === 'boolean'
  )
}

function readProgress(): { progress: SavedProgress; error: string } {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (!saved) return { progress: { attempts: [], activeAttemptId: null }, error: '' }

    const parsed: unknown = JSON.parse(saved)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('attempts' in parsed) ||
      !Array.isArray(parsed.attempts) ||
      !parsed.attempts.every(isAttempt) ||
      !('activeAttemptId' in parsed) ||
      (parsed.activeAttemptId !== null && typeof parsed.activeAttemptId !== 'string')
    ) {
      throw new Error('Saved exam progress has an invalid format.')
    }

    return {
      progress: {
        attempts: parsed.attempts,
        activeAttemptId: parsed.activeAttemptId,
      },
      error: '',
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to read saved exam progress.'
    return { progress: { attempts: [], activeAttemptId: null }, error: message }
  }
}

function App() {
  const [initialState] = useState(readProgress)
  const [progress, setProgress] = useState(initialState.progress)
  const [storageError, setStorageError] = useState(initialState.error)
  const [selectedBankKey, setSelectedBankKey] = useState(
    Object.keys(questionBanks)[0] ?? '',
  )
  const [showRestartConfirmation, setShowRestartConfirmation] = useState(false)

  const activeAttempt = progress.attempts.find(
    (attempt) => attempt.id === progress.activeAttemptId,
  )
  const activeBank = activeAttempt ? questionBanks[activeAttempt.bankKey] : undefined
  const currentQuestion = activeBank?.questions[activeAttempt?.currentIndex ?? -1]
  const bankEntries = Object.entries(questionBanks).sort(([a], [b]) =>
    a.localeCompare(b),
  )

  function saveProgress(nextProgress: SavedProgress) {
    setProgress(nextProgress)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextProgress))
      setStorageError('')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save exam progress.'
      setStorageError(`Progress could not be saved in this browser session: ${message}`)
    }
  }

  function startExam(bankKey: string) {
    const bank = questionBanks[bankKey]
    if (!bank || bank.questions.length === 0) return

    const attempt: Attempt = {
      id: crypto.randomUUID(),
      bankKey,
      currentIndex: 0,
      score: 0,
      selectedOptions: [],
      submitted: false,
      completed: false,
    }
    saveProgress({
      attempts: [...progress.attempts, attempt],
      activeAttemptId: attempt.id,
    })
  }

  function resumeAttempt(attemptId: string) {
    saveProgress({ ...progress, activeAttemptId: attemptId })
  }

  function exitToHome() {
    saveProgress({ ...progress, activeAttemptId: null })
  }

  function toggleOption(optionId: string) {
    if (!activeAttempt || !activeBank || activeAttempt.submitted || !currentQuestion) return

    const selected = activeAttempt.selectedOptions.includes(optionId)
      ? activeAttempt.selectedOptions.filter((id) => id !== optionId)
      : [...activeAttempt.selectedOptions, optionId]
    const maxSelections = activeBank.questions[activeAttempt.currentIndex].ans.length
    if (selected.length > maxSelections) return

    saveProgress({
      ...progress,
      attempts: progress.attempts.map((attempt) =>
        attempt.id === activeAttempt.id
          ? { ...attempt, selectedOptions: selected }
          : attempt,
      ),
    })
  }

  function submitAnswer() {
    if (!activeAttempt || !currentQuestion || activeAttempt.submitted) return

    const earnedPoints = activeAttempt.selectedOptions.filter((option) =>
      currentQuestion.ans.includes(option),
    ).length
    saveProgress({
      ...progress,
      attempts: progress.attempts.map((attempt) =>
        attempt.id === activeAttempt.id
          ? { ...attempt, score: attempt.score + earnedPoints, submitted: true }
          : attempt,
      ),
    })
  }

  function goToNextQuestion() {
    if (!activeAttempt || !activeBank || !activeAttempt.submitted) return

    const isLastQuestion =
      activeAttempt.currentIndex === activeBank.questions.length - 1
    saveProgress({
      ...progress,
      attempts: progress.attempts.map((attempt) =>
        attempt.id === activeAttempt.id
          ? {
              ...attempt,
              currentIndex: isLastQuestion
                ? attempt.currentIndex
                : attempt.currentIndex + 1,
              selectedOptions: [],
              submitted: false,
              completed: isLastQuestion,
            }
          : attempt,
      ),
    })
  }

  function confirmRestart() {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
      setStorageError('')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to clear saved exam progress.'
      setStorageError(`Saved progress could not be cleared: ${message}`)
      return
    }

    setProgress({ attempts: [], activeAttemptId: null })
    setSelectedBankKey(Object.keys(questionBanks)[0] ?? '')
    setShowRestartConfirmation(false)
  }

  const totalPoints =
    activeBank?.questions.reduce((total, question) => total + question.ans.length, 0) ?? 0
  const percentage = totalPoints
    ? Math.round(((activeAttempt?.score ?? 0) / totalPoints) * 100)
    : 0

  if (activeAttempt && activeBank && activeAttempt.completed) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">A</span>
            <span>Cloud Architect Prep</span>
          </div>
          <span className="topbar-label">AZ-305 practice</span>
        </header>
        <section className="result-card" aria-labelledby="result-title">
          <span className="eyebrow">EXAM COMPLETE</span>
          <div className="result-score">{percentage}%</div>
          <h1 id="result-title">A solid step forward.</h1>
          <p className="result-summary">
            You earned <strong>{activeAttempt.score}</strong> of{' '}
            <strong>{totalPoints}</strong> available points in {activeBank.title}.
          </p>
          <p className="result-note">
            Each correct selection earns one point. Incorrect selections do not subtract points.
          </p>
          <button
            className="button button-primary"
            type="button"
            onClick={() => setShowRestartConfirmation(true)}
          >
            Restart exam
          </button>
        </section>
        {showRestartConfirmation && (
          <div className="modal-backdrop" role="presentation">
            <section
              aria-labelledby="restart-title"
              aria-modal="true"
              className="confirmation-dialog"
              role="dialog"
            >
              <h2 id="restart-title">Restart your practice?</h2>
              <p>
                This will clear saved exam progress from this session and return you to the
                question-bank selection screen.
              </p>
              <div className="dialog-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setShowRestartConfirmation(false)}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={confirmRestart}
                >
                  Yes, restart
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    )
  }

  if (activeAttempt && activeBank && currentQuestion) {
    const isLastQuestion = activeAttempt.currentIndex === activeBank.questions.length - 1

    return (
      <main className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">A</span>
            <span>Cloud Architect Prep</span>
          </div>
          <button className="text-button" type="button" onClick={exitToHome}>
            Save &amp; exit
          </button>
        </header>
        <div className="exam-layout">
          <div className="exam-heading">
            <span className="eyebrow">{activeBank.title}</span>
            <span className="question-count">
              Question {activeAttempt.currentIndex + 1} of {activeBank.questions.length}
            </span>
          </div>
          <div
            aria-label={`Question ${activeAttempt.currentIndex + 1} of ${activeBank.questions.length}`}
            className="progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={activeBank.questions.length}
            aria-valuenow={activeAttempt.currentIndex + (activeAttempt.submitted ? 1 : 0)}
          >
            <span
              className="progress-fill"
              style={{
                width: `${((activeAttempt.currentIndex + (activeAttempt.submitted ? 1 : 0)) / activeBank.questions.length) * 100}%`,
              }}
            />
          </div>
          <section className="question-card">
            <div className="question-meta">
              <span>KNOWLEDGE CHECK</span>
              <span>
                Select {currentQuestion.ans.length}{' '}
                {currentQuestion.ans.length === 1 ? 'answer' : 'answers'}
              </span>
            </div>
            <h1
              className="question-title"
              dangerouslySetInnerHTML={{ __html: currentQuestion.ques }}
            />
            <div className="option-list">
              {currentQuestion.options.map((option, index) => {
                const isSelected = activeAttempt.selectedOptions.includes(option.id)
                const isCorrect = currentQuestion.ans.includes(option.id)
                const optionState = activeAttempt.submitted
                  ? isCorrect
                    ? ' option-correct'
                    : isSelected
                      ? ' option-incorrect'
                      : ''
                  : ''

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`option-card${isSelected && !activeAttempt.submitted ? ' option-selected' : ''}${optionState}`}
                    disabled={activeAttempt.submitted}
                    key={option.id}
                    onClick={() => toggleOption(option.id)}
                    type="button"
                  >
                    <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                    <span
                      className="option-text"
                      dangerouslySetInnerHTML={{ __html: option.text }}
                    />
                    {activeAttempt.submitted && isCorrect && (
                      <span className="option-status">Correct</span>
                    )}
                    {activeAttempt.submitted && isSelected && !isCorrect && (
                      <span className="option-status">Incorrect</span>
                    )}
                  </button>
                )
              })}
            </div>
            {activeAttempt.submitted && (
              <div className="explanation" role="status">
                <h2>
                  {activeAttempt.selectedOptions.filter((option) =>
                    currentQuestion.ans.includes(option),
                  ).length === currentQuestion.ans.length
                    ? 'Correct'
                    : 'Answer explained'}
                </h2>
                <p dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }} />
                <p className="points-earned">
                  +{activeAttempt.selectedOptions.filter((option) =>
                    currentQuestion.ans.includes(option),
                  ).length}{' '}
                  {activeAttempt.selectedOptions.filter((option) =>
                    currentQuestion.ans.includes(option),
                  ).length === 1
                    ? 'point'
                    : 'points'}{' '}
                  earned
                </p>
              </div>
            )}
            <div className="question-actions">
              <span className="selection-hint">
                {activeAttempt.submitted
                  ? `${activeAttempt.score} points so far`
                  : `Choose up to ${currentQuestion.ans.length}`}
              </span>
              {activeAttempt.submitted ? (
                <button
                  className="button button-primary"
                  onClick={goToNextQuestion}
                  type="button"
                >
                  {isLastQuestion ? 'View results' : 'Next question'}
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  className="button button-primary"
                  disabled={activeAttempt.selectedOptions.length === 0}
                  onClick={submitAnswer}
                  type="button"
                >
                  Submit answer
                </button>
              )}
            </div>
          </section>
        </div>
        {storageError && <p className="storage-alert">{storageError}</p>}
      </main>
    )
  }

  const incompleteAttempts = progress.attempts.filter((attempt) => !attempt.completed)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">A</span>
          <span>Cloud Architect Prep</span>
        </div>
        <span className="topbar-label">AZ-305 practice</span>
      </header>
      <section className="welcome-layout">
        <div className="welcome-copy">
          <span className="eyebrow">DESIGNING MICROSOFT AZURE INFRASTRUCTURE</span>
          <h1>Build confidence, one question at a time.</h1>
          <p>
            Practice real-world architecture decisions with focused question sets and
            explanations that help the concepts stick.
          </p>
        </div>
        <div className="start-card">
          <span className="step-number">01 / GET STARTED</span>
          <h2>Choose your practice set</h2>
          <label className="field-label" htmlFor="question-bank">
            Question bank
          </label>
          <select
            id="question-bank"
            onChange={(event) => setSelectedBankKey(event.target.value)}
            value={selectedBankKey}
          >
            {bankEntries.map(([key]) => (
              <option key={key} value={key}>
                {questionBanks[key].title}
              </option>
            ))}
          </select>
          <button
            className="button button-primary start-button"
            disabled={!selectedBankKey}
            onClick={() => startExam(selectedBankKey)}
            type="button"
          >
            Start practice
            <span aria-hidden="true">→</span>
          </button>
          <div className="practice-details">
            <span>{questionBanks[selectedBankKey]?.questions.length ?? 0} questions</span>
            <span>Self-paced</span>
            <span>Progress saved</span>
          </div>
        </div>
      </section>
      {storageError && <p className="storage-alert">{storageError}</p>}
      {incompleteAttempts.length > 0 && (
        <section className="resume-section">
          <div className="resume-heading">
            <div>
              <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
              <h2>Incomplete practice</h2>
            </div>
            <span className="attempt-count">
              {incompleteAttempts.length} saved
            </span>
          </div>
          <div className="attempt-list">
            {incompleteAttempts.map((attempt) => {
              const bank = questionBanks[attempt.bankKey]
              if (!bank) return null
              return (
                <article className="attempt-card" key={attempt.id}>
                  <div>
                    <h3>{bank.title}</h3>
                    <p>
                      Question {attempt.currentIndex + 1} of {bank.questions.length}
                    </p>
                  </div>
                  <button
                    className="button button-secondary"
                    onClick={() => resumeAttempt(attempt.id)}
                    type="button"
                  >
                    Resume
                    <span aria-hidden="true">→</span>
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      )}
      <footer className="page-footer">
        <span>AZ-305 · Microsoft Azure Solutions Architect Expert</span>
        <span>Practice makes architecture clearer.</span>
      </footer>
    </main>
  )
}

export default App
