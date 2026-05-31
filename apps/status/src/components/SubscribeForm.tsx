import React, { useState, useCallback } from 'react';

export type SubscribeFrequency = 'all' | 'major';
export type SubscribeMethod = 'email' | 'webhook';

export interface SubscribeFormProps {
  onSubscribe: (data: SubscribeData) => void;
}

export interface SubscribeData {
  method: SubscribeMethod;
  email?: string;
  webhookUrl?: string;
  frequency: SubscribeFrequency;
}

export function SubscribeForm({ onSubscribe }: SubscribeFormProps): React.ReactElement {
  const [method, setMethod] = useState<SubscribeMethod>('email');
  const [email, setEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [frequency, setFrequency] = useState<SubscribeFrequency>('all');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const data: SubscribeData = {
        method,
        frequency,
        ...(method === 'email' ? { email } : { webhookUrl }),
      };
      onSubscribe(data);
      setSubmitted(true);
    },
    [method, email, webhookUrl, frequency, onSubscribe],
  );

  if (submitted) {
    return (
      <div className="subscribe-form subscribe-form--success">
        <div className="subscribe-form__success-icon" aria-hidden="true">
          {'\u2713'}
        </div>
        <h3>Subscribed successfully!</h3>
        <p>
          You will receive {frequency === 'all' ? 'all status updates' : 'major incident updates'}{' '}
          via {method === 'email' ? 'email' : 'webhook'}.
        </p>
        <button className="subscribe-form__reset" onClick={() => setSubmitted(false)}>
          Subscribe another endpoint
        </button>
      </div>
    );
  }

  return (
    <form className="subscribe-form" onSubmit={handleSubmit}>
      <h3 className="subscribe-form__title">Subscribe to Updates</h3>

      <div className="subscribe-form__method-toggle">
        <button
          type="button"
          className={`subscribe-form__method-btn ${method === 'email' ? 'subscribe-form__method-btn--active' : ''}`}
          onClick={() => setMethod('email')}
          aria-pressed={method === 'email'}
        >
          Email
        </button>
        <button
          type="button"
          className={`subscribe-form__method-btn ${method === 'webhook' ? 'subscribe-form__method-btn--active' : ''}`}
          onClick={() => setMethod('webhook')}
          aria-pressed={method === 'webhook'}
        >
          Webhook
        </button>
      </div>

      {method === 'email' ? (
        <div className="subscribe-form__field">
          <label htmlFor="subscribe-email" className="subscribe-form__label">
            Email Address
          </label>
          <input
            id="subscribe-email"
            type="email"
            className="subscribe-form__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>
      ) : (
        <div className="subscribe-form__field">
          <label htmlFor="subscribe-webhook" className="subscribe-form__label">
            Webhook URL
          </label>
          <input
            id="subscribe-webhook"
            type="url"
            className="subscribe-form__input"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            required
          />
        </div>
      )}

      <fieldset className="subscribe-form__frequency">
        <legend className="subscribe-form__label">Notification Frequency</legend>
        <label className="subscribe-form__radio">
          <input
            type="radio"
            name="frequency"
            value="all"
            checked={frequency === 'all'}
            onChange={() => setFrequency('all')}
          />
          <span>All updates</span>
        </label>
        <label className="subscribe-form__radio">
          <input
            type="radio"
            name="frequency"
            value="major"
            checked={frequency === 'major'}
            onChange={() => setFrequency('major')}
          />
          <span>Major incidents only</span>
        </label>
      </fieldset>

      <button type="submit" className="subscribe-form__submit">
        Subscribe
      </button>
    </form>
  );
}
