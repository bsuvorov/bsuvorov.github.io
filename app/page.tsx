"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Fact = { a: number; b: number; correct: boolean; heard: string };

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100,
};

function spokenNumber(text: string) {
  const direct = text.match(/\d+/)?.[0];
  if (direct) return Number(direct);
  const words = text.toLowerCase().replace(/-/g, " ").match(/[a-z]+/g) ?? [];
  let total = 0;
  for (const word of words) {
    const n = WORD_NUMBERS[word];
    if (n === undefined) continue;
    if (n === 100) total = Math.max(1, total) * 100;
    else total += n;
  }
  return total || null;
}

function say(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const voice = new SpeechSynthesisUtterance(text);
  voice.rate = 0.82;
  voice.pitch = 1.12;
  window.speechSynthesis.speak(voice);
}

export default function Home() {
  const [minutes, setMinutes] = useState(5);
  const [stage, setStage] = useState<"welcome" | "playing" | "result">("welcome");
  const [timeLeft, setTimeLeft] = useState(0);
  const [question, setQuestion] = useState({ a: 5, b: 7 });
  const [facts, setFacts] = useState<Fact[]>([]);
  const [message, setMessage] = useState("Pick a practice time, then press Start!");
  const [listening, setListening] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const questionRef = useRef(question);

  const nextQuestion = useCallback(() => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const next = { a, b };
    questionRef.current = next;
    setQuestion(next);
    setMessage("Your turn — say the answer!");
    window.setTimeout(() => say(`${a} multiplied by ${b}. What is the answer?`), 250);
  }, []);

  const finish = useCallback(() => {
    recognition.current?.stop();
    window.speechSynthesis?.cancel();
    setListening(false);
    setStage("result");
  }, []);

  useEffect(() => {
    if (stage !== "playing" || timeLeft <= 0) return;
    const clock = window.setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearInterval(clock);
  }, [stage, timeLeft]);

  useEffect(() => {
    if (stage === "playing" && timeLeft === 0) finish();
  }, [timeLeft, stage, finish]);

  const submitAnswer = useCallback((heard: string) => {
    const answer = spokenNumber(heard);
    const { a, b } = questionRef.current;
    const correct = answer === a * b;
    setFacts((old) => [...old, { a, b, correct, heard }]);
    setListening(false);
    if (correct) {
      setMessage("Amazing! You got it!");
      say("Amazing! You got it!");
    } else {
      setMessage(`Nice try! ${a} times ${b} is ${a * b}.`);
      say(`Nice try! ${a} times ${b} is ${a * b}.`);
    }
    window.setTimeout(nextQuestion, 1500);
  }, [nextQuestion]);

  const listen = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage("Voice listening is not available here. Try Chrome or Safari, then use the answer buttons below.");
      return;
    }
    recognition.current?.stop();
    const instance = new Recognition();
    recognition.current = instance;
    instance.continuous = false;
    instance.interimResults = false;
    instance.lang = "en-US";
    instance.onresult = (event) => submitAnswer(event.results[0][0].transcript);
    instance.onerror = () => { setListening(false); setMessage("I didn’t catch that. Tap the microphone and try again!"); };
    instance.onend = () => setListening(false);
    setListening(true);
    setMessage("I’m listening… say your answer!");
    instance.start();
  }, [submitAnswer]);

  function start() {
    setFacts([]);
    setTimeLeft(minutes * 60);
    setStage("playing");
    window.setTimeout(nextQuestion, 100);
  }

  const total = facts.length;
  const correct = facts.filter((fact) => fact.correct).length;
  const missed = facts.filter((fact) => !fact.correct);
  const needsPractice = [...new Set(missed.map((fact) => `${fact.a} × ${fact.b}`))].slice(0, 5);
  const seconds = String(timeLeft % 60).padStart(2, "0");

  return (
    <main>
      <section className="app-shell">
        <header><div className="brand"><span>✦</span> Times Table Trail</div><div className="badge">1–10 practice</div></header>
        {stage === "welcome" && <div className="welcome card">
          <div className="mascot" aria-hidden="true">🦊</div>
          <p className="eyebrow">VOICE PRACTICE ADVENTURE</p>
          <h1>Ready to become a multiplication wizard?</h1>
          <p className="lead">I’ll ask questions out loud. You say the answer, and I’ll help you learn what to practise next.</p>
          <div className="time-picker" aria-label="Choose practice time">
            {[5, 10].map((time) => <button key={time} className={minutes === time ? "selected" : ""} onClick={() => setMinutes(time)}>{time} minutes</button>)}
          </div>
          <button className="start" onClick={start}>Start my adventure <span>→</span></button>
          <p className="tiny">Best with your sound on. You can tap the microphone whenever you’re ready to answer.</p>
        </div>}
        {stage === "playing" && <div className="practice card">
          <div className="practice-top"><div><p className="eyebrow">QUESTION {total + 1}</p><p className="cheer">Keep going, star!</p></div><div className="timer">⏱ {Math.floor(timeLeft / 60)}:{seconds}</div></div>
          <div className="problem"><span>{question.a}</span><b>×</b><span>{question.b}</span><b>=</b><i>?</i></div>
          <p className="prompt">{message}</p>
          <button className={`mic ${listening ? "listening" : ""}`} onClick={listen} aria-label="Answer with your voice">{listening ? "◉" : "🎙"}</button>
          <button className="repeat" onClick={() => say(`${question.a} multiplied by ${question.b}. What is the answer?`)}>🔊 Hear it again</button>
          <button className="finish" onClick={finish}>Finish early</button>
        </div>}
        {stage === "result" && <div className="results card">
          <div className="mascot" aria-hidden="true">🏆</div><p className="eyebrow">ADVENTURE COMPLETE</p>
          <h1>Wonderful work!</h1><p className="lead">You answered {total} question{total === 1 ? "" : "s"} and got <strong>{correct}</strong> right.</p>
          <div className="score"><span>{total ? Math.round((correct / total) * 100) : 0}%</span><small>correct</small></div>
          {needsPractice.length ? <div className="study"><h2>Your next superpower</h2><p>Practise these facts a little more:</p><div>{needsPractice.map((fact) => <span key={fact}>{fact}</span>)}</div></div> : <div className="study all-good"><h2>You’re on a roll!</h2><p>Every answer was correct. Try a longer adventure next time!</p></div>}
          <button className="start" onClick={() => setStage("welcome")}>Play again <span>↻</span></button>
        </div>}
      </section>
    </main>
  );
}
