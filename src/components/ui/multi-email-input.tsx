"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS = 10;

interface Props {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  id?: string;
}

export function MultiEmailInput({
  emails,
  onChange,
  placeholder = "manager@company.com",
  id,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addEmail(raw: string) {
    const email = raw.trim().toLowerCase();
    if (!email) return;

    if (!EMAIL_REGEX.test(email)) {
      setError("Invalid email address");
      return;
    }
    if (emails.includes(email)) {
      setError("Email already added");
      return;
    }
    if (emails.length >= MAX_EMAILS) {
      setError(`Maximum ${MAX_EMAILS} emails allowed`);
      return;
    }

    setError(null);
    onChange([...emails, email]);
    setInputValue("");
  }

  function removeEmail(email: string) {
    onChange(emails.filter((e) => e !== email));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && emails.length > 0) {
      removeEmail(emails[emails.length - 1]);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const parts = text.split(/[,;\s]+/).filter(Boolean);
    const newEmails = [...emails];

    for (const part of parts) {
      const email = part.trim().toLowerCase();
      if (
        EMAIL_REGEX.test(email) &&
        !newEmails.includes(email) &&
        newEmails.length < MAX_EMAILS
      ) {
        newEmails.push(email);
      }
    }

    onChange(newEmails);
    setInputValue("");
    setError(null);
  }

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background px-3 py-2 min-h-[38px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {emails.map((email) => (
          <Badge
            key={email}
            variant="secondary"
            className="gap-1 pr-1 text-xs"
          >
            {email}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(email);
              }}
              className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              aria-label={`Remove ${email}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (inputValue.trim()) addEmail(inputValue);
          }}
          placeholder={emails.length === 0 ? placeholder : "Add another..."}
          className="flex-1 min-w-[160px] border-0 p-0 h-auto shadow-none focus-visible:ring-0"
        />
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      {emails.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {emails.length}/{MAX_EMAILS} emails added. Press Enter or comma to add.
        </p>
      )}
    </div>
  );
}
