'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COPIED_MS = 2000;

export type CopyClipboardWidthPreset = 'link' | 'compact' | 'none';

const WIDTH_BY_PRESET: Record<Exclude<CopyClipboardWidthPreset, 'none'>, string> = {
  link: 'min-w-[11.75rem] w-[11.75rem]',
  compact: 'min-w-[9.5rem] w-[9.5rem]',
};

interface CopyClipboardButtonProps extends Omit<ButtonProps, 'onClick' | 'children' | 'type'> {
  text: string | (() => string | Promise<string>);
  defaultLabel: string;
  copiedLabel?: string;
  widthPreset?: CopyClipboardWidthPreset;
}

export function CopyClipboardButton({
  text,
  defaultLabel,
  copiedLabel = 'Скопировано!',
  widthPreset = 'link',
  className,
  ...props
}: CopyClipboardButtonProps): ReactElement {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onClick = useCallback(async () => {
    const value = typeof text === 'function' ? await text() : text;
    try {
      await navigator.clipboard.writeText(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      setCopied(true);
      timerRef.current = setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, COPIED_MS);
    } catch {
      setCopied(false);
    }
  }, [text]);

  const widthClass = widthPreset === 'none' ? '' : WIDTH_BY_PRESET[widthPreset];

  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        widthClass,
        'justify-center whitespace-nowrap',
        widthPreset !== 'none' && 'shrink-0',
        className
      )}
      {...props}
    >
      {copied ? copiedLabel : defaultLabel}
    </Button>
  );
}
