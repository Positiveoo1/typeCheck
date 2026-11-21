'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buildShareText, getShareCardModel, readThemeColors, renderShareCard } from '../../shareCard.js';

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not generate image.'))), 'image/png');
  });
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

function ShareResultButton({ result, playerName = '' }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { blob, url }
  const [status, setStatus] = useState('');
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);

  const text = buildShareText(result);
  const isOpen = Boolean(preview);

  const close = useCallback(() => {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    setStatus('');
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    dialogRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, close]);

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      const model = getShareCardModel(result, { themeColors: readThemeColors(), playerName });
      const canvas = document.createElement('canvas');
      renderShareCard(canvas, model);
      const blob = await canvasToBlob(canvas);
      const file = new File([blob], 'typecheck-result.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text, title: 'TypeCheck result' });
          return;
        } catch (error) {
          if (error?.name === 'AbortError') return;
          // otherwise fall through to the popover
        }
      }
      setPreview({ blob, url: URL.createObjectURL(blob) });
    } catch (error) {
      console.error('Failed to build share card:', error);
      try {
        await copyText(text);
        setStatus('Could not make the image. Result text copied instead.');
      } catch {
        setStatus('Could not make the image or copy text.');
      }
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const run = async (action, okMessage) => {
    try {
      await action();
      setStatus(okMessage);
    } catch (error) {
      console.error('Share action failed:', error);
      setStatus('That did not work here. Try "Copy text" instead.');
    }
  };

  const download = () => {
    const anchor = document.createElement('a');
    anchor.href = preview.url;
    anchor.download = 'typecheck-result.png';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  };

  const copyImage = async () => {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      throw new Error('Image clipboard unsupported');
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': preview.blob })]);
  };

  const postOnX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  if (result?.isInvalid) return null;

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="secondary-action"
        disabled={busy}
        onClick={handleShare}
        ref={triggerRef}
        type="button"
      >
        <span>{busy ? 'Preparing...' : 'Share'}</span>
      </button>
      {!isOpen && status && (
        <span className="share-status" role="status">
          {status}
        </span>
      )}
      {isOpen && (
        <div className="share-result-backdrop">
          <button aria-label="Close share dialog" className="share-result-dismiss" onClick={close} tabIndex={-1} type="button" />
          <div
            aria-label="Share your result"
            aria-modal="true"
            className="share-result-modal"
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <img alt="Preview of your result card" className="share-result-preview" src={preview.url} />
            <div className="share-result-buttons">
              <button className="secondary-action" onClick={() => run(download, 'Image downloaded.')} type="button">
                Download PNG
              </button>
              <button className="secondary-action" onClick={() => run(copyImage, 'Image copied.')} type="button">
                Copy image
              </button>
              <button className="secondary-action" onClick={() => run(() => copyText(text), 'Text copied.')} type="button">
                Copy text
              </button>
              <button className="secondary-action" onClick={postOnX} type="button">
                Post on X
              </button>
              <button className="primary-action" onClick={close} type="button">
                Close
              </button>
            </div>
            <p className="share-status" role="status">
              {status}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default ShareResultButton;
