import { useState, useCallback, useEffect } from 'react';

export function AnimatedText({
  text,
  typingUser,
  animate = true,
  onComplete,
}: {
  text: string;
  typingUser: string;
  animate?: boolean;
  onComplete?: () => void;
}) {
  const [currentText, setCurrentText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [showCaret, setShowCaret] = useState(true);

  const getDelay = useCallback(() => {
    return Math.random() * 50;
  }, []);

  useEffect(() => {
    if (!animate) {
      return;
    }

    let timeout: NodeJS.Timeout | null = null;
    const stillTyping = charIndex < text.length;
    if (stillTyping) {
      timeout = setTimeout(() => {
        setCurrentText((prevText) => prevText + text[charIndex]);
        setCharIndex((prevIndex) => prevIndex + 1);
      }, getDelay());
    } else {
      onComplete?.();
      timeout = setTimeout(() => {
        setShowCaret(false);
      }, 2000);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [animate, charIndex, getDelay, onComplete, text]);

  return (
    <>
      {currentText}
      {showCaret && (
        <span data-typing-user={typingUser} className="caret">
          |
        </span>
      )}
    </>
  );
}
