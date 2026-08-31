'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ExplainResult } from '@/lib/ai';
import Paywall from '@/components/Paywall';

const MAX_FILE_MB = 10;

export default function ExplainApp({
  email,
  plan,
  initialAtLimit,
}: {
  email: string;
  plan: string;
  initialAtLimit: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [error, setError] = useState('');
  const [atLimit, setAtLimit] = useState(initialAtLimit);
  const [currentPlan, setCurrentPlan] = useState(plan);
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Voice input (record a voice note in the browser)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micSupported, setMicSupported] = useState(true);

  // Voice output (listen to the explanation)
  const [speaking, setSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(true);

  useEffect(() => {
    setMicSupported(
      typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
    );
    setTtsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  // Handle return from PayPal's hosted checkout: verify the subscription
  // server-side before ever treating the user as Pro. PayPal appends
  // ?subscription_id=... to the return_url once the user approves.
  useEffect(() => {
    const status = searchParams.get('paypal');
    const subscriptionId = searchParams.get('subscription_id');

    if (status === 'success' && subscriptionId) {
      (async () => {
        setPayLoading(true);
        try {
          const res = await fetch('/api/paypal/confirm-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionId }),
          });
          const data = await res.json();
          if (res.ok) {
            setCurrentPlan('pro');
            setAtLimit(false);
          } else {
            setError(data.error || 'We couldn\u2019t verify your payment. Please try again.');
          }
        } catch {
          setError('We couldn\u2019t verify your payment. Please try again.');
        } finally {
          setPayLoading(false);
          router.replace('/app');
        }
      })();
    } else if (status === 'cancelled') {
      router.replace('/app');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop any recording/speech in progress if the component unmounts.
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function acceptFile(f: File): boolean {
    const isPdf = f.type === 'application/pdf';
    const isImage = f.type.startsWith('image/');
    const isAudio = f.type.startsWith('audio/');
    if (!isPdf && !isImage && !isAudio) {
      setError('Upload a PDF, image, or audio file.');
      return false;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is too large (max ${MAX_FILE_MB}MB).`);
      return false;
    }
    setError('');
    setFile(f);
    setInput('');
    return true;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    acceptFile(f);
  }

  async function startRecording() {
    setError('');
    if (!micSupported) {
      setError('Voice recording isn\u2019t supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const ext = (recorder.mimeType || 'audio/webm').includes('mp4') ? 'm4a' : 'webm';
        const voiceFile = new File([blob], `voice-note-${Date.now()}.${ext}`, {
          type: recorder.mimeType || 'audio/webm',
        });
        acceptFile(voiceFile);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      setError('Couldn\u2019t access your microphone. Check your browser permissions and try again.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function formatSeconds(total: number) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function speakResult() {
    if (!result || !ttsSupported) return;
    window.speechSynthesis.cancel();
    const toSay = [result.bottom_line, result.simple_explanation, result.what_to_know].filter(Boolean).join('. ');
    const utterance = new SpeechSynthesisUtterance(toSay);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }

  async function handleExplain() {
    setError('');
    setResult(null);
    stopSpeaking();

    if (!input.trim() && !file) {
      setError('Paste a link or some text, upload a file, or record your voice first.');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      if (file) {
        form.append('file', file);
      } else {
        const looksLikeUrl = /^https?:\/\/\S+$/i.test(input.trim());
        form.append(looksLikeUrl ? 'url' : 'text', input.trim());
      }

      const res = await fetch('/api/explain', { method: 'POST', body: form });
      const data = await res.json();

      if (res.status === 402) {
        setAtLimit(true);
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setResult(data.result);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleExplainAnother() {
    stopSpeaking();
    setInput('');
    setFile(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => textareaRef.current?.focus(), 300);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const isVoiceFile = !!file && file.type.startsWith('audio/');

  return (
    <main className="min-h-screen px-6 py-10 flex flex-col items-center">
      <div ref={topRef} className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-8">
          <span className="flex items-center gap-2 font-medium text-zinc-900">
            <img src="/logo-mark.svg" alt="" width={22} height={22} className="rounded-md" />
            VoiceDNA
          </span>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            {currentPlan === 'pro' && (
              <span className="rounded-full bg-zinc-900 text-white px-2.5 py-0.5 text-xs">Pro</span>
            )}
            <button onClick={handleSignOut} className="hover:text-zinc-900 underline">
              Sign out
            </button>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-zinc-900 mb-4">What do you want to understand?</h1>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (e.target.value) setFile(null);
          }}
          placeholder="Paste a link or text here..."
          rows={6}
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
        />

        {file && (
          <div className="mt-2 flex items-center justify-between text-sm text-zinc-600 bg-zinc-100 rounded-lg px-3 py-2">
            <span className="truncate flex items-center gap-1.5">
              {isVoiceFile && <span aria-hidden>{'\u{1F3A4}'}</span>}
              {file.name}
            </span>
            <button onClick={() => setFile(null)} className="text-zinc-500 hover:text-zinc-900 ml-2">
              Remove
            </button>
          </div>
        )}

        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*,audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 rounded-lg border border-zinc-300 py-2.5 font-medium hover:bg-zinc-50 transition"
          >
            Upload PDF / Image / Audio
          </button>

          {micSupported && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex-1 rounded-lg border py-2.5 font-medium transition ${
                isRecording
                  ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              {isRecording ? `\u23F9 Stop recording \u00b7 ${formatSeconds(recordingSeconds)}` : '\u{1F3A4} Record voice'}
            </button>
          )}

          <button
            onClick={handleExplain}
            disabled={loading || isRecording}
            className="flex-1 rounded-lg bg-zinc-900 text-white py-2.5 font-medium hover:bg-zinc-800 transition disabled:opacity-50"
          >
            {loading ? 'Explaining...' : 'Explain'}
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {atLimit && (
          <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-center">
            <p className="text-zinc-800 mb-3">You&apos;ve used your free explanations for today.</p>
            <p className="text-zinc-600 text-sm mb-4">Unlock more explanations.</p>
            <button
              onClick={() => setPaywallOpen(true)}
              disabled={payLoading}
              className="rounded-lg bg-zinc-900 text-white px-5 py-2.5 font-medium hover:bg-zinc-800 transition disabled:opacity-50"
            >
              {payLoading ? 'Please wait...' : 'Upgrade to Pro'}
            </button>
          </div>
        )}

        <Paywall
          open={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          onError={(message) => {
            setError(message);
            setPaywallOpen(false);
          }}
        />

        {result && (
          <div className="mt-8 space-y-6">
            <div className="rounded-lg bg-zinc-900 text-white px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">Bottom line</p>
              <p className="font-medium leading-relaxed">{result.bottom_line}</p>
            </div>

            <div className="flex items-center justify-between">
              {result.high_stakes ? (
                <p className="text-xs text-zinc-500 border border-zinc-200 rounded-lg px-3 py-2">
                  This explanation is for general understanding only, not professional advice.
                </p>
              ) : (
                <span />
              )}
              {ttsSupported && (
                <button
                  onClick={speaking ? stopSpeaking : speakResult}
                  className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                >
                  {speaking ? '\u23F8 Stop' : '\u{1F50A} Listen to this'}
                </button>
              )}
            </div>

            <Section title="What is this?" body={result.what_is_this} />
            <div>
              <h3 className="font-medium text-zinc-900 mb-2">What actually matters?</h3>
              <ul className="list-disc list-inside space-y-1 text-zinc-700">
                {result.what_matters.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
            <Section title="Explain it simply" body={result.simple_explanation} />
            <Section title="What should I know?" body={result.what_to_know} />

            <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-center">
              <p className="text-zinc-800 mb-3">Got something else confusing?</p>
              <p className="text-zinc-500 text-sm mb-4">
                Paste it, upload it, or record it \u2014 we&apos;ll explain that too.
              </p>
              <button
                onClick={handleExplainAnother}
                className="rounded-lg bg-zinc-900 text-white px-5 py-2.5 font-medium hover:bg-zinc-800 transition"
              >
                Explain something else \u2192
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-medium text-zinc-900 mb-2">{title}</h3>
      <p className="text-zinc-700 leading-relaxed">{body}</p>
    </div>
  );
}
