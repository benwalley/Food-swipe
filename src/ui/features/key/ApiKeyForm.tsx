import { ExternalLink } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';

const GET_KEY_URL = 'https://aistudio.google.com/apikey';

interface ApiKeyFormProps {
  onSave: (key: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

/** A paste field for a Gemini key, plus where to get one (spec ST-1). */
export function ApiKeyForm({ onSave, onCancel, autoFocus }: ApiKeyFormProps) {
  const [draft, setDraft] = useState('');
  const inputId = useId();
  const key = draft.trim();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (key) onSave(key);
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2.5">
      <label htmlFor={inputId} className="sr-only">
        Gemini API key
      </label>
      <input
        id={inputId}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Paste your Gemini API key"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        autoFocus={autoFocus}
        className="h-12 w-full rounded-full border border-line-strong bg-surface px-4 text-[15px] outline-none placeholder:text-ink-3 focus:border-accent"
      />
      <button
        type="submit"
        disabled={!key}
        className="h-12 rounded-full bg-ink text-[15px] font-semibold text-bg transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100"
      >
        Save key
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-full text-[14px] font-semibold text-ink-2 hover:bg-surface-2"
        >
          Cancel
        </button>
      )}
      <a
        href={GET_KEY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 py-1 text-[13px] font-semibold text-accent"
      >
        Get a free key from Google AI Studio
        <ExternalLink className="size-3.5" strokeWidth={2.25} />
      </a>
    </form>
  );
}
