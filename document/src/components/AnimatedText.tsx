import { useState, useEffect } from 'react';

/**
 * Given a string, it will animate it like it's being typed on a GDoc.
 * It only animates it when the document is visible.
 */
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
      }, getTypingDelay());
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
  }, [animate, charIndex, onComplete, text]);

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

/** How fast/slow do we want the typing effect */
function getTypingDelay(delayMs = 50) {
  return Math.random() * delayMs;
}
