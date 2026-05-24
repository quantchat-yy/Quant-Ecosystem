// ============================================================================
// QuantMail - Compose Page (Full Rewrite)
// Rich text email composer with formatting, attachments, schedule send, undo
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface EmailAddress {
  name?: string;
  email: string;
}

interface Attachment {
  id: string;
  file: File | null;
  filename: string;
  size: number;
  mimeType: string;
  uploadProgress: number;
  isInline: boolean;
  previewUrl?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

interface AutocompleteContact {
  email: string;
  name: string;
  avatarUrl?: string;
  frequency: number;
}

type FormattingAction = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'insertLink' | 'insertOrderedList' | 'insertUnorderedList' | 'formatBlock';

interface ComposePageProps {
  replyTo?: { from: EmailAddress; subject: string; body: string; threadId?: string };
  forwardFrom?: { subject: string; body: string; attachments: Attachment[] };
  draftId?: string;
}

const UNDO_SEND_DURATION = 5000;

const defaultTemplates: EmailTemplate[] = [
  { id: 'meeting', name: 'Meeting Request', subject: 'Meeting Request: [Topic]', body: '<p>Hi,</p><p>I would like to schedule a meeting to discuss [topic]. Would any of the following times work for you?</p><p>- [Time 1]<br/>- [Time 2]<br/>- [Time 3]</p><p>Best regards</p>', category: 'Business' },
  { id: 'followup', name: 'Follow Up', subject: 'Following up on our conversation', body: '<p>Hi,</p><p>I wanted to follow up on our recent conversation about [topic]. Have you had a chance to review the materials I sent?</p><p>Please let me know if you need any additional information.</p><p>Thanks</p>', category: 'Business' },
  { id: 'introduction', name: 'Introduction', subject: 'Introduction: [Name] <> [Name]', body: '<p>Hi [Name],</p><p>I wanted to introduce you to [Name], who [brief description]. I think you two would benefit from connecting because [reason].</p><p>[Name], meet [Name] - [brief description].</p><p>I will let you two take it from here!</p>', category: 'Networking' },
  { id: 'thankyou', name: 'Thank You', subject: 'Thank you!', body: '<p>Hi,</p><p>Thank you so much for [reason]. I really appreciate [specific detail].</p><p>Best regards</p>', category: 'Personal' },
];

export const ComposePage: React.FC<ComposePageProps> = ({ replyTo, forwardFrom, draftId }) => {
  const [toRecipients, setToRecipients] = useState<string[]>(replyTo ? [replyTo.from.email] : []);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [bccRecipients, setBccRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>(replyTo ? `Re: ${replyTo.subject}` : forwardFrom ? `Fwd: ${forwardFrom.subject}` : '');
  const [body, setBody] = useState<string>(replyTo ? `<br/><br/><blockquote>${replyTo.body}</blockquote>` : forwardFrom ? `<br/><br/>---------- Forwarded message ----------<br/>${forwardFrom.body}` : '');
  const [attachments, setAttachments] = useState<Attachment[]>(forwardFrom?.attachments || []);
  const [showCcBcc, setShowCcBcc] = useState<boolean>(false);
  const [showSchedule, setShowSchedule] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [undoSendActive, setUndoSendActive] = useState<boolean>(false);
  const [undoCountdown, setUndoCountdown] = useState<number>(5);
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [showAIAssist, setShowAIAssist] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiTone, setAiTone] = useState<string>('professional');
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [toInput, setToInput] = useState<string>('');
  const [ccInput, setCcInput] = useState<string>('');
  const [bccInput, setBccInput] = useState<string>('');
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteContact[]>([]);
  const [activeAutocomplete, setActiveAutocomplete] = useState<'to' | 'cc' | 'bcc' | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [showLinkDialog, setShowLinkDialog] = useState<boolean>(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const draftTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    draftTimerRef.current = setInterval(() => {
      saveDraft();
    }, 30000);
    return () => {
      if (draftTimerRef.current) clearInterval(draftTimerRef.current);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (undoSendActive) {
      const interval = setInterval(() => {
        setUndoCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            executeSend();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [undoSendActive]);

  const searchContacts = useCallback(async (query: string) => {
    if (query.length < 2) { setAutocompleteResults([]); return; }
    try {
      const response = await fetch(`/api/contacts/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAutocompleteResults(data.contacts || []);
      }
    } catch (err) {
      console.error('Contact search failed:', err);
    }
  }, []);

  const handleToInputChange = useCallback((value: string) => {
    setToInput(value);
    setActiveAutocomplete('to');
    searchContacts(value);
  }, [searchContacts]);

  const handleCcInputChange = useCallback((value: string) => {
    setCcInput(value);
    setActiveAutocomplete('cc');
    searchContacts(value);
  }, [searchContacts]);

  const handleBccInputChange = useCallback((value: string) => {
    setBccInput(value);
    setActiveAutocomplete('bcc');
    searchContacts(value);
  }, [searchContacts]);

  const addRecipient = useCallback((field: 'to' | 'cc' | 'bcc', email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;
    switch (field) {
      case 'to': setToRecipients(prev => prev.includes(cleanEmail) ? prev : [...prev, cleanEmail]); setToInput(''); break;
      case 'cc': setCcRecipients(prev => prev.includes(cleanEmail) ? prev : [...prev, cleanEmail]); setCcInput(''); break;
      case 'bcc': setBccRecipients(prev => prev.includes(cleanEmail) ? prev : [...prev, cleanEmail]); setBccInput(''); break;
    }
    setAutocompleteResults([]);
    setActiveAutocomplete(null);
  }, []);

  const removeRecipient = useCallback((field: 'to' | 'cc' | 'bcc', email: string) => {
    switch (field) {
      case 'to': setToRecipients(prev => prev.filter(e => e !== email)); break;
      case 'cc': setCcRecipients(prev => prev.filter(e => e !== email)); break;
      case 'bcc': setBccRecipients(prev => prev.filter(e => e !== email)); break;
    }
  }, []);

  const applyFormatting = useCallback((action: FormattingAction, value?: string) => {
    document.execCommand(action, false, value);
    editorRef.current?.focus();
  }, []);

  const handleInsertLink = useCallback(() => {
    if (linkUrl) {
      applyFormatting('insertLink' as FormattingAction, linkUrl);
      setLinkUrl('');
      setShowLinkDialog(false);
    }
  }, [linkUrl, applyFormatting]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map((file, idx) => ({
      id: `att-${Date.now()}-${idx}`,
      file,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      uploadProgress: 0,
      isInline: false,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    simulateUpload(newAttachments);
  }, []);

  const simulateUpload = useCallback((newAttachments: Attachment[]) => {
    newAttachments.forEach(att => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, uploadProgress: Math.min(progress, 100) } : a));
      }, 200);
    });
  }, []);

  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); }, []);
  const handleDragDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const saveDraft = useCallback(async () => {
    setSavingDraft(true);
    try {
      const htmlBody = editorRef.current?.innerHTML || body;
      await fetch('/api/emails/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ to: toRecipients, cc: ccRecipients, bcc: bccRecipients, subject, body: htmlBody, draftId })
      });
      setLastSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to save draft:', err);
    } finally {
      setSavingDraft(false);
    }
  }, [toRecipients, ccRecipients, bccRecipients, subject, body, draftId]);

  const handleSend = useCallback(() => {
    if (toRecipients.length === 0) { setError('Please add at least one recipient'); return; }
    setError(null);
    setUndoSendActive(true);
    setUndoCountdown(5);
  }, [toRecipients]);

  const handleUndoSend = useCallback(() => {
    setUndoSendActive(false);
    setUndoCountdown(5);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, []);

  const executeSend = useCallback(async () => {
    setUndoSendActive(false);
    setIsSending(true);
    try {
      const htmlBody = editorRef.current?.innerHTML || body;
      const payload: Record<string, unknown> = {
        to: toRecipients, cc: ccRecipients, bcc: bccRecipients, subject, body: htmlBody,
        attachmentIds: attachments.map(a => a.id),
        threadId: replyTo?.threadId
      };
      if (showSchedule && scheduledDate && scheduledTime) {
        payload.scheduledAt = `${scheduledDate}T${scheduledTime}`;
      }
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to send email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setIsSending(false);
    }
  }, [toRecipients, ccRecipients, bccRecipients, subject, body, attachments, replyTo, showSchedule, scheduledDate, scheduledTime]);

  const handleAIAssist = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const response = await fetch('/api/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ prompt: aiPrompt, tone: aiTone, context: { subject, recipients: toRecipients } })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.subject && !subject) setSubject(data.subject);
        if (data.body && editorRef.current) { editorRef.current.innerHTML = data.body; }
        setShowAIAssist(false);
        setAiPrompt('');
      }
    } catch (err) {
      console.error('AI assist failed:', err);
    } finally {
      setAiGenerating(false);
    }
  }, [aiPrompt, aiTone, subject, toRecipients]);

  const applyTemplate = useCallback((template: EmailTemplate) => {
    setSubject(template.subject);
    if (editorRef.current) { editorRef.current.innerHTML = template.body; }
    setShowTemplates(false);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const totalAttachmentSize = useMemo(() => attachments.reduce((sum, a) => sum + a.size, 0), [attachments]);

  return (
    <div className="compose-page" onDragEnter={handleDragEnter} onDragOver={(e) => e.preventDefault()} onDragLeave={handleDragLeave} onDrop={handleDragDrop}>
      {undoSendActive && (
        <div className="undo-send-banner">
          <span>Sending in {undoCountdown}s...</span>
          <button onClick={handleUndoSend} className="undo-btn">Undo</button>
        </div>
      )}
      {error && <div className="compose-error">{error}<button onClick={() => setError(null)}>Dismiss</button></div>}

      <div className="compose-header">
        <h2>{replyTo ? 'Reply' : forwardFrom ? 'Forward' : 'New Message'}</h2>
        <div className="compose-actions-top">
          <button onClick={() => setShowTemplates(!showTemplates)} className="template-btn">Templates</button>
          <button onClick={() => setShowAIAssist(!showAIAssist)} className="ai-btn">AI Assist</button>
          {lastSavedAt && <span className="draft-saved">Saved {lastSavedAt}</span>}
        </div>
      </div>

      {showTemplates && (
        <div className="templates-dropdown">
          {defaultTemplates.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t)} className="template-item">
              <span className="template-name">{t.name}</span>
              <span className="template-category">{t.category}</span>
            </button>
          ))}
        </div>
      )}

      {showAIAssist && (
        <div className="ai-assist-panel">
          <textarea placeholder="Describe what you want to write..." value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3} />
          <div className="ai-options">
            <select value={aiTone} onChange={(e) => setAiTone(e.target.value)}>
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
              <option value="friendly">Friendly</option>
              <option value="persuasive">Persuasive</option>
            </select>
            <button onClick={handleAIAssist} disabled={aiGenerating}>{aiGenerating ? 'Generating...' : 'Generate'}</button>
          </div>
        </div>
      )}

      <div className="recipients-section">
        <div className="recipient-field">
          <label>To:</label>
          <div className="recipient-chips">
            {toRecipients.map(email => (
              <span key={email} className="recipient-chip">{email}<button onClick={() => removeRecipient('to', email)}>x</button></span>
            ))}
            <input type="text" value={toInput} onChange={(e) => handleToInputChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addRecipient('to', toInput); } }} placeholder={toRecipients.length === 0 ? 'Recipients' : ''} />
          </div>
          {!showCcBcc && <button onClick={() => setShowCcBcc(true)} className="cc-bcc-toggle">Cc/Bcc</button>}
        </div>
        {activeAutocomplete === 'to' && autocompleteResults.length > 0 && (
          <div className="autocomplete-dropdown">
            {autocompleteResults.map(c => (
              <button key={c.email} onClick={() => addRecipient('to', c.email)} className="autocomplete-item">
                <span className="contact-name">{c.name}</span>
                <span className="contact-email">{c.email}</span>
              </button>
            ))}
          </div>
        )}
        {showCcBcc && (
          <>
            <div className="recipient-field">
              <label>Cc:</label>
              <div className="recipient-chips">
                {ccRecipients.map(email => (<span key={email} className="recipient-chip">{email}<button onClick={() => removeRecipient('cc', email)}>x</button></span>))}
                <input type="text" value={ccInput} onChange={(e) => handleCcInputChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addRecipient('cc', ccInput); } }} />
              </div>
            </div>
            <div className="recipient-field">
              <label>Bcc:</label>
              <div className="recipient-chips">
                {bccRecipients.map(email => (<span key={email} className="recipient-chip">{email}<button onClick={() => removeRecipient('bcc', email)}>x</button></span>))}
                <input type="text" value={bccInput} onChange={(e) => handleBccInputChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addRecipient('bcc', bccInput); } }} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="subject-field">
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="subject-input" />
      </div>

      <div className="formatting-toolbar">
        <button onClick={() => applyFormatting('bold')} title="Bold"><strong>B</strong></button>
        <button onClick={() => applyFormatting('italic')} title="Italic"><em>I</em></button>
        <button onClick={() => applyFormatting('underline')} title="Underline"><u>U</u></button>
        <button onClick={() => applyFormatting('strikethrough')} title="Strikethrough"><s>S</s></button>
        <span className="toolbar-divider">|</span>
        <button onClick={() => applyFormatting('insertOrderedList')} title="Numbered List">1.</button>
        <button onClick={() => applyFormatting('insertUnorderedList')} title="Bullet List">&#8226;</button>
        <span className="toolbar-divider">|</span>
        <button onClick={() => setShowLinkDialog(true)} title="Insert Link">&#128279;</button>
        <button onClick={() => fileInputRef.current?.click()} title="Attach File">&#128206;</button>
        <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { const url = URL.createObjectURL(f); document.execCommand('insertImage', false, url); } }; input.click(); }} title="Inline Image">&#128247;</button>
      </div>

      {showLinkDialog && (
        <div className="link-dialog">
          <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
          <button onClick={handleInsertLink}>Insert</button>
          <button onClick={() => setShowLinkDialog(false)}>Cancel</button>
        </div>
      )}

      <div ref={editorRef} className="editor-area" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: body }} onInput={() => { /* auto-save triggers via interval */ }} />

      {isDragOver && (
        <div className="drop-overlay">
          <div className="drop-zone-content">
            <span className="drop-icon">&#128206;</span>
            <p>Drop files to attach</p>
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="attachments-section">
          <div className="attachments-header">
            <span>{attachments.length} attachment(s) ({formatFileSize(totalAttachmentSize)})</span>
          </div>
          <div className="attachment-list">
            {attachments.map(att => (
              <div key={att.id} className="attachment-item">
                {att.previewUrl && <img src={att.previewUrl} alt={att.filename} className="attachment-preview" />}
                <div className="attachment-info">
                  <span className="attachment-name">{att.filename}</span>
                  <span className="attachment-size">{formatFileSize(att.size)}</span>
                </div>
                {att.uploadProgress < 100 && (
                  <div className="upload-progress"><div className="progress-bar" style={{ width: `${att.uploadProgress}%` }}></div></div>
                )}
                <button onClick={() => removeAttachment(att.id)} className="remove-attachment">x</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => handleFileSelect(e.target.files)} />

      <div className="compose-footer">
        <div className="send-actions">
          <button onClick={handleSend} disabled={isSending || undoSendActive} className="send-btn">
            {isSending ? 'Sending...' : 'Send'}
          </button>
          <button onClick={() => setShowSchedule(!showSchedule)} className="schedule-toggle">&#128339;</button>
        </div>
        {showSchedule && (
          <div className="schedule-picker">
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            <button onClick={() => { handleSend(); }} disabled={!scheduledDate || !scheduledTime}>Schedule Send</button>
          </div>
        )}
        <div className="footer-right">
          <button onClick={saveDraft} disabled={savingDraft}>{savingDraft ? 'Saving...' : 'Save Draft'}</button>
          <button onClick={() => { setToRecipients([]); setSubject(''); if (editorRef.current) editorRef.current.innerHTML = ''; setAttachments([]); }} className="discard-btn">Discard</button>
        </div>
      </div>
    </div>
  );
};

export default ComposePage;
